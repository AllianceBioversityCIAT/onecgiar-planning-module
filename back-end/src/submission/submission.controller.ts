import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  getAll,
  getSaved,
  getTocData,
  getTocs,
  getWpBudgets,
  getbyid,
  saveReq,
  saveResponse,
  saveWpBudgetReq,
  save_result_values_req,
  updateCenterStatusReq,
  updateCenterStatusRes,
  updateLatestSubmitionStatus,
  updateStatus,
} from 'src/DTO/submission.dto';
import { InitiativesService } from 'src/initiatives/initiatives.service';
@UseGuards(JwtAuthGuard)
@ApiTags('submission')
@Controller('submission')
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly initService: InitiativesService,
    private readonly httpService: HttpService,
  ) {}

  @Patch('status/:id')
  @ApiBearerAuth()
  @ApiBody({ type: updateStatus })
  updateStatus(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.updateStatusBySubmittionID(id, data, req.user);
  }
  @Patch('center/status')
  @ApiBearerAuth()
  @ApiBody({ type: updateCenterStatusReq })
  @ApiCreatedResponse({
    description: '',
    type: updateCenterStatusRes,
  })
  @ApiBearerAuth()
  updateCenterStatus(@Body() data, @Request() req) {
    return this.submissionService.updateCenterStatus(data, req.user);
  }

  @Patch('cancellastsubmission/:id')
  @ApiBearerAuth()
  @ApiBody({ type: updateLatestSubmitionStatus })
  @ApiBearerAuth()
  updateLatestSubmitionStatus(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.updateLatestSubmitionStatus(id, data, req.user)
  }

  @Post('save/:id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: saveResponse,
  })
  @ApiBody({ type: saveReq })
  async save(
    @Param('id') id,
    @Request() req,
    @Body('phase_id') phase_id: number,
  ) {
    const init = await this.initService.findOne(id);
    const json = await this.getTocs(init.synchronized == true ? init.official_code : id);
    const tocSubmissionData = await this.submissionService.getTocSubmissionData(init.synchronized == true ? init.official_code : id);

    return this.submissionService.createNew(
      req.user.id,
      id,
      phase_id,
      JSON.stringify(json),
      tocSubmissionData
    );
  }

  @Get('toc_submission_data/:id')
  @ApiBearerAuth()
  async getTocSubmissionData(
    @Param('id') id,
  ) {
    return this.submissionService.getTocSubmissionData(id)
  }

  //to get version id for all submitted version
  @Get('get_data')
  @ApiBearerAuth()
  async getData() {
    return this.submissionService.getdata();
  }

  @Post('save_result_values/:id')
  @ApiBody({ type: save_result_values_req })
  @ApiBearerAuth()
  async save_result_values(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.saveResultData(id, data, req.user);
  }

  @Post('save_all_result_values/:id')
  @ApiBody({ type: save_result_values_req })
  @ApiBearerAuth()
  async save_all_result_values(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.saveAllResultData(id, data, req.user);
  }
  @Post('save_result_value/:id')
  @ApiBody({ type: save_result_values_req })
  @ApiBearerAuth()
  async save_result_value(@Param('id') id, @Body() data , @Request() req) {
    return this.submissionService.saveResultDataValue(id, data, req.user);
  }

  @Post('save_wp_budget/:id')
  @ApiBody({ type: saveWpBudgetReq })
  @ApiBearerAuth()
  async saveWpBudget(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.submissionService.saveWpBudget(+id, data, req.user);
  }

  @Get('wp_budgets/:id/phase/:phaseId')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getWpBudgets,
  })
  getWpBudgets(@Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.submissionService.getWpsBudgets(+id, +phaseId);
  }

  @Get('submission_budgets/:id/phase_id/:phase_id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getWpBudgets,
  })
  getSubmissionBudgets(
    @Param('id') id: string,
    @Param('phase_id') phase_id: string,
  ) {
    return this.submissionService.getSubmissionBudgets(+id, +phase_id);
  }

  @Get('save/:id/phaseId/:phaseId')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getSaved,
  })
  async getSaved(@Param('id') id, @Param('phaseId') phaseId) {
    return this.submissionService.getSaved(id, phaseId);
  }

  @Get('initiative_id/:initiative_id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getAll,
  })
  get(@Param('initiative_id') initiative_id, @Query() query) {
    return this.submissionService.findSubmissionsByInitiativeId(
      initiative_id,
      query,
    );
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getTocData,
  })
  @Get('toc/:id')
  async getTocs(@Param('id') id) {
    // return await firstValueFrom(
    //   this.httpService
    //     .get(process.env.TOC_API + '/toc/' + id)
    //     .pipe(
    //       map((dd: any) =>
    //       dd.data?.data?.filter(
    //           (d) =>
    //             ((d.category == 'WP' && !d.group) ||
    //               d.category == 'OUTPUT' ||
    //               d.category == 'EOI' ||
    //               d.category == 'OUTCOME') &&
    //               d?.flow_id == dd?.data?.version_id,
    //         )
    //         .map((items:any)=>{
    //           if(items?.related_node_id && items.category != 'WP')
    //           if(items?.id)
    //           items['id']=items?.related_node_id;
    //           if(items.melias.length)
    //             items.melias.map((melia: any) => {
    //               melia['id'] = melia.related_node_id
    //               melia['parent_id'] = items.group
    //             })

    //           if(items.category == 'OUTCOME' && !items.group)
    //             items['toc_outcome']= true;
    //         return items;
    //         }),
    //       ),
    //       catchError((error: AxiosError) => {
    //         console.error(error);
    //         throw new InternalServerErrorException();
    //       }),
    //     ),
    // );
    // return await firstValueFrom(
    //   this.httpService
    //     .get(process.env.TOC_API + '/toc/' + id)
    //     .pipe(
    //       map((dd: any) => {
    //         const result = [];
    //         const seenIds = new Set(); // To track unique IDs
    
    //         dd.data?.data?.forEach((item) => {
    //           const isValidCategory =
    //             (item.category === 'WP' && !item.group) ||
    //             item.category === 'OUTPUT' ||
    //             item.category === 'EOI' ||
    //             item.category === 'OUTCOME';
    
    //           if (isValidCategory && item?.flow_id === dd?.data?.version_id) {
    //             // Handle related_node_id for parent
    //             if (item?.related_node_id && item.category !== 'WP') {
    //               item.id = item.related_node_id;
    //             }
    
    //             if (item.category === 'OUTCOME' && !item.group) {
    //               item['toc_outcome'] = true;
    //             }
    
    //             // Push parent if not already included
    //             if (item?.id && !seenIds.has(item.id)) {
    //               result.push(item);
    //               seenIds.add(item.id);
    //             }
    
    //             // Handle melias
    //             if (Array.isArray(item.melias)) {
    //               item.melias.forEach((melia: any) => {
    //                 melia.id = melia.related_node_id;
    //                 melia.parent_id = item.group;
    
    //                 if (melia.id && !seenIds.has(melia.id)) {
    //                   result.push(melia);
    //                   seenIds.add(melia.id);
    //                 }
    //               });
    //             }
    //           }
    //         });
    
    //         return result;
    //       }),
    //       catchError((error: AxiosError) => {
    //         console.error(error);
    //         throw new InternalServerErrorException();
    //       }),
    //     )
    // );


    
    // return await firstValueFrom(
    //   this.httpService
    //     .get(process.env.TOC_API + '/toc/' + id)
    //     .pipe(
    //       map((dd: any) => {
    //         const result = [];
    //         const seenIds = new Set(); // To track unique items in result
    //         const meliaMap = new Map(); // Map of melia.id => melia object
    
    //         dd.data?.data?.forEach((item) => {
    //           const isValidCategory =
    //             (item.category === 'WP' && !item.group) ||
    //             item.category === 'OUTPUT' ||
    //             item.category === 'EOI' ||
    //             item.category === 'OUTCOME';
    
    //           if (isValidCategory && item?.flow_id === dd?.data?.version_id) {
    //             if (item?.related_node_id && item.category !== 'WP') {
    //               item.id = item.related_node_id;
    //             }
    
    //             if (item.category === 'OUTCOME' && !item.group) {
    //               item['toc_outcome'] = true;
    //             }
    
    //             if (item?.id && !seenIds.has(item.id)) {
    //               result.push(item);
    //               seenIds.add(item.id);
    //             }
    
    //             // Handle melias
    //             if (Array.isArray(item.melias)) {
    //               item.melias.forEach((melia: any) => {
    //                 melia.id = melia.related_node_id;
    //                 const parentGroup = item.group;
    //                 const parentTitle = item.title || null;

    
    //                 // If already exists, add the new group to its list
    //                 if (meliaMap.has(melia.id)) {
    //                   const existingMelia = meliaMap.get(melia.id);
    //                   if (parentGroup && !existingMelia.aows.includes(parentGroup)) {
    //                     existingMelia.aows.push(parentGroup);
    //                   }
    //                   if (parentTitle) {
    //                     if (!existingMelia.parent_titles) {
    //                       existingMelia.parent_titles = parentTitle;
    //                     } else if (!existingMelia.parent_titles.split(', ').includes(parentTitle)) {
    //                       existingMelia.parent_titles += ', ' + parentTitle;
    //                     }
    //                   }
    //                 } else {
    //                   // New melia — create and track
    //                   melia.aows = parentGroup ? [parentGroup] : [];
    //                   melia.parent_titles = parentTitle ?? '';
    //                   result.push(melia);
    //                   meliaMap.set(melia.id, melia);
    //                   seenIds.add(melia.id);
    //                 }
    //               });
    //             }
    //           }
    //         });
    
    //         return result;
    //       }),
    //       catchError((error: AxiosError) => {
    //         console.error(error);
    //         throw new InternalServerErrorException();
    //       }),
    //     )
    // );

    // return await firstValueFrom(
    //   this.httpService
    //     .get(process.env.TOC_API + '/toc/' + id)
    //     .pipe(
    //       map((dd: any) => {
    //         const result = [];
    //         const seenIds = new Set(); // To track unique items in result
    
    //         dd.data?.data?.forEach((item) => {
    //           const isValidCategory =
    //             (item.category === 'WP' && !item.group) ||
    //             item.category === 'OUTPUT' ||
    //             item.category === 'EOI' ||
    //             item.category === 'OUTCOME';
    
    //           if (isValidCategory && item?.flow_id === dd?.data?.version_id) {
    //             if (item?.related_node_id && item.category !== 'WP') {
    //               item.id = item.related_node_id;
    //             }
    
    //             if (item.category === 'OUTCOME' && !item.group) {
    //               item['toc_outcome'] = true;
    //             }
    
    //             if (item?.id && !seenIds.has(item.id)) {
    //               seenIds.add(item.id);
    
    //               // Handle melias inside the parent item
    //               if (Array.isArray(item.melias)) {
    //                 const parentGroup = item.group;
    //                 const parentTitle = item.title || null;
    
    //                 item.melias.forEach((melia: any) => {
    //                   melia.id = melia.related_node_id;
                      
    //                   // Add group (aows)
    //                   melia.aows = parentGroup ? [parentGroup] : [];
    
    //                   // Add parent title as string (group-concat-like)
    //                   melia.parent_titles = parentTitle ?? '';
    //                 });
    //               }
    
    //               result.push(item);
    //             }
    //           }
    //         });
    
    //         return result;
    //       }),
    //       catchError((error: AxiosError) => {
    //         console.error(error);
    //         throw new InternalServerErrorException();
    //       }),
    //     )
    // );
    
    return await firstValueFrom(
      this.httpService
        .get(process.env.TOC_API + '/toc/' + id)
        .pipe(
          map((dd: any) => {
            const melias = dd?.data?.melias ?? [];
    
            const filteredData = dd.data?.data?.filter(
              (d) =>
                ((d.category == 'WP' && !d.group) ||
                  d.category == 'OUTPUT' ||
                  d.category == 'EOI' ||
                  d.category == 'OUTCOME') &&
                d?.flow_id == dd?.data?.version_id,
            ).map((items: any) => {
              if (items?.related_node_id && items.category != 'WP') {
                if (items?.id) items['id'] = items.related_node_id;
              }
    
              if (items.melias?.length) {
                items.melias = items.melias.map((melia: any) => {
                  // melia['id'] = melia.related_node_id;
                  return melia.id;
                });
              }
    
              // if (items.category == 'OUTCOME' && !items.group) {
              //   items['toc_outcome'] = true;
              // }
    
              return items;
            });

      

            const meliaMap = new Map<string, any>();

            for (let data of filteredData) {
              for (let melia of melias) {
                const isLinked = data.melias?.some((m: any) =>
                  typeof m === 'object' ? m.id === melia.id : m === melia.id
                );

                if (isLinked) {
                  const key = `${melia.related_node_id}_${data.group}`;
                  if (meliaMap.has(key)) {
                    const existing = meliaMap.get(key);
                    if (!existing.results.includes(data.title)) {
                      existing.results += ', ' + data.title;
                    }
                  } else {
                    meliaMap.set(key, {
                      id: melia.related_node_id,
                      parent_id: data.group,
                      results: data.title,
                      category: 'Melia',
                      ...melia,
                    });
                  }
                }
              }
            }

            const newMelias = Array.from(meliaMap.values());
    
            return [...newMelias, ...filteredData ]; 
          }),
          catchError((error: AxiosError) => {
            console.error(error);
            throw new InternalServerErrorException();
          }),
        ),
    );
    
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getbyid,
  })
  getbyid(@Param('id') id) {
    return this.submissionService.findSubmissionsById(id);
  }

  @Get('excel/:id')
  @ApiBearerAuth()
  async excel(@Param('id') id) {
    return await this.submissionService.generateExcel(id, null, null, null);
  }
  @Get('excelCurrent/:id')
  @ApiBearerAuth()
  async excelCurrent(@Param('id') initId) {
    const init = await this.initService.findOne(initId);
    const toc_data = this.getTocs(init.synchronized == true ? init.official_code : initId);
    return await this.submissionService.generateExcel(
      null,
      initId,
      toc_data,
      null,
    );
  }
  @Post('excelCurrentCenter')
  @ApiBearerAuth()
  async excelCurrentCenter(@Body() data: any) {
    const init = await this.initService.findOne(data.initId);
    const toc_data = this.getTocs(init.synchronized == true ? init.official_code : data.initId);
    return await this.submissionService.generateExcel(
      null,
      data.initId,
      toc_data,
      data.organization,
    );
  }
}

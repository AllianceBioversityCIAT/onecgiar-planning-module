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
  markPORBAsValid,
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

  @Patch('center/validate')
  @ApiBearerAuth()
  @ApiBody({ type: updateCenterStatusReq })
  @ApiCreatedResponse({
    description: '',
    type: updateCenterStatusRes,
  })
  @ApiBearerAuth()
  updateCenterValidate(@Body() data, @Request() req) {
    return this.submissionService.updateCenterValidate(data, req.user);
  }

  @Patch('cancellastsubmission/:id')
  @ApiBearerAuth()
  @ApiBody({ type: updateLatestSubmitionStatus })
  @ApiBearerAuth()
  updateLatestSubmitionStatus(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.updateLatestSubmitionStatus(id, data, req.user)
  }

  @Patch('validatePORB/:id')
  @ApiBearerAuth()
  @ApiBody({ type: markPORBAsValid })
  @ApiBearerAuth()
  markPORBAsValid(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.markPORBAsValid(id, data, req.user)
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

  @Get('save-indicator/:id/phaseId/:phaseId')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getSaved,
  })
  async getSavedIndicator(@Param('id') id, @Param('phaseId') phaseId) {
    return this.submissionService.getSavedIndicator(id, phaseId);
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
    return await firstValueFrom(
      this.httpService
        .get(process.env.TOC_API + '/toc/' + id)
        .pipe(
          map((dd: any) => {
            const melias = dd?.data?.melias ?? [];
            const projects = dd?.data?.projects ?? [];
            let indicatorIds = [];
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
                  items.melias = items.melias.map((melia: any) => melia.id);
                }

                if (items.projects?.length) {
                  items.projects = items.projects.map((proj: any) => proj.id);
                }
                if (items.indicators?.length)  items.indicators  = items.indicators.map((i: any) => i);

                if (items.partners?.length)  items.partners  = items.partners.map((p: any) => p);

                
                if (items.indicators?.length && (items.category == 'OUTPUT' || items.category == 'OUTCOME')) {
                  const sumPooledFundedByType: Record<string, number> = {};
                  const sumProjectByType: Record<string, any> = {};

                  for (const indicator of items.indicators) {
                    // if (!indicator?.type?.toc_id || !indicator.target?.length) continue;
                    
                    let indicatorType = indicator?.type?.value;
    
                    if(indicator.related_node_id){
                      indicator.id = indicator.related_node_id
                    }
                    indicatorIds.push(indicator.id)
                    for (const target of indicator.targets) {
                      // if (!target?.date || !target?.value) continue;
                      // if (target?.project?.id == 'Pooled funded') {
                        // const date = new Date(target.date);
                        // if (date.getFullYear() === 2026) {
                          const value = parseFloat(target['2026']);
                          if (!isNaN(value)) {
                            if(indicatorType == 'custom')
                              indicatorType = indicatorType + '-' + items.category;
                            sumPooledFundedByType[indicatorType] = (sumPooledFundedByType[indicatorType] || 0) + value;
                          }
                        // }
                      // } else {
                        //for project 
                        // const date = new Date(target.date);
                        // if (date.getFullYear() === 2026) {
                        //   const value = parseFloat(target.value);
                        //   if (!isNaN(value)) {
                        //     if (!sumProjectByType[target.project.id]) {
                        //       sumProjectByType[target.project.id] = {};
                        //     }
                        //     if(indicatorType == 'custom')
                        //       indicatorType = indicatorType + '-' + items.category;
                        //     sumProjectByType[target.project.id][indicatorType] = (sumProjectByType[target.project.id][indicatorType] || 0) + value;
                        //   }
                        // }
                      // }
                    }
                  }
    
                  items.pooled_funded_indicator_values = sumPooledFundedByType;
                  items.projects_indicator_values = sumProjectByType;

                }

              

              return items;
            });

      

            const meliaMap = new Map<string, any>();

            for (let data of filteredData) {
              for (let melia of melias) {
                const isLinked = data.melias?.some((m: any) =>
                  typeof m === 'object' ? m.id === melia.id : m === melia.id
                );

                if (isLinked) {
                  const key = `${melia.id}_${data.group}`;
                  if (meliaMap.has(key)) {
                    const existing = meliaMap.get(key);
                    if (!existing.results.includes(data.title)) {
                      existing.results += ', ' + data.title;
                    }
                  } else {
                    meliaMap.set(key, {
                      id: melia.id,
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

            for (const melia of newMelias) {
              if (melia?.related_node_id) {
                melia.id = melia.related_node_id;
              } else {
                // console.warn(`Melia with missing related_node_id:`, melia);
              }
            }

            const projectMap = new Map<string, any>();

            for (let data of filteredData) {
              for (let project of projects) {
                const isLinked = data.projects?.includes(project.id);
    
                if (isLinked) {
                  const key = `${project.id}_${data.group}`;
                  if (projectMap.has(key)) {
                    const existing = projectMap.get(key);
                    if (!existing.results.includes(data.title)) {
                      existing.results += ', ' + data.title;
                    }
                  } else {
                    projectMap.set(key, {
                      id: project.id,
                      parent_id: data.group,
                      results: data.title,
                      category: 'Project',
                      projects_indicator_values: data.projects_indicator_values?.[project.id],
                      title: project.name,
                      ...project,
                    });
                  }
                }
              }
            }

            const newProjects = Array.from(projectMap.values());



            const indicatorMap = new Map<string, any>();
            const partnersMap = new Map<string, any>();
            
            
            for (const data of filteredData) {
              if (data.category === 'OUTPUT') {
                for (const indicator of data.indicators) {
                  let costumeId = indicator.id;
                  let location;
                  if (indicator.location === 'regional') {
                      const regionNames = [...(indicator.region ?? [])].map(r => r.name).sort();
                      location = `Region: ${regionNames.join(', ')}`;
                      costumeId = `R_${indicator.region.map((r: any) => r.um49Code).join('-')}`;
                  } else if (indicator.location === 'country') {
                      const countryNames = [...(indicator.country ?? [])].map(c => c.name).sort();
                      location = `Country: ${countryNames.join(', ')}`;
                      costumeId = `C_${indicator.country.map((r: any) => r.code).join('-')}`;
                  } else if(indicator.location === 'global') {
                      location = 'Global'
                  }
                  const key = `${location}_${data.group}`;
                  const title = data.title?.trim();
            
                  if (indicatorMap.has(key)) {
                    const existing = indicatorMap.get(key);
                    const titleSet = new Set(
                      existing.results.split(',').map(t => t.trim()).filter(Boolean)
                    );
                    titleSet.add(title);
                    existing.results = Array.from(titleSet).join(', ');
                  } else {
                    indicatorMap.set(key, {
                      ...indicator,
                      id: costumeId,
                      location: location,
                      parent_id: data.group,
                      results: title,
                      category: 'Geographic-Scope',
                    });
                  }
                }
            
                for (const partner of data.partners ?? []) {
                  const key = `${partner.code}_${data.group}`;
                  const title = data.title?.trim();
            
                  if (partnersMap.has(key)) {
                    const existing = partnersMap.get(key);
                    const titleSet = new Set(
                      existing.results.split(',').map(t => t.trim()).filter(Boolean)
                    );
                    titleSet.add(title);
                    existing.results = Array.from(titleSet).join(', ');
                  } else {
                    partnersMap.set(key, {
                      ...partner,
                      id: partner.code,
                      parent_id: data.group,
                      results: title,
                      category: 'partners',
                    });
                  }
                }
              }
            }
  
            const newIndicators = Array.from(indicatorMap.values());
            const newPartners = Array.from(partnersMap.values());

    
            return [
              ...newMelias,
              ...newProjects,
              ...filteredData,
              ...newIndicators,
              ...newPartners,
              { indicator_ids: { ...indicatorIds } }
            ];
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
    return await this.submissionService.generateExcel(id, null, null, null,true);
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
      true
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
      false
    );
  }
}

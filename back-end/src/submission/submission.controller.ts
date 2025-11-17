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
  Res,
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
import { Response } from 'express';
import * as stream from 'stream';
import * as archiver from 'archiver';
import { Readable } from 'stream';
import { PhasesService } from 'src/phases/phases.service';

@UseGuards(JwtAuthGuard)
@ApiTags('submission')
@Controller('submission')
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly initService: InitiativesService,
    private readonly phasesService: PhasesService,
    private readonly httpService: HttpService,
  ) {}

  @Patch('status/:id')
  @ApiBearerAuth()
  @ApiBody({ type: updateStatus })
  updateStatus(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.updateStatusBySubmittionID(
      id,
      data,
      req.user,
    );
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
    return this.submissionService.updateLatestSubmitionStatus(
      id,
      data,
      req.user,
    );
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
    const json = await this.getTocs(
      init.synchronized == true ? init.official_code : id,
    );
    const tocSubmissionData = await this.submissionService.getTocSubmissionData(
      init.synchronized == true ? init.official_code : id,
    );
    return this.submissionService.createNew(
      req.user.id,
      id,
      phase_id,
      JSON.stringify(json),
      tocSubmissionData,
    );
  }

  @Get('toc_submission_data/:id')
  @ApiBearerAuth()
  async getTocSubmissionData(@Param('id') id) {
    return this.submissionService.getTocSubmissionData(id);
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
  async save_result_value(@Param('id') id, @Body() data, @Request() req) {
    return this.submissionService.saveResultDataValue(id, data, req.user);
  }

  @Post('save_wp_budget/:id')
  @ApiBody({ type: saveWpBudgetReq })
  @ApiBearerAuth()
  async saveWpBudget(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req,
  ) {
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
  //for Submission
  async getSavedIndicator(@Param('id') id, @Param('phaseId') phaseId) {
    return this.submissionService.getSavedIndicator(id, phaseId);
  }

  @Get('save-indicator/:id/phaseId/:phaseId/version/:version_id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getSaved,
  })
  //for version
  async getSavedIndicatorVersion(
    @Param('id') id,
    @Param('phaseId') phaseId,
    @Param('version_id') version_id,
  ) {
    return this.submissionService.getSavedIndicatorForVersion(
      id,
      phaseId,
      version_id,
    );
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

  //   async getTocData(id: number) {
  //   return await firstValueFrom(
  //     this.httpService
  //       .get(process.env.TOC_API + '/toc/' + id)
  //       .pipe(
  //         map((d: any) => ({
  //           original_id: d.data.original_id,
  //           version_id: d.data.version_id,
  //           version: d.data.version,
  //           phase: d.data.phase,
  //           initiative_id: id
  //         })),
  //         catchError((error: AxiosError) => {
  //           throw new InternalServerErrorException();
  //         }),
  //       ),
  //   );
  // }

  async getExtraTOCData(response: any,code) {
    try {
      const { melias, projects } = response.data;

      const processItems = (items: any[]) => {
        return items.map((item) => {
          const groupedResults: Record<string, any> = {};
          if(item.related_node_id)
            item.id = item.related_node_id;
          item.results.forEach((result) => {
                       const related_node_id = result.group?.related_node_id || result.group?.id;

            if (!groupedResults[related_node_id]) {
              groupedResults[related_node_id] = {
                ...result,
                // if AOW  is (00)
                group: result.group ?? {
                  ost_wp: {
                    acronym: "AOW00",
                    wp_official_code: `CROSS`,
                    initiativeId: code
                  }
                },
                titles: [result.title],
              };
            } else {
              const exists = groupedResults[related_node_id].titles.some(
                (t) => t.id === result.title.id,
              );

              if (!exists) {
                groupedResults[related_node_id].titles.push(result.title);
              }
            }
          });

          return {
            ...item,
            results: Object.values(groupedResults).map((res) => {
              const { title, ...rest } = res;
              return rest;
            }),
          };
        });
      };

      const processedMelias = processItems(melias);
      const processedProjects = processItems(projects);

      return { melias: processedMelias, projects: processedProjects };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
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
    const activePhase =
      await this.submissionService.PhasesService.findActivePhase();
    const program = await   this.initService.initiativeRepository.findOne({where:{official_code:id}})
    return await firstValueFrom(
      this.httpService.get(process.env.TOC_API + `/toc/${program.action_area_id ? program.action_area_id : id}`).pipe(
        map(async (dd: any) => {
          const melias = dd?.data?.melias ?? [];
          const projects = dd?.data?.projects ?? [];
          let synergyPrograms: any[] = dd?.data?.synergy_programs ?? [];
          synergyPrograms
            .filter((s) => s.result.category == 'OUTPUT')
            .map((d) => (d['category'] = 'synergy-programs'));
          let indicatorIds = [];
          const filteredData = dd.data?.data
            ?.filter(
              (d) =>
                ((d.category == 'WP' && !d.group) ||
                  d.category == 'OUTPUT' ||
                  d.category == 'EOI' ||
                  d.category == 'OUTCOME') &&
                d?.flow_id == dd?.data?.version_id,
            )
            .map((items: any) => {
              if (items?.related_node_id && items.category != 'WP') {
                if (items?.id) items['id'] = items.related_node_id;
              }

              if (items.melias?.length) {
                items.melias = items.melias.map((melia: any) => melia.id);
              }

              if (items.projects?.length) {
                items.projects = items.projects.map((proj: any) => proj.id);
              }
              if (items.quantitative_indicators?.length)
                items.quantitative_indicators =
                  items.quantitative_indicators.map((i: any) => i);

              if (items.partners?.length)
                items.partners = items.partners.map((p: any) => {
                p['id']=p?.code ? p.code : p?.toc_id
              return p 
                });

              if (
                items.quantitative_indicators?.length &&
                (items.category == 'OUTPUT' || items.category == 'OUTCOME')
              ) {
                const sumPooledFundedByType: Record<string, number> = {};
                let pooledCenters = [];
                const sumProjectByType: Record<string, any> = {};

                for (const indicator of items.quantitative_indicators) {
                  let indicatorType = indicator?.type?.value;

                  if (indicator.related_node_id) {
                    indicator.id = indicator.related_node_id;
                  }
                  indicatorIds.push(indicator.id);

                  for (const target of indicator.targets) {
                    pooledCenters = [...pooledCenters, ...target.centers];
                    const value = parseFloat(target[activePhase.reportingYear]);
                    if (!isNaN(value)) {
                      if (indicatorType == 'custom')
                        indicatorType = indicatorType + '-' + items.category;
                      sumPooledFundedByType[indicatorType] =
                        (sumPooledFundedByType[indicatorType] || 0) + value;
                    }
                  }
                }

                items.pooled_funded_indicator_values = sumPooledFundedByType;
                items.pooled_centers = [...new Set(pooledCenters)];
                items.projects_indicator_values = sumProjectByType;
              }

              return items;
            });

          const meliaMap = new Map<string, any>();
          // helper: escape any HTML in titles (safe rendering)
          const escapeHtml = (s: string) =>
            s.replace(
              /[&<>"']/g,
              (c) =>
                ({
                  '&': '&amp;',
                  '<': '&lt;',
                  '>': '&gt;',
                  '"': '&quot;',
                  "'": '&#39;',
                }[c]!),
            );

          for (let data of filteredData) {
            for (let melia of melias) {
              const isLinked = data.melias?.some((m: any) =>
                typeof m === 'object' ? m.id === melia.id : m === melia.id,
              );
              if (!data.group) data.group = '';
              if (isLinked) {
                const key = `${melia.id}_${data.group}`;

                if (meliaMap.has(key)) {
                  const existing = meliaMap.get(key);

                  // ensure we have a Set to avoid duplicates
                  if (!(existing.supported_outcome instanceof Set)) {
                    const arr = String(existing.supported_outcome || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    existing.supported_outcome = new Set(arr);
                  }

                  (existing.supported_outcome as Set<string>).add(data.title);
                } else {
                  meliaMap.set(key, {
                    id: melia.id,
                    parent_id: data.group,
                    supported_outcome: new Set<string>([data.title]),
                    category: 'Melia',
                    ...melia,
                  });
                }
              }
            }
          }

          // When you need HTML for display:
          for (const [, entry] of meliaMap) {
            const items = [...(entry.supported_outcome as Set<string>)];
            entry.supported_outcome = `
                <ul class="tdul">
                  ${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
                </ul>
              `;
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
                    result: data.title,
                    category: 'Project',
                    projects_indicator_values:
                      data.projects_indicator_values?.[project.id],
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
              for (const indicator of data.quantitative_indicators) {
                let costumeId = indicator.id;
                let location;
                if (indicator.location === 'regional') {
                  const regionNames = [...(indicator.regions ?? [])]
                    .map((r) => r.name)
                    .sort();
                  location = `Region: ${regionNames.join(', ')}`;
                  costumeId = `R_${indicator.regions
                    .map((r: any) => r.um49Code)
                    .join('-')}`;
                } else if (indicator.location === 'country') {
                  const countryNames = [...(indicator.countries ?? [])]
                    .map((c) => c.name)
                    .sort();
                  location = `Country: ${countryNames.join(', ')}`;
                  costumeId = `C_${indicator.countries
                    .map((r: any) => r.code)
                    .join('-')}`;
                } else if (indicator.location === 'global') {
                  location = 'Global';
                }
                const key = `${location}_${data.group}`;
                const title = data.title?.trim();

                if (indicatorMap.has(key)) {
                  const existing = indicatorMap.get(key);
                  const titleSet = new Set(
                    existing.results
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
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
                const key = `${partner.id}_${data.group}`;
                const title = data.title?.trim();
                const selectedCountries =
                  await this.submissionService.getSelectedCountry(
                    partner.id,
                    id,
                    activePhase.id,
                  );
                if (partnersMap.has(key)) {
                  const existing = partnersMap.get(key);
                  const titleSet = new Set(
                    existing.results
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  );
                  titleSet.add(title);
                  existing.results = Array.from(titleSet).join(', ');
                } else {
                  partnersMap.set(key, {
                    ...partner,
                    id: partner.id,
                    parent_id: data.group,
                    results: title,
                    category: 'partners',
                    selectedCountries: selectedCountries,
                  });
                }
              }
            }
          }

          const newIndicators = Array.from(indicatorMap.values());
          const newPartners = Array.from(partnersMap.values());

          return {
            results: [
              ...synergyPrograms,
              ...newMelias,
              ...newProjects,
              ...filteredData,
              ...newIndicators,
              ...newPartners,
              { indicator_ids: { ...indicatorIds } },
            ],
            info: {
              original_id: dd.data.original_id,
              version_id: dd.data.version_id,
              version: dd.data.version,
              phase: dd.data.phase,
              initiative_id: id,
            },
            extra: await this.getExtraTOCData(dd,id)
          };
        }),
        catchError((error: AxiosError) => {
          console.error(error);
          throw new InternalServerErrorException();
        }),
      ),
    );
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getTocData,
  })
  @Get('actual-toc/:code')
  getActualTocs(@Param('code') code: string) {
    return this.submissionService.getActualTocs(code);
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
  async excel(@Param('id') id, @Res({ passthrough: true }) res: Response) {
    return await this.submissionService.generateExcel(
      id,
      null,
      null,
      null,
      true,
      res,
      false,
      false,
    );
  }
  @Get('excelCurrent/:id')
  @ApiBearerAuth()
  async excelCurrent(
    @Param('id') initId,
    @Res({ passthrough: true }) res: Response,
  ) {
    const init = await this.initService.findOne(initId);
    const toc_data = await this.getTocs(
      init.synchronized == true ? init.official_code : initId,
    );
    return await this.submissionService.generateExcel(
      null,
      initId,
      toc_data,
      null,
      true,
      res,
      false,
      false,
    );
  }

  @Post('export/:phase_id')
  @ApiBearerAuth()
  async export(
    @Body() data: any,
    @Res({ passthrough: true }) res: Response,
    @Param('phase_id') phase_id: number
  ) {
    const { phase, initiatives } = data;

    // console.log(initiatives)

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${phase.name}.zip`);


    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);


    for (const item of initiatives) {
      const file = await this.submissionService.generateExcel(
        item.latest_submission_id,
        null,
        null,
        null,
        true,
        res,
        false,
        true
      );
      const buffer = await this.streamToBuffer(file.getStream());

      const folderPath = `${item.official_code}/summary-${item.official_code}/`;

      archive.append(buffer, { name: `${folderPath}${item.official_code}.xlsx` });

      let partners = await this.phasesService.fetchAssignedOrganizations(phase_id, item.initiatives_id);
      console.log(partners)

      for(let partner of partners) {
        const file = await this.submissionService.generateExcel(
          item.latest_submission_id,
          null,
          null,
          partner,
          false,
          res,
          false,
          true
        );

        const buffer = await this.streamToBuffer(file.getStream());

        const folderPath = `${item.official_code}/${partner.acronym}/`;

        archive.append(buffer, { name: `${folderPath}${item.official_code}.xlsx` });
      }
    }
    await archive.finalize();
  }


  streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  @Post('excelAnaplan')
  @ApiBearerAuth()
  async excelAnaplan(
    @Body() data: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const init = await this.initService.findOne(data.initId);
    const toc_data = await this.getTocs(
      init.synchronized == true ? init.official_code : data.initId,
    );
    return await this.submissionService.generateExcel(
      null,
      data.initId,
      toc_data,
      data?.organization,
      true,
      res,
      true,
      false,
    );
  }
  @Post('excelCurrentCenter')
  @ApiBearerAuth()
  async excelCurrentCenter(
    @Body() data: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const init = await this.initService.findOne(data.initId);
    const toc_data = await this.getTocs(
      init.synchronized == true ? init.official_code : data.initId,
    );
    return await this.submissionService.generateExcel(
      null,
      data.initId,
      toc_data,
      data.organization,
      false,
      res,
      false,
      false,
    );
  }
}

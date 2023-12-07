import {
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultPeriodValues } from 'src/entities/resultPeriodValues.entity';
import { IsNull, Repository } from 'typeorm';
import { Result } from 'src/entities/result.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { Organization } from 'src/entities/organization.entity';
import { Period } from 'src/entities/period.entity';
import { Submission } from 'src/entities/submission.entity';
import { User } from 'src/entities/user.entity';
import { Phase } from 'src/entities/phase.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { CenterStatus } from 'src/entities/center-status.entity';
import { WpBudget } from 'src/entities/wp-budget.entity';
import { MeliaService } from 'src/melia/melia.service';
import { CrossCuttingService } from 'src/cross-cutting/cross-cutting.service';
import { IpsrValueService } from 'src/ipsr-value/ipsr-value.service';
import { PhasesService } from 'src/phases/phases.service';
import * as XLSX from 'xlsx-js-style';
import { join } from 'path';
import { createReadStream, unlink } from 'fs';
import { InitiativesService } from 'src/initiatives/initiatives.service';
import { PeriodsService } from 'src/periods/periods.service';
import { Melia } from 'src/entities/melia.entity';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
import { InitiativeMelia } from 'src/entities/initiative-melia.entity';
@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Phase) private phaseRepository: Repository<Phase>,
    @InjectRepository(Initiative)
    private initiativeRepository: Repository<Initiative>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(WorkPackage)
    private workPackageRepository: Repository<WorkPackage>,
    @InjectRepository(Result) private resultRepository: Repository<Result>,
    @InjectRepository(Period) private periodRepository: Repository<Period>,
    @InjectRepository(ResultPeriodValues)
    private resultValuesRepository: Repository<ResultPeriodValues>,
    @InjectRepository(CenterStatus)
    private centerStatusRepo: Repository<CenterStatus>,
    @InjectRepository(WpBudget)
    private wpBudgetRepository: Repository<WpBudget>,
    private meliaService: MeliaService,
    private CrossCuttingService: CrossCuttingService,
    private IpsrValueService: IpsrValueService,
    private PhasesService: PhasesService,
    private initService: InitiativesService,
    private periodService: PeriodsService,
    @InjectRepository(Melia)
    private meliaRepository: Repository<Melia>,
    @InjectRepository(CrossCutting)
    private CrossCuttingRepository: Repository<CrossCutting>,
    @InjectRepository(IpsrValue)
    private ipsrValueRepository: Repository<IpsrValue>,
    @InjectRepository(InitiativeMelia)
    private initiativeMeliaRepository: Repository<InitiativeMelia>,
  ) {}
  sort(query) {
    if (query?.sort) {
      let obj = {};
      const sorts = query.sort.split(',');
      obj[sorts[0]] = sorts[1];
      return obj;
    } else return { id: 'DESC' };
  }
  async updateCenterStatus(data) {
    const { initiative_id, organization_code, phase_id, status } = data;

    let center_status: CenterStatus;
    center_status = await this.centerStatusRepo.findOneBy({
      initiative_id,
      organization_code,
      phase_id,
    });
    if (!center_status) center_status = this.centerStatusRepo.create();
    center_status.initiative_id = initiative_id;
    center_status.organization_code = organization_code;
    center_status.phase_id = phase_id;
    center_status.status = status;
    await this.centerStatusRepo.save(center_status);

    return { message: 'Data Saved' };
  }
  async updateStatusBySubmittionID(id, data) {
    return this.submissionRepository.update(id, data);
  }
  async findSubmissionsByInitiativeId(id, query: any) {
    if (query.withFilters == 'false') {
      return this.submissionRepository.find({
        where: { initiative: { id } },
        relations: ['user', 'phase'],
        order: { id: 'DESC' },
      });
    } else {
      const take = query.limit || 10;
      const skip = (Number(query.page || 1) - 1) * take;
      const [result, total] = await this.submissionRepository.findAndCount({
        where: {
          initiative: { id },
          phase: {
            id: query?.phase,
            reportingYear: query?.reportingYear,
          },
          status: query?.status,
          user: {
            id: query?.createdBy,
          },
        },
        relations: ['user', 'phase'],
        take: take,
        skip: skip,
        order: { ...this.sort(query) },
      });
      return {
        result: result,
        count: total,
      };
    }
  }

  async findSubmissionsById(id) {
    const sub_data = await this.submissionRepository.findOne({
      where: { id },
      relations: [
        'user',
        'phase',
        'phase.periods',
        'initiative',
        'results',
        'results.values',
        'results.workPackage',
        'results.values.period',
      ],
    });
    return { ...sub_data, consolidated: this.dataToPers(sub_data.results) };
  }
  async createNew(user_id, initiative_id, phase_id, json) {
    const submissionData = {
      toc_data: json,
    };
    const userObject = await this.userRepository.findOneBy({ id: user_id });
    const phaseObject = await this.phaseRepository.findOneBy({ id: phase_id });
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiative_id,
    });
    const newSubmission = this.submissionRepository.create(submissionData);
    newSubmission.user = userObject;
    newSubmission.phase = phaseObject;
    newSubmission.initiative = initiativeObject;
    const submissionObject = await this.submissionRepository.save(
      newSubmission,
      { reload: true },
    );
    let oldResults = await this.resultRepository.find({
      where: {
        initiative_id: initiative_id,
        submission: IsNull(),
        phase_id: phase_id
      },
      relations: ['values', 'workPackage', 'values.period'],
    });
    oldResults;
    for (let result of oldResults) {
      delete result.id;
      result.submission = submissionObject;
      const values = result.values.map((d) => {
        delete d.id;
        return d;
      });
      const new_result = await this.resultRepository.save(result, {
        reload: true,
      });
      for (let value of values) {
        value.result = new_result;
        await this.resultValuesRepository.save(value);
      }
    }

    let oldWpBudgets = await this.wpBudgetRepository.find({
      where: {
        initiative_id: initiative_id,
        submission: IsNull(),
        phase_id: phase_id
      },
    });
    for (let wpBudget of oldWpBudgets) {
      delete wpBudget.id;
      wpBudget.submission_id = submissionObject.id;
      await this.wpBudgetRepository.save(wpBudget, {
        reload: true,
      });
    }

    let oldMelias = await this.meliaRepository.find({
      where: {
        initiative_id: initiative_id,
        submission: IsNull(),
      },
      relations: [
        'partners',
        'initiative_countries',
        'initiative_regions',
        'co_initiative_countries',
        'co_initiative_regions',
      ],
    });
    for (let melia of oldMelias) {
      let oldInitiativeMelia = await this.initiativeMeliaRepository.findOne({
        where: {
          id: melia.initiative_melia_id,
        },
        relations: ['other_initiatives'],
      });
      delete oldInitiativeMelia.id;
      oldInitiativeMelia.submission_id = submissionObject.id;
      let newInitiativeMelia = await this.initiativeMeliaRepository.save(
        oldInitiativeMelia,
        {
          reload: true,
        },
      );

      let oldMeliaId = melia.id;
      delete melia.id;
      melia.submission_id = submissionObject.id;
      melia.initiative_melia_id = newInitiativeMelia.id;
      let newMelia = await this.meliaRepository.save(melia, {
        reload: true,
      });

      await this.resultRepository.update(
        {
          result_uuid: oldMeliaId,
          submission_id: submissionObject.id,
        },
        {
          result_uuid: newMelia.id,
        },
      );
    }

    let oldCross = await this.CrossCuttingRepository.find({
      where: {
        initiative_id: initiative_id,
        submission: IsNull(),
      },
    });
    for (let cross of oldCross) {
      let oldCrossId = cross.id;
      delete cross.id;
      cross.submission_id = submissionObject.id;
      let newCross = await this.CrossCuttingRepository.save(cross, {
        reload: true,
      });
      await this.resultRepository.update(
        {
          result_uuid: oldCrossId,
          submission_id: submissionObject.id,
        },
        {
          result_uuid: newCross.id,
        },
      );
    }

    let oldIpsrValues = await this.ipsrValueRepository.find({
      where: {
        initiative_id: initiative_id,
        submission: IsNull(),
      },
      relations: ['ipsr']
    });
    for (let ipsrValue of oldIpsrValues) {
      let oldIpsrValueId = ipsrValue.id;
      delete ipsrValue.id;
      ipsrValue.submission_id = submissionObject.id;
      let newIpsrValue = await this.ipsrValueRepository.save(ipsrValue, {
        reload: true,
      });
      await this.resultRepository.update(
        {
          result_uuid: oldIpsrValueId,
          submission_id: submissionObject.id,
        },
        {
          result_uuid: newIpsrValue.id,
        },
      );
    }

    const date = new Date();
    await this.initiativeRepository.update(initiative_id, {
      last_update_at: date,
      last_submitted_at: date,
      latest_submission_id: submissionObject.id,
    });
    return this.submissionRepository.findOne({
      where: { id: submissionObject.id },
      relations: ['user', 'phase'],
    });
  }

  dataToPers(saved_data) {
    let data = { perValues: {}, values: {}, no_budget: {} };
    saved_data.forEach((result: Result) => {
      if (!data.perValues[result.organization_code])
        data.perValues[result.organization_code] = {};
      if (
        !data.perValues[result.organization_code][
          result.workPackage.wp_official_code
        ]
      )
        data.perValues[result.organization_code][
          result.workPackage.wp_official_code
        ] = {};

      if (
        !data.perValues[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid]
      )
        data.perValues[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid] = {};
      result.values.forEach((d) => {
        if (
          data.perValues[result.organization_code][
            result.workPackage.wp_official_code
          ][result.result_uuid][d.period.id]
        )
          data.perValues[result.organization_code][
            result.workPackage.wp_official_code
          ][result.result_uuid][d.period.id] = {};
        data.perValues[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid][d.period.id] = d.value;
      });

      if (!data.values[result.organization_code])
        data.values[result.organization_code] = {};
      if (
        !data.values[result.organization_code][
          result.workPackage.wp_official_code
        ]
      )
        data.values[result.organization_code][
          result.workPackage.wp_official_code
        ] = {};

      if (
        !data.values[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid]
      )
        data.values[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid] = result.value;

      if (!data.no_budget[result.organization_code])
        data.no_budget[result.organization_code] = {};
      if (
        !data.no_budget[result.organization_code][
          result.workPackage.wp_official_code
        ]
      )
        data.no_budget[result.organization_code][
          result.workPackage.wp_official_code
        ] = {};
      if (
        !data.no_budget[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid]
      )
        data.no_budget[result.organization_code][
          result.workPackage.wp_official_code
        ][result.result_uuid] = result.no_budget;
    });
    return data;
  }
  async getSaved(id, phaseId) {
    const saved_data = await this.resultRepository.find({
      where: { initiative_id: id, submission_id: IsNull() , phase_id: phaseId},
      relations: ['values', 'workPackage', 'values.period'],
    });
    return this.dataToPers(saved_data);
  }
  async saveResultData(id, data: any) {
    const initiativeId = id;
    const { partner_code, wp_id, item_id, per_id, value, phase_id } = data;

    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    let organizationObject = await this.organizationRepository.findOneBy({
      code: partner_code,
    });

    let oldResult = await this.resultRepository.findOneBy({
      initiative_id: id,
      result_uuid: item_id,
      organization: organizationObject,
      workPackage: workPackageObject,
      submission: IsNull(),
      phase_id: phase_id
    });

    let resultData = {
      result_uuid: item_id,
      phase_id: phase_id,
      value: 0,
    };

    if (organizationObject != null) {
      let resultObject;
      if (!oldResult) {
        let newResult = this.resultRepository.create(resultData);
        newResult.organization = organizationObject;
        newResult.workPackage = workPackageObject;
        newResult.initiative = initiativeObject;
        resultObject = await this.resultRepository.save(newResult);
      } else resultObject = oldResult;

      let periodObject = await this.periodRepository.findOneBy({
        id: +per_id,
      });

      let newResultPeriodValue: any;

      newResultPeriodValue = await this.resultValuesRepository.findOneBy({
        result: resultObject,
        period: periodObject,
      });
      if (!newResultPeriodValue)
        newResultPeriodValue = this.resultValuesRepository.create();

      newResultPeriodValue.value = value;
      newResultPeriodValue.period = periodObject;
      newResultPeriodValue.result = resultObject;
      await this.resultValuesRepository.save(newResultPeriodValue);
    }
    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }
  async saveResultDataValue(id, data: any) {
    const initiativeId = id;

    const {
      partner_code,
      wp_id,
      item_id,
      percent_value,
      budget_value,
      no_budget,
      phase_id
    } = data;

    let organizationObject = await this.organizationRepository.findOneBy({
      code: partner_code,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });

    let oldResult = await this.resultRepository.findOneBy({
      initiative_id: id,
      result_uuid: item_id,
      organization: organizationObject,
      workPackage: workPackageObject,
      submission: IsNull(),
      phase_id
    });

    if (oldResult) {
      oldResult.value = percent_value;
      oldResult.budget = budget_value;
      oldResult.no_budget = no_budget;
      oldResult.phase_id = phase_id
      await this.resultRepository.save(oldResult);
    } else throw new NotFoundException();

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }


  async saveWpBudget(initiativeId: number, data: any) {
    const { partner_code, wp_id, budget, phaseId } = data;
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });

    let oldWpBudget = await this.wpBudgetRepository.findOneBy({
      initiative_id: initiativeId,
      organization_code: partner_code,
      wp_id: workPackageObject.wp_id,
      submission_id: IsNull(),
      phase_id: phaseId
    });

    if (oldWpBudget) {
      oldWpBudget.budget = budget;
      await this.wpBudgetRepository.save(oldWpBudget);
    } else {
      const data: any = {
        initiative_id: initiativeId,
        organization_code: partner_code,
        wp_id: workPackageObject.wp_id,
        budget: budget,
        submission_id: null,
        phase_id: phaseId
      };

      const newWpBudget = this.wpBudgetRepository.create(data);
      this.wpBudgetRepository.save(newWpBudget);
    }

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }

  async getWpsBudgets(initiative_id: number, phaseId: any) {
    const wpBudgets = await this.wpBudgetRepository.find({
      where: { initiative_id, submission_id: IsNull(), phase: {id: phaseId} },
      relations: ['workPackage'],
    });

    let data = {};
    wpBudgets.forEach((element) => {
      if (!data[element.organization_code])
        data[element.organization_code] = {};

      data[element.organization_code][element.workPackage.wp_official_code] =
        element.budget;
    });

    return data;
  }

  async getSubmissionBudgets(submission_id: number, phaseId: any) {
    const wpBudgets = await this.wpBudgetRepository.find({
      where: { submission_id , phase_id: phaseId },
      relations: ['workPackage'],
    });

    let data = {};
    wpBudgets.forEach((element) => {
      if (!data[element.organization_code])
        data[element.organization_code] = {};

      data[element.organization_code][element.workPackage.wp_official_code] =
        element.budget;
    });

    return data;
  }

  getTemplateConsolidatedData() {
    return {
      Results: null,
      period: null,
      'Budget Percentage': null,
    };
  }

  mapTemplateConsolidatedData(template, element) {
    template.Results = element?.wp_title;
    template.period = element?.per;
    template['Budget Percentage'] = element?.total;
  }

  prepareAllDataExcelAdmin(wps) {
    let ConsolidatedData = [];
    let merges = [
      {
        s: { c: 1, r: 0 },
        e: { c: 1, r: 0 },
      },
    ];
    wps.forEach((element) => {
      const template = this.getTemplateConsolidatedData();

      this.mapTemplateConsolidatedData(template, element);

      ConsolidatedData.push(template);
    });

    return { ConsolidatedData, merges };
  }

  getConsolidatedData(wps: any[], period: any[]) {
    let ConsolidatedData = [];
    let lockupArray = [];
    wps.forEach((wp: any) => {
      let obj: any = {};
      obj['Results'] = wp.title;
      obj['Type'] = '';
      obj['wp_official_code'] = wp.ost_wp.wp_official_code;
      period.forEach((per: any) => {
        obj[per.year + '-' + per.quarter] =
          this.perValuesSammary[obj.wp_official_code][per.id] == true
            ? 'X'
            : '';
      });
      obj['Percentage'] = this.sammaryTotal[wp.ost_wp.wp_official_code] + '%';
      obj['Budgets'] = this.roundNumber(
        this.summaryBudgetsTotal[wp.ost_wp.wp_official_code],
      );
      ConsolidatedData.push(obj);
    });
    let obj: any = {};
    obj['Results'] = 'Total';
    obj['Type'] = '';

    period.forEach((per: any) => {
      obj[per.year + '-' + per.quarter] = this.finalPeriodVal(per.id)
        ? 'X'
        : '';
    });
    (obj['Percentage'] = this.roundNumber(this.wpsTotalSum) + '%'),
      (obj['Budgets'] = this.roundNumber(this.summaryBudgetsAllTotal)),
      ConsolidatedData.push(obj);

    lockupArray = ConsolidatedData.map((d: any) => {
      return d.Results;
    });

    return {
      ConsolidatedData: ConsolidatedData,
      lockupArray: lockupArray,
    };
  }

  getAllData(wps: any[], period: any[]) {
    let data;
    let newArray = [];

    wps.forEach((wp: any) => {
      data = this.allData[wp.ost_wp.wp_official_code].map((d: any) => {
        let obj: any = {};
        obj['id'] = d.id;
        obj['WP_Results'] = d.initiativeMelia?.meliaType?.name
          ? d.initiativeMelia?.meliaType?.name
          : d?.ipsr?.id
          ? d?.ipsr.title + ' (' + d.value + ')'
          : d.title;
        obj['Type'] = d.category;
        period.forEach((per: any) => {
          obj[per.year + '-' + per.quarter] =
            this.perAllValues[wp.ost_wp.wp_official_code][obj.id][per.id] ==
            true
              ? 'X'
              : '';
        });
        obj['BudgetPercentage'] = this.toggleSummaryValues[
          wp.ost_wp.wp_official_code
        ]
          ? this.sammary[wp.ost_wp.wp_official_code][d.id]
          : this.roundNumber(this.sammary[wp.ost_wp.wp_official_code][d.id]) +
            '%';
        obj['Budget_USD'] = this.toggleSummaryValues[wp.ost_wp.wp_official_code]
          ? this.summaryBudgets[wp.ost_wp.wp_official_code][d.id]
          : this.roundNumber(
              this.summaryBudgets[wp.ost_wp.wp_official_code][d.id],
            );
        return obj;
      });
      let obj: any = {};
      obj['WP_Results'] = 'Subtotal';
      obj['Type'] = '';
      period.forEach((per: any) => {
        obj[per.year + '-' + per.quarter] = this.finalItemPeriodVal(
          wp.ost_wp.wp_official_code,
          per.id,
        )
          ? 'X'
          : '';
      });
      obj['BudgetPercentage'] = this.toggleSummaryValues[
        wp.ost_wp.wp_official_code
      ]
        ? this.sammaryTotal[wp.ost_wp.wp_official_code]
        : this.roundNumber(this.sammaryTotal[wp.ost_wp.wp_official_code]) + '%';

      obj['Budget_USD'] = this.toggleSummaryValues[wp.ost_wp.wp_official_code]
        ? this.summaryBudgetsTotal[wp.ost_wp.wp_official_code]
        : this.roundNumber(
            this.summaryBudgetsTotal[wp.ost_wp.wp_official_code],
          );
      data.push(obj);

      newArray.push(data);
    });
    return newArray;
  }

  getPartnersData(wps: any[], period: any[], partners: any[], organization: any) {
    let data;
    let newArray = [];


    if(organization) 
      partners = partners.filter((d:any) => d.code == organization.code);
    partners.forEach((partner: any) => {
      const partnersWp = [];
      wps.forEach((wp: any) => {
        data = this.partnersData[partner.code][wp.ost_wp.wp_official_code].map(
          (d: any) => {
            let obj: any = {};
            obj['id'] = d.id;
            obj['WP_Results'] = d?.initiativeMelia?.meliaType?.name
              ? d?.initiativeMelia?.meliaType?.name
              : d?.ipsr?.id
              ? d?.ipsr.title + ' (' + d.value + ')'
              : d.title;
            obj['Type'] = d.category;
            period.forEach((per: any) => {
              obj[per?.year + '-' + per?.quarter] =
                this.perValues[partner?.code][wp?.ost_wp?.wp_official_code][
                  obj?.id
                ][per?.id] == true
                  ? 'X'
                  : '';
            });
            obj['Percentage'] = this.toggleValues[partner.code][
              wp.ost_wp.wp_official_code
            ]
              ? this.values[partner.code][wp.ost_wp.wp_official_code][d.id]
              : this.displayValues[partner.code][wp.ost_wp.wp_official_code][
                  d.id
                ] + '%';

            obj['Budget'] = this.toggleValues[partner.code][
              wp.ost_wp.wp_official_code
            ]
              ? this.budgetValues[partner.code][wp.ost_wp.wp_official_code][
                  d.id
                ]
              : this.displayBudgetValues[partner.code][
                  wp.ost_wp.wp_official_code
                ][d.id];

            return obj;
          },
        );

        let obj = {};

        obj['WP_Results'] = 'Subtotal';
        obj['Type'] = '';
        period.forEach((per: any) => {
          obj[per?.year + '-' + per?.quarter] = this.finalItemPeriodVal(
            wp?.ost_wp.wp_official_code,
            per?.id,
          )
            ? 'X'
            : '';
        });
        obj['Percentage'] = this.toggleValues[partner.code][
          wp.ost_wp.wp_official_code
        ]
          ? this.totals[partner.code][wp.ost_wp.wp_official_code]
          : this.roundNumber(
              this.totals[partner.code][wp.ost_wp.wp_official_code],
            ) + '%';

        obj['Budget'] =
          this.wp_budgets[partner.code][wp.ost_wp.wp_official_code];

        data.push(obj);
        partnersWp.push(data);
      });
      newArray.push(partnersWp);
    });
    return newArray;
  }

  user: any;
  data: any = [];
  wps: any = [];
  partners: any = [];
  result: any;
  partnersData: any = {};
  sammary: any = {};
  allData: any = {};
  values: any = {};
  totals: any = {};
  displayValues: any = {};
  summaryBudgets: any = {};
  summaryBudgetsTotal: any = {};
  summaryBudgetsAllTotal: any = 0;
  wp_budgets: any = {};
  budgetValues: any = {};
  displayBudgetValues: any = {};
  toggleValues: any = {};
  toggleSummaryValues: any = {};
  errors: any = {};
  period: Array<any> = [];

  perValues: any = {};
  perValuesSammary: any = {};
  perAllValues: any = {};
  sammaryTotal: any = {};
  results: any;
  loading = false;
  params: any;
  ipsr_value_data: any;

  getHeader(submission, title, initiative) {
    let period_ = [];
    this.period.forEach((period) => {
      period_.push({
        v: period.year + '-' + period.quarter,
        s: {
          fill: { fgColor: { rgb: '3d425e' } },
          font: { color: { rgb: 'ffffff' } },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
          },
        },
      });
    });

    return [
      [
        {
          v: submission != null ?
            submission?.initiative.official_code +
            ' - ' +
            submission?.initiative.name : 
            initiative?.official_code + ' - ' + initiative?.name
            ,
          s: {
            fill: { fgColor: { rgb: '04030f' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
      ],
      [
        {
          v: title,
          s: {
            fill: { fgColor: { rgb: '2a2e45' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
      ],
      [
        {
          v: 'Work Packages (WP)/Results',
          s: {
            fill: { fgColor: { rgb: '3d425e' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
        'Work Packages (WP)/Results',
        ...this.period.map((d, index) => {
          if (index == 0)
            return {
              v: this.period[0].year,
              s: {
                fill: { fgColor: { rgb: '3d425e' } },
                font: { color: { rgb: 'ffffff' } },
                alignment: {
                  horizontal: 'center',
                  vertical: 'center',
                  wrapText: true,
                },
              },
            };
          else return 'year';
        }),
      ],
      [
        'Work Packages (WP)/Results',
        'Work Packages (WP)/Results',
        {
          v: 'Type',
          s: {
            fill: { fgColor: { rgb: '3d425e' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
        ...this.period.map((d, index) => {
          return {
            v: 'Implementation Timeline',
            s: {
              fill: { fgColor: { rgb: '3d425e' } },
              font: { color: { rgb: 'ffffff' } },
              alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true,
              },
            },
          };
        }),
        {
          v: 'Budget',
          s: {
            fill: { fgColor: { rgb: '3d425e' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
        'Budget',
      ],
      [
        'Work Packages (WP)/Results',
        'Work Packages (WP)/Results',
        'Type',
        ...this.period.map((d, index) => {
          return 'Implementation Timeline';
        }),
        'Budget',
        'Budget',
      ],
      [
        'Work Packages (WP)/Results',
        'Work Packages (WP)/Results',
        'Type',
        ...period_,
        {
          v: '%',
          s: {
            fill: { fgColor: { rgb: '3d425e' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
        {
          v: '$',
          s: {
            fill: { fgColor: { rgb: '3d425e' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
      ],
    ];
  }
  savedValues: any = null;
  noValuesAssigned: any = {};
  submission_data:any;
  InitiativeId:any;
  async generateExcel(submissionId: any, initId:any, tocData: any, organization: any) {
    this.perValues = {};
    this.perValuesSammary = {};
    this.perAllValues = {};
    this.sammaryTotal = {};
    this.data = [];
    this.wps = [];
    this.wpsTotalSum = 0;
    this.partnersData = {};
    this.sammary = {};
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};
    this.wp_budgets = {};
    this.toggleValues = {};
    this.budgetValues = {};
    this.displayBudgetValues = {};
    this.allData = {};
    this.values = {};
    this.displayValues = {};
    this.totals = {};
    this.noValuesAssigned = {};

    let melia_data;
    let cross_data;

    let ipsr_value_data;
    let partners;

    this.InitiativeId = initId;
    let submission: any = null;
    if(submissionId != null){
      submission = await this.findSubmissionsById(submissionId);
      this.submission_data = submission;
      this.results = submission.toc_data;
      this.period = submission.phase.periods;
      this.wp_budgets = await this.getSubmissionBudgets(submissionId, submission.phase.id);
       melia_data = await this.meliaService.findBySubmissionId(
        submissionId
      );
       cross_data = await this.CrossCuttingService.findBySubmissionID(
        submissionId
      );
      ipsr_value_data = await this.IpsrValueService.findBySubmissionId(
        submissionId
      );
       partners = await this.PhasesService.fetchAssignedOrganizations(
        submission?.phase?.id,
        submission?.initiative?.id,
      );
    }
    else {
      
      this.phase = await this.PhasesService.findActivePhase();
      this.savedValues = await this.getSaved(initId, this.phase.id)
       partners = await this.PhasesService.fetchAssignedOrganizations(this.phase.id,initId);
      if (partners.length < 1) {
        partners = await this.organizationRepository.find();
      }

      this.initiative_data = await this.initService.findOne(initId);

      this.period = await this.periodService.findByPhaseId(this.phase.id);



      this.results = await tocData;

       melia_data = await this.meliaService.findByInitiativeID(
        initId
      );

       ipsr_value_data = await this.IpsrValueService.findByInitiativeID(initId);
  
       cross_data = await this.CrossCuttingService.findByInitiativeID(initId)

      this.wp_budgets = await this.getWpsBudgets(initId,this.phase.id);

    }

    cross_data.map((d: any) => {
      d['category'] = 'CROSS';
      d['wp_id'] = 'CROSS';
      return d;
    });

    melia_data.map((d: any) => {
      d['category'] = 'MELIA';
      return d;
    });

    ipsr_value_data.map((d: any) => {
      d['category'] = 'IPSR';
      d['wp_id'] = 'IPSR';
      return d;
    });

    this.results = [
      ...cross_data,
      ...melia_data,
      ...ipsr_value_data,
      ...this.results,
    ];

    this.wps = this.results
      .filter((d: any) => d.category == 'WP' && !d.group)
      .sort((a: any, b: any) => a.title.localeCompare(b.title));

    this.wps.unshift({
      id: 'CROSS',
      title: 'Cross Cutting',
      category: 'CROSS',
      ost_wp: { wp_official_code: 'CROSS' },
    });
    this.wps.push({
      id: 'IPSR',
      title: 'Innovation packages & Scalling Readiness',
      category: 'IPSR',
      ost_wp: { wp_official_code: 'IPSR' },
    });

    // let partners = await this.PhasesService.fetchAssignedOrganizations(
    //   submission?.phase?.id,
    //   submission?.initiative?.id,
    // );
    if (partners.length < 1)
      partners = await this.organizationRepository.find();

    for (let partner of partners) {
      if (!this.budgetValues[partner.code])
        this.budgetValues[partner.code] = {};

      if (!this.displayBudgetValues[partner.code])
        this.displayBudgetValues[partner.code] = {};
        if (!this.noValuesAssigned[partner.code])
        this.noValuesAssigned[partner.code] = {};
      for (let wp of this.wps) {
        if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
        if (!this.wp_budgets[partner.code][wp.ost_wp.wp_official_code])
          this.wp_budgets[partner.code][wp.ost_wp.wp_official_code] = null;

        if (!this.toggleValues[partner.code])
          this.toggleValues[partner.code] = {};

          if (!this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code])
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code] = {};

        if (!this.toggleValues[partner.code][wp.ost_wp.wp_official_code])
          this.toggleValues[partner.code][wp.ost_wp.wp_official_code] = false;

        if (!this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code] = {};

        if (!this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code] =
            {};

        if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
          this.summaryBudgets[wp.ost_wp.wp_official_code] = {};

        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;

        const result = await this.getDataForWp(
          wp.id,
          partner.code,
          wp.ost_wp.wp_official_code,
        );

        if (result.length) {
          if (!this.partnersData[partner.code])
            this.partnersData[partner.code] = {};
          this.partnersData[partner.code][wp.ost_wp.wp_official_code] = result;
        }

        if (!this.perValuesSammary[wp.ost_wp.wp_official_code])
          this.perValuesSammary[wp.ost_wp.wp_official_code] = {};

        this.period.forEach((element) => {
          if (!this.perValuesSammary[wp.ost_wp.wp_official_code][element.id])
            this.perValuesSammary[wp.ost_wp.wp_official_code][element.id] =
              false;
        });

        result.forEach((item: any) => {
          this.check(
            this.values,
            partner.code,
            wp.ost_wp.wp_official_code,
            item.id,
          );
          this.check(
            this.displayValues,
            partner.code,
            wp.ost_wp.wp_official_code,
            item.id,
          );

          this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
            null;

          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = false;

          if (!this.summaryBudgets[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgets[wp.ost_wp.wp_official_code][item.id] = 0;

          if (!this.perValues[partner.code]) this.perValues[partner.code] = {};
          if (!this.perValues[partner.code][wp.ost_wp.wp_official_code])
            this.perValues[partner.code][wp.ost_wp.wp_official_code] = {};

          if (
            !this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id]
          )
            this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
              {};

          this.period.forEach((element) => {
            this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id][
              element.id
            ] = false;
          });

          this.period.forEach((element) => {
            if (!this.perAllValues[wp.ost_wp.wp_official_code])
              this.perAllValues[wp.ost_wp.wp_official_code] = {};
            if (!this.perAllValues[wp.ost_wp.wp_official_code][item.id])
              this.perAllValues[wp.ost_wp.wp_official_code][item.id] = {};

            this.perAllValues[wp.ost_wp.wp_official_code][item.id][element.id] =
              false;

            if (!this.sammary[wp.ost_wp.wp_official_code])
              this.sammary[wp.ost_wp.wp_official_code] = {};
            if (!this.sammary[wp.ost_wp.wp_official_code][item.id])
              this.sammary[wp.ost_wp.wp_official_code][item.id] = 0;

            if (!this.sammaryTotal[wp.ost_wp.wp_official_code])
              this.sammaryTotal[wp.ost_wp.wp_official_code] = 0;
          });
        });
      }
    }

    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code] = await this.getDataForWp(
        wp.id,
        null,
        wp.ost_wp.wp_official_code,
      );
    }
    if(submissionId != null) {
      this.setvalues(
        submission.consolidated.values,
        submission.consolidated.perValues,
      );
    } else {
      this.setvaluesCurrent(
        this.savedValues.values,
        this.savedValues.perValues,
        this.savedValues.no_budget
      );
    }


 

    const { ConsolidatedData } = this.getConsolidatedData(
      this.wps,
      this.period,
    );
    const { lockupArray } = this.getConsolidatedData(this.wps, this.period);

    const allData = this.getAllData(this.wps, this.period);
    let partnersData;
    if(!organization)
      partnersData = this.getPartnersData(this.wps, this.period, partners, null);
    else
      partnersData = this.getPartnersData(this.wps, this.period, partners, organization);

    const merges = [];
    const file_name = 'All-planning-.xlsx';
    //ConsolidatedData.unshift({"Consolidated":""})
    var wb = XLSX.utils.book_new();

    ConsolidatedData.forEach((object) => {
      delete object['wp_official_code'];
    });

    merges.push({
      s: { c: 0, r: 0 },
      e: { c: 3 + this.period.length + 1, r: 0 },
    });
    merges.push({
      s: { c: 0, r: 1 },
      e: { c: 3 + this.period.length + 1, r: 1 },
    });
    merges.push({
      s: { c: 0, r: 2 },
      e: { c: 1, r: 5 },
    });
    merges.push({
      s: { c: 2, r: 3 },
      e: { c: 2, r: 5 },
    });
    merges.push({
      s: { c: 2, r: 2 },
      e: { c: 4 + this.period.length, r: 2 },
    });
    merges.push({
      s: { c: 3, r: 3 },
      e: { c: 2 + this.period.length, r: 4 },
    });
    merges.push({
      s: { c: 2 + this.period.length + 1, r: 3 },
      e: { c: 2 + this.period.length + 2, r: 4 },
    });

    // const ws = XLSX.utils.aoa_to_sheet(header);
    // ws['!merges'] = merges;

    // XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    if(!organization){
    let ArrayOfArrays = [
      ...this.getHeader(submission, 'CONSOLIDATED',this.initiative_data),
      ...ConsolidatedData.map((d_, total_index) => [
        {
          v: 'Total Initiative',
          s: {
            fill: { fgColor: { rgb: '454962' } },
            font: { color: { rgb: 'ffffff' } },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          },
        },
        ...Object.values(d_).map((d, index) => {
          if (index == 0 && total_index != ConsolidatedData.length - 1)
            return {
              v: d,
              s: {
                alignment: {
                  horizontal: 'left',
                  vertical: 'top',
                  wrapText: true,
                },
              },
            };
          else if (total_index == ConsolidatedData.length - 1)
            return {
              v: d,
              s: {
                fill: { fgColor: { rgb: '454962' } },
                font: { color: { rgb: 'ffffff' } },
                alignment: {
                  horizontal: 'center',
                  vertical: 'center',
                },
              },
            };
          else if (index == Object.values(d_).length - 1)
            return {
              v: d,
              s: {
                fill: { fgColor: { rgb: '454962' } },
                font: { color: { rgb: 'ffffff' } },
                alignment: {
                  horizontal: 'center',
                  vertical: 'center',
                },
              },
            };
          else
            return {
              v: d,
              s: {
                alignment: {
                  horizontal: 'center',
                  vertical: 'center',
                },
              },
            };
        }),
      ]),
    ];

    merges.push({
      s: { c: 0, r: 6 },
      e: { c: 0, r: 6 + ConsolidatedData.length - 1 },
    });
    merges.push({
      s: { c: 1, r: 6 + ConsolidatedData.length - 1 },
      e: { c: 2, r: 6 + ConsolidatedData.length - 1 },
    });
    for (let data of allData) {
      data.forEach((object) => {
        delete object['id'];
      });
    }
    let rowStart = ArrayOfArrays.length;
    for (let i = 0; i < lockupArray.length - 1; i++) {
      ArrayOfArrays.push(
        ...allData[i].map((d_, total_index) => [
          {
            v: lockupArray[i],
            s: {
              fill: { fgColor: { rgb: '454962' } },
              font: { color: { rgb: 'ffffff' } },
              alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true,
              },
            },
          },
          ...Object.values(d_).map((d, index) => {
            if (index == 0 && total_index != allData[i].length - 1)
              return {
                v: String(d),
                s: {
                  alignment: {
                    horizontal: 'left',
                    vertical: 'top',
                    wrapText: true,
                  },
                },
              };
            else if (total_index == allData[i].length - 1)
              return {
                v: d,
                s: {
                  fill: { fgColor: { rgb: '454962' } },
                  font: { color: { rgb: 'ffffff' } },
                  alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                  },
                },
              };
            else if (index == Object.values(d_).length - 1)
              return {
                v: d,
                s: {
                  fill: { fgColor: { rgb: '454962' } },
                  font: { color: { rgb: 'ffffff' } },
                  alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                  },
                },
              };
            else
              return {
                v: String(d),
                s: {
                  alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                  },
                },
              };
            return d;
          }),
        ]),
      );

      merges.push({
        s: { c: 0, r: rowStart },
        e: { c: 0, r: ArrayOfArrays.length - 1 },
      });
      merges.push({
        s: { c: 1, r: ArrayOfArrays.length - 1 },
        e: { c: 2, r: ArrayOfArrays.length - 1 },
      });
      rowStart = ArrayOfArrays.length;
    }

    const ws = XLSX.utils.aoa_to_sheet(ArrayOfArrays);

    ws['!merges'] = merges;
    ws['!cols'] = [{ wpx: 120 }, { wpx: 320 }];
    //ws['!rows'] = [{ hpt: 100 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }
    let indexPartner = 0;

    for (let partner of partnersData) {
      partner.forEach((par) => {
        par.forEach((object) => {
          delete object['id'];
        });
      });
    }
    if(organization) 
      partners = partners.filter((d:any) => d.code == organization.code);
    for (let partner of partners) {
      let mergesPartners = [];
      let ArrayOfArrays;
      if(initId)
        ArrayOfArrays = this.getHeader(null, partner.acronym, this.initiative_data);
      else 
        ArrayOfArrays = this.getHeader(submission, partner.acronym, null);

      let rowStart = ArrayOfArrays.length;
      for (let i = 0; i < lockupArray.length - 1; i++) {
        ArrayOfArrays.push(
          ...partnersData[indexPartner][i].map((d_,total_index) => [
            {
              v: String(lockupArray[i]),
              s: {
                fill: { fgColor: { rgb: '454962' } },
                font: { color: { rgb: 'ffffff' } },
                alignment: {
                  horizontal: 'center',
                  vertical: 'center',
                  wrapText: true,
                },
              },
            },
            ...Object.values(d_).map((d, index) => {
              if (index == 0 && total_index !=partnersData[indexPartner][i].length - 1)
                return {
                  v: String(d),
                  s: {
                    alignment: {
                      horizontal: 'top',
                      vertical: 'left',
                      wrapText: true,
                    },
                  },
                };
                if ( total_index == partnersData[indexPartner][i].length - 1)
                return {
                  v: String(d),
                  s: {
                    fill: { fgColor: { rgb: '454962' } },
                    font: { color: { rgb: 'ffffff' } },
                    alignment: {
                      horizontal: 'center',
                      vertical: 'center',
                    },
                  },
                };
                else if (index == Object.values(d_).length - 1)
                return {
                  v: d,
                  s: {
                    fill: { fgColor: { rgb: '454962' } },
                    font: { color: { rgb: 'ffffff' } },
                    alignment: {
                      horizontal: 'center',
                      vertical: 'center',
                    },
                  },
                };
              else {
                return {
                  v: String(d),
                  s: {
                    alignment: {
                      horizontal: 'center',
                      vertical: 'center',
                    },
                  },
                };
              }
            }),
          ]),
        );

        mergesPartners.push({
          s: { c: 0, r: rowStart },
          e: { c: 0, r: ArrayOfArrays.length - 1 },
        });
        mergesPartners.push({
          s: { c: 1, r: ArrayOfArrays.length - 1 },
          e: { c: 2, r: ArrayOfArrays.length - 1 },
        });

        rowStart = ArrayOfArrays.length;
      }

      mergesPartners.push({
        s: { c: 0, r: 0 },
        e: { c: 3 + this.period.length + 1, r: 0 },
      });
      mergesPartners.push({
        s: { c: 0, r: 1 },
        e: { c: 3 + this.period.length + 1, r: 1 },
      });
      mergesPartners.push({
        s: { c: 0, r: 2 },
        e: { c: 1, r: 5 },
      });
      mergesPartners.push({
        s: { c: 2, r: 3 },
        e: { c: 2, r: 5 },
      });
      mergesPartners.push({
        s: { c: 2, r: 2 },
        e: { c: 4 + this.period.length, r: 2 },
      });
      mergesPartners.push({
        s: { c: 3, r: 3 },
        e: { c: 2 + this.period.length, r: 4 },
      });
      mergesPartners.push({
        s: { c: 2 + this.period.length + 1, r: 3 },
        e: { c: 2 + this.period.length + 2, r: 4 },
      });

      const ws = XLSX.utils.aoa_to_sheet(ArrayOfArrays);

      ws['!merges'] = mergesPartners;
      ws['!cols'] = [{ wpx: 120 }, { wpx: 320 }];
      XLSX.utils.book_append_sheet(wb, ws, partner.acronym);

      indexPartner++;
    }

    await XLSX.writeFile(
      wb,
      join(process.cwd(), 'generated_files', file_name),
      { cellStyles: true },
    );
    const file = createReadStream(
      join(process.cwd(), 'generated_files', file_name),
    );

    setTimeout(async () => {
      try {
        unlink(join(process.cwd(), 'generated_files', file_name), null);
      } catch (e) {}
    }, 9000);
    return new StreamableFile(file, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file_name}"`,
    });

    // return {
    //   ConsolidatedData: ConsolidatedData,
    //   summary_data: allData,
    //   lockupArray: lockupArray,
    //   partners: partnersData,
    // };
  }

  wpsTotalSum = 0;
  sammaryCalc() {
    let totalsum: any = {};
    let totalsumcenter: any = {};
    let totalWp: any = {};
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};

    Object.keys(this.budgetValues).forEach((partner_code) => {
      Object.keys(this.budgetValues[partner_code]).forEach((wp_id) => {
        if (!this.summaryBudgets[wp_id]) this.summaryBudgets[wp_id] = {};
        if (!this.summaryBudgetsTotal[wp_id])
          this.summaryBudgetsTotal[wp_id] = 0;
        Object.keys(this.budgetValues[partner_code][wp_id]).forEach(
          (item_id) => {
            if (!this.summaryBudgets[wp_id][item_id])
              this.summaryBudgets[wp_id][item_id] = 0;
            this.summaryBudgets[wp_id][item_id] +=
              +this.budgetValues[partner_code][wp_id][item_id];
            this.summaryBudgetsTotal[wp_id] +=
              +this.budgetValues[partner_code][wp_id][item_id];
          },
        );
      });
    });
    this.summaryBudgetsAllTotal = Object.values(
      this.summaryBudgetsTotal,
    ).reduce((a: any, b: any) => a + b);

    Object.keys(this.summaryBudgets).forEach((wp_id) => {
      if (this.summaryBudgetsTotal[wp_id]) {
        Object.keys(this.summaryBudgets[wp_id]).forEach((item_id) => {
          this.sammary[wp_id][item_id] = this.percentValue(
            this.summaryBudgets[wp_id][item_id],
            this.summaryBudgetsTotal[wp_id],
          );
        });
      }
    });

    Object.keys(this.values).forEach((code) => {
      Object.keys(this.values[code]).forEach((wp_id) => {
        let total = 0;
        Object.keys(this.values[code][wp_id]).forEach((d) => {
          total += +this.values[code][wp_id][d];
        });
        if (total > 100) {
          this.errors[code][wp_id] =
            'total percentage cannot be over 100 percent';
        } else {
          this.errors[code][wp_id] = null;
        }
        this.totals[code][wp_id] = total;

        Object.keys(this.values[code][wp_id]).forEach((item_id) => {
          if (!totalsum[wp_id]) totalsum[wp_id] = {};
          if (!totalsum[wp_id][item_id]) totalsum[wp_id][item_id] = 0;
          totalsum[wp_id][item_id] += +this.values[code][wp_id][item_id];
        });
        // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
      });
    });

    Object.keys(this.totals).forEach((code) => {
      Object.keys(this.totals[code]).forEach((wp_id) => {
        if (!totalsumcenter[wp_id]) totalsumcenter[wp_id] = 0;
        totalsumcenter[wp_id] += +this.totals[code][wp_id];
        // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
      });
    });

    Object.keys(totalsum).forEach((wp_id) => {
      Object.keys(totalsum[wp_id]).forEach((item_id) => {
        if (!totalWp[wp_id]) totalWp[wp_id] = {};
        if (+totalsum[wp_id][item_id] && +totalsumcenter[wp_id])
          totalWp[wp_id][item_id] =
            +(+totalsum[wp_id][item_id] / +totalsumcenter[wp_id]) * 100;
        else totalWp[wp_id][item_id] = 0;
      });
    });

    this.sammaryTotal['CROSS'] = 0;
    this.sammaryTotal['IPSR'] = 0;
    Object.keys(this.sammary).forEach((wp_id) => {
      this.sammaryTotal[wp_id] = 0;
      Object.keys(this.sammary[wp_id]).forEach((item_id) => {
        this.sammaryTotal[wp_id] += totalWp[wp_id][item_id];
      });
    });
    this.wpsTotalSum = 0;
    Object.keys(this.sammaryTotal).forEach((wp_id) => {
      this.wpsTotalSum += this.sammaryTotal[wp_id];
    });
    this.wpsTotalSum = this.wpsTotalSum / Object.keys(this.sammaryTotal).length;
  }

  allvalueChange() {
    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code].forEach((item: any) => {
        this.period.forEach((element) => {
          if (!this.perAllValues[wp.ost_wp.wp_official_code])
            this.perAllValues[wp.ost_wp.wp_official_code] = {};
          if (!this.perAllValues[wp.ost_wp.wp_official_code][item.id])
            this.perAllValues[wp.ost_wp.wp_official_code][item.id] = {};
          this.perAllValues[wp.ost_wp.wp_official_code][item.id][element.id] =
            false;
        });
      });
    }
    this.wps.forEach((wp: any) => {
      this.period.forEach((per) => {
        this.perValuesSammary[wp.ost_wp.wp_official_code][per.id] = false;
      });
    });

    //from here
    Object.keys(this.perValues).forEach((partner_code) => {
      Object.keys(this.perValues[partner_code]).forEach((wp_id) => {
        Object.keys(this.perValues[partner_code][wp_id]).forEach((item_id) => {
          Object.keys(this.perValues[partner_code][wp_id][item_id]).forEach(
            (per_id) => {
              if (this.perValues[partner_code][wp_id][item_id][per_id] == true)
                this.perAllValues[wp_id][item_id][per_id] =
                  this.perValues[partner_code][wp_id][item_id][per_id];

              if (this.perValues[partner_code][wp_id][item_id][per_id] == true)
                this.perValuesSammary[wp_id][per_id] = true;
            },
          );
        });
      });
    });
  }

  check(values: any, code: string, id: number, item_id: string) {
    if (values[code] && values[code][id] && values[code][id][item_id]) {
      return true;
    } else if (values[code] && !values[code][id]) {
      values[code][id] = {};
      values[code][id][item_id] = 0;
      this.totals[code][id] = 0;
      this.errors[code][id] = null;
      return true;
    } else if (values[code] && values[code][id] && !values[code][id][item_id]) {
      values[code][id][item_id] = 0;
      return true;
    } else {
      values[code] = {};
      values[code][id] = {};
      values[code][id][item_id] = 0;
      this.totals[code] = {};
      this.totals[code][id] = 0;
      this.errors[code] = {};
      this.errors[code][id] = null;
      return true;
    }
  }
  checkEOI(category: any) {
    if(this.InitiativeId == null)
      return this.submission_data.phase?.show_eoi ? category == "EOI" : false;
    else
      return this.phase?.show_eoi ? category == "EOI" : false;
  }

  getDataForWp(
    id: string,
    partner_code: any | null = null,
    official_code = null,
  ) {
    let wp_data = this.results.filter((d: any) => {
      if (partner_code)
        return (
          (d.category == 'OUTPUT' ||
            d.category == 'OUTCOME' ||
            d.category == 'EOI' ||
            d.category == 'CROSS' ||
            d.category == 'IPSR' ||
            // d.category == 'INDICATOR' ||
            d.category == 'MELIA') &&
          (d.group == id ||
            d.wp_id == official_code ||
            (official_code == 'CROSS' && this.checkEOI(d.category)))
        );
      else
        return (
          ((d.category == 'OUTPUT' ||
            d.category == 'OUTCOME' ||
            d.category == 'EOI' ||
            d.category == 'IPSR' ||
            d.category == 'CROSS' ||
            // d.category == 'INDICATOR' ||
            d.category == 'MELIA') &&
            (d.group == id || d.wp_id == official_code)) ||
          (official_code == 'CROSS' && this.checkEOI(d.category))
        );
    });

    wp_data.sort(this.compare);

    return wp_data;
  }

  compare(a: any, b: any) {
    if (a.category == 'OUTPUT' && b.category == 'OUTCOME') return -1;
    if (b.category == 'OUTPUT' && a.category == 'OUTCOME') return 1;
    return 0;
  }

  setvalues(valuesToSet: any, perValuesToSet: any) {
    if (valuesToSet != null)
      Object.keys(this.values).forEach((code) => {
        Object.keys(this.values[code]).forEach((wp_id) => {
          Object.keys(this.values[code][wp_id]).forEach((item_id) => {
            if (
              valuesToSet[code] &&
              valuesToSet[code][wp_id] &&
              valuesToSet[code][wp_id][item_id]
            ) {
              let percentValue = +valuesToSet[code][wp_id][item_id];
              let budgetValue = this.budgetValue(
                percentValue,
                this.wp_budgets[code][wp_id],
              );
              this.values[code][wp_id][item_id] = percentValue;
              this.displayValues[code][wp_id][item_id] =
                Math.round(percentValue);
              this.budgetValues[code][wp_id][item_id] = budgetValue;
              this.displayBudgetValues[code][wp_id][item_id] =
                Math.round(budgetValue);
            } else {
              this.values[code][wp_id][item_id] = 0;
              this.displayValues[code][wp_id][item_id] = 0;
              this.budgetValues[code][wp_id][item_id] = 0;
              this.displayBudgetValues[code][wp_id][item_id] = 0;
            }
            // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
          });
        });
      });

    if (perValuesToSet != null)
      Object.keys(this.perValues).forEach((code) => {
        Object.keys(this.perValues[code]).forEach((wp_id) => {
          Object.keys(this.perValues[code][wp_id]).forEach((item_id) => {
            Object.keys(this.perValues[code][wp_id][item_id]).forEach(
              (per_id) => {
                if (
                  perValuesToSet[code] &&
                  perValuesToSet[code][wp_id] &&
                  perValuesToSet[code][wp_id][item_id]
                )
                  this.perValues[code][wp_id][item_id][per_id] =
                    perValuesToSet[code][wp_id][item_id][per_id];
              },
            );
          });
        });
      });
    this.sammaryCalc();
    this.allvalueChange();
  }

  budgetValue(value: number, totalBudget: number) {
    return (value * totalBudget) / 100;
  }

  percentValue(value: number, totalBudget: number) {
    return (value / totalBudget) * 100;
  }

  finalPeriodVal(period_id: any) {
    return this.wps
      .map(
        (wp: any) =>
          this.perValuesSammary[wp.ost_wp.wp_official_code][period_id],
      )
      .reduce((a: any, b: any) => a || b);
  }
  roundNumber(value: number) {
    return Math.round(value);
  }

  toggleSummaryActualValues(wp_official_code: any) {
    this.toggleSummaryValues[wp_official_code] =
      !this.toggleSummaryValues[wp_official_code];
  }

  finalItemPeriodVal(wp_id: any, period_id: any) {
    let periods = this.allData[wp_id].map(
      (item: any) => this.perAllValues[wp_id][item.id][period_id],
    );
    if (periods.length) return periods.reduce((a: any, b: any) => a || b);
    else return false;
  }
  phase: any;
  initiative_data: any = {};


  setvaluesCurrent(valuesToSet: any, perValuesToSet: any, noBudget: any) {
    if (valuesToSet != null)
      Object.keys(this.values).forEach((code) => {
        Object.keys(this.values[code]).forEach((wp_id) => {
          Object.keys(this.values[code][wp_id]).forEach((item_id) => {
            if (
              valuesToSet[code] &&
              valuesToSet[code][wp_id] &&
              valuesToSet[code][wp_id][item_id]
            ) {
              let percentValue = +valuesToSet[code][wp_id][item_id];
              let budgetValue = this.budgetValue(
                percentValue,
                this.wp_budgets[code][wp_id]
              );
              this.values[code][wp_id][item_id] = percentValue;
              this.displayValues[code][wp_id][item_id] =
                Math.round(percentValue);
              this.budgetValues[code][wp_id][item_id] = budgetValue;
              this.displayBudgetValues[code][wp_id][item_id] =
                Math.round(budgetValue);
            } else {
              this.values[code][wp_id][item_id] = 0;
              this.displayValues[code][wp_id][item_id] = 0;
              this.budgetValues[code][wp_id][item_id] = 0;
              this.displayBudgetValues[code][wp_id][item_id] = 0;
            }
            // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
          });
        });
      });
    if (perValuesToSet != null)
      Object.keys(this.perValues).forEach((code) => {
        Object.keys(this.perValues[code]).forEach((wp_id) => {
          Object.keys(this.perValues[code][wp_id]).forEach((item_id) => {
            Object.keys(this.perValues[code][wp_id][item_id]).forEach(
              (per_id) => {
                if (
                  perValuesToSet[code] &&
                  perValuesToSet[code][wp_id] &&
                  perValuesToSet[code][wp_id][item_id]
                )
                  this.perValues[code][wp_id][item_id][per_id] =
                    perValuesToSet[code][wp_id][item_id][per_id];
                // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
              }
            );
          });
        });
      });
    if (noBudget != null)
      Object.keys(this.noValuesAssigned).forEach((code) => {
        Object.keys(this.noValuesAssigned[code]).forEach((wp_id) => {
          Object.keys(this.noValuesAssigned[code][wp_id]).forEach((item_id) => {
            if (
              noBudget[code] &&
              noBudget[code][wp_id] &&
              noBudget[code][wp_id][item_id]
            ) {
              this.noValuesAssigned[code][wp_id][item_id] =
                noBudget[code][wp_id][item_id];
            } else {
              this.noValuesAssigned[code][wp_id][item_id] = false;
            }
          });
        });
      });
    this.sammaryCalc();
    this.allvalueChange();
  }
}

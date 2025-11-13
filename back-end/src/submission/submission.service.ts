import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultPeriodValues } from 'src/entities/resultPeriodValues.entity';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Result } from 'src/entities/result.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { Organization } from 'src/entities/organization.entity';
import { Period } from 'src/entities/period.entity';
import { Submission, SubmissionStatus } from 'src/entities/submission.entity';
import { User, userRole } from 'src/entities/user.entity';
import { Phase } from 'src/entities/phase.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { CenterStatus } from 'src/entities/center-status.entity';
import { WpBudget } from 'src/entities/wp-budget.entity';
import { CrossCuttingService } from 'src/cross-cutting/cross-cutting.service';
import { IpsrValueService } from 'src/ipsr-value/ipsr-value.service';
import { PhasesService } from 'src/phases/phases.service';
import * as XLSX from 'xlsx-js-style';
import { join } from 'path';
import { createReadStream, unlink } from 'fs';
import { InitiativesService } from 'src/initiatives/initiatives.service';
import { PeriodsService } from 'src/periods/periods.service';
// import { Melia } from 'src/entities/melia.entity';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
// import { InitiativeMelia } from 'src/entities/initiative-melia.entity';
import { EmailService } from 'src/email/email.service';
import { History } from 'src/entities/history.entity';
import { catchError, firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { AnaplanService } from 'src/anaplan/anaplan.service';
import { BudgetAssumptionsService } from 'src/budget-assumptions/budget-assumptions.service';
import { Response } from 'express';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { Constants } from 'src/entities/constants.entity';
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
    @InjectRepository(History)
    private historyRepository: Repository<History>,
    private CrossCuttingService: CrossCuttingService,
    private IpsrValueService: IpsrValueService,
    public PhasesService: PhasesService,
    private initService: InitiativesService,
    private periodService: PeriodsService,
    private anaplanService: AnaplanService,
    private budgetAssumptionsService: BudgetAssumptionsService,
    // @InjectRepository(Melia)
    // private meliaRepository: Repository<Melia>,
    @InjectRepository(CrossCutting)
    private CrossCuttingRepository: Repository<CrossCutting>,
    @InjectRepository(AnaplanValues)
    private anaplanValuesRepository: Repository<AnaplanValues>,
    @InjectRepository(IpsrValue)
    private ipsrValueRepository: Repository<IpsrValue>,
    @InjectRepository(PartnerCountry)
    private partnerCountryRepository: Repository<PartnerCountry>,
    private emailService: EmailService,
    private readonly httpService: HttpService,
    @InjectRepository(Constants)  private constantsRepository: Repository<Constants>
    
  ) { }
  sort(query) {
    if (query?.sort) {
      let obj = {};
      const sorts = query.sort.split(',');
      obj[sorts[0]] = sorts[1];
      return obj;
    } else return { id: 'DESC' };
  }
  async updateCenterStatus(data, reqUser) {
    const { initiative_id, organization_code, phase_id, status, organization } = data;

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
    if(status == false) 
      center_status.is_valid = status;
    await this.centerStatusRepo.save(center_status).then(
      async (data) => {
        if (data.status) {
          const init = await this.initiativeRepository.findOne({
            where: {
              id: initiative_id
            },
            relations: ['roles', 'roles.user', 'roles.organizations']
          });

          const usersRole = [];
          init.roles.filter(d => {
            if (d.role == 'Leader' || d.role == 'Coordinator' || 'Financial Focal Point') {
              usersRole.push(d);
            } else if (d.role == 'Contributor') {
              d.organizations.filter(x => {
                if (x.code == data.organization_code) {
                  usersRole.push(d)
                }
              });

            }
          });
          const users = usersRole.map(d => d.user);

          // when user is in team member
          const userRoleDoAction = init.roles.filter(d => d.user_id == reqUser.id);

          for (let user of users) {
            if (userRoleDoAction.length) {
              this.emailService.sendEmailTobyVarabel(user, 7, init, null, null, organization, userRoleDoAction, null, null)
            } else {
              // when admin mark as complete
              this.emailService.sendEmailTobyVarabel(user, 7, init, null, null, organization, [reqUser], null, null)
            }
          }
        }
        const history = this.historyRepository.create();
        history.resource_property = data.status ? 'Mark as complete' : 'Mark as incomplete';
        history.user_id = reqUser.id;
        history.initiative_id = data.initiative_id;
        history.organization_id = organization_code;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(initiative_id, {
          latest_history_id: history.id
        });
      }, (error) => {
        console.error(error)
      }
    );

    return { message: 'Data Saved' };
  }
  async updateCenterValidate(data, reqUser) {
    const { initiative_id, organization_code, phase_id, is_valid, organization } = data;

    let center_status: CenterStatus;
    center_status = await this.centerStatusRepo.findOneBy({
      initiative_id,
      organization_code,
      phase_id,
    });


    center_status.initiative_id = initiative_id;
    center_status.organization_code = organization_code;
    center_status.phase_id = phase_id;
    center_status.is_valid = is_valid;
    await this.centerStatusRepo.save(center_status).then(
      async (data) => {
        if (data.is_valid) {
          const init = await this.initiativeRepository.findOne({
            where: {
              id: initiative_id
            },
            relations: ['roles', 'roles.user', 'roles.organizations']
          });

          const usersRole = [];
          init.roles.filter(d => {
            if (d.role == 'Leader' || d.role == 'Coordinator' || 'Financial Focal Point') {
              usersRole.push(d);
            } else if (d.role == 'Contributor') {
              d.organizations.filter(x => {
                if (x.code == data.organization_code) {
                  usersRole.push(d)
                }
              });

            }
          });
          const users = usersRole.map(d => d.user);

          // when user is in team member
          const userRoleDoAction = init.roles.filter(d => d.user_id == reqUser.id);

          for (let user of users) {
            if (userRoleDoAction.length) {
              this.emailService.sendEmailTobyVarabel(user, 9, init, null, null, organization, userRoleDoAction, null, null)
            } else {
              // when admin mark as complete
              this.emailService.sendEmailTobyVarabel(user, 9, init, null, null, organization, [reqUser], null, null)
            }
          }
        }
        const history = this.historyRepository.create();
        history.resource_property = data.is_valid ? 'Mark as valid' : 'Mark as invalid';
        history.user_id = reqUser.id;
        history.initiative_id = data.initiative_id;
        history.organization_id = organization_code;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(initiative_id, {
          latest_history_id: history.id
        });
      }, (error) => {
        console.error(error)
      }
    );

    return { message: 'Data Saved' };
  }
  async updateStatusBySubmittionID(id, data, user) {

    return await this.submissionRepository.update(id, data).then(
      async () => {

        const submission = await this.submissionRepository.findOne({
          where: {
            id: id,
          },
          relations: ['initiative', 'initiative.roles', 'initiative.roles.user']
        });
        if (submission)
          for (let role of submission.initiative?.roles) {
            if (data.status == 'Approved') {
              this.emailService.sendEmailTobyVarabel(role.user, 5, submission.initiative, role.role, data.status_reason, null, null, null, null)
            } else if (data.status == 'Rejected') {
              this.emailService.sendEmailTobyVarabel(role.user, 6, submission.initiative, role.role, data.status_reason, null, null, null, null)
            }
          }
        const history = this.historyRepository.create();
        history.resource_property = data.status == 'Approved' ? `Approved for version Id: ${id}` : `Rejected for version Id: ${id}`;
        history.item_name = data.status;
        history.user_id = user.id;
        history.initiative_id = submission.initiative_id;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(submission.initiative_id, {
          latest_history_id: history.id
        });
        return true
      }, (error) => {
        console.error(error)
      }
    );
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
  async createNew(user_id, initiative_id, phase_id, json, tocSubmissionData) {
    try {
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
      newSubmission.toc_original_id = tocSubmissionData.original_id;
      newSubmission.toc_version_id = tocSubmissionData.version_id;
      newSubmission.toc_version = tocSubmissionData.version;
      newSubmission.toc_phase_id = tocSubmissionData.phase;
      const submissionObject = await this.submissionRepository.save(
        newSubmission,
        { reload: true },
      );

      let oldAnaplanValues = await this.anaplanValuesRepository.find({
        where: {
          initiative_id: initiative_id,
          submission: IsNull(),
          phase_id: phase_id
        },
        relations: ['workPackage', 'anaplan', 'organization'],
      });

      for (let value of oldAnaplanValues) {
        delete value.id;
        value.submission = submissionObject;
        await this.anaplanValuesRepository.save(value, {
          reload: true,
        });
      }

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
      const data = await this.submissionRepository.findOne({
        where: { id: submissionObject.id },
        relations: ['user', 'phase'],
      });
      if (data) {
        const admins = await this.userRepository.find({
          where: {
            role: userRole.ADMIN
          }
        });
        const init = await this.initiativeRepository.findOne({
          where: {
            id: initiative_id,
            roles: {
              role: In(['Leader', 'Coordinator','Financial Focal Point'])
            }
          },
          relations: ['roles', 'roles.user']
        })
        //if (Leader && Coordinator) not exist
        const initAdmin = await this.initiativeRepository.findOne({
          where: {
            id: initiative_id,
          },
        })
        // users (Leader && Coordinator)
        const users = init?.roles.map(d => d.user);
        for (let admin of admins) {
          this.emailService.sendEmailTobyVarabel(admin, 3, initAdmin, null, null, null, null, null, null)
        }
        if (users)
          for (let user of users) {
            this.emailService.sendEmailTobyVarabel(user, 4, init, null, null, null, null, null, null)
          }
      }
      const history = this.historyRepository.create();
      history.resource_property = 'Submit';
      history.user_id = user_id;
      history.initiative_id = initiative_id;
      await this.historyRepository.save(history);
      await this.initiativeRepository.update(initiative_id, {
        latest_history_id: history.id
      });
      return data
    } catch (error) {
      throw new BadRequestException('Connection Error')
    }
  }

  dataToPers(saved_data) {
    try {
      let data = { perValues: {}, values: {}, no_budget: {} };
      saved_data.forEach((result: Result) => {
        if (!data.perValues[result?.organization_code])
          data.perValues[result?.organization_code] = {};
        if (
          !data.perValues[result?.organization_code][
          result?.workPackage?.wp_official_code
          ]
        )
          data.perValues[result?.organization_code][
            result?.workPackage?.wp_official_code
          ] = {};

        if (
          !data.perValues[result?.organization_code][
          result?.workPackage?.wp_official_code
          ][result?.result_uuid]
        )
          data.perValues[result?.organization_code][
            result?.workPackage?.wp_official_code
          ][result?.result_uuid] = {};
        result?.values.forEach((d) => {
          if (
            data.perValues[result?.organization_code][
            result?.workPackage?.wp_official_code
            ][result?.result_uuid][d?.period?.id]
          )
            data.perValues[result?.organization_code][
              result?.workPackage?.wp_official_code
            ][result?.result_uuid][d.period?.id] = {};
          data.perValues[result?.organization_code][
            result?.workPackage?.wp_official_code
          ][result?.result_uuid][d.period?.id] = d.value;
        });

        if (!data.values[result?.organization_code])
          data.values[result?.organization_code] = {};
        if (
          !data.values[result?.organization_code][
          result?.workPackage?.wp_official_code
          ]
        )
          data.values[result?.organization_code][
            result?.workPackage?.wp_official_code
          ] = {};

        if (
          !data.values[result?.organization_code][
          result?.workPackage?.wp_official_code
          ][result?.result_uuid]
        )
          data.values[result?.organization_code][
            result?.workPackage?.wp_official_code
          ][result?.result_uuid] = result?.value;

        if (!data.no_budget[result?.organization_code])
          data.no_budget[result?.organization_code] = {};
        if (
          !data.no_budget[result?.organization_code][
          result?.workPackage?.wp_official_code
          ]
        )
          data.no_budget[result?.organization_code][
            result?.workPackage?.wp_official_code
          ] = {};
        if (
          !data.no_budget[result?.organization_code][
          result?.workPackage?.wp_official_code
          ][result?.result_uuid]
        )
          data.no_budget[result?.organization_code][
            result?.workPackage?.wp_official_code
          ][result?.result_uuid] = result?.no_budget;
      });
      return data;
    } catch (error) {
      console.error('error dataToPers', error);
    }
  }
  async getSaved(id, phaseId) {
    try {
      const saved_data = await this.resultRepository.find({
        where: { initiative_id: id, submission_id: IsNull(), phase_id: phaseId },
        relations: ['values', 'workPackage', 'values.period'],
      });
      return this.dataToPers(saved_data);
    } catch (error) {
      console.error('error getSaved Data', error);
      throw new BadRequestException('getSaved error');
    }
  }

  async getSavedIndicator(id, phaseId) {
    try {
      const saved_data = await this.resultRepository.find({
        where: {
          initiative_id: id,
          submission_id: IsNull(),
          phase_id: phaseId,
          type: 'INDICATOR',
        },
        relations: ['values', 'workPackage'],
      });
      return saved_data;
    } catch (error) {
      console.error('error getSaved Data', error);
      throw new BadRequestException('getSaved error');
    }
  }

  async getSavedIndicatorForVersion(id, phaseId, versionId) {
    try {
      const saved_data = await this.resultRepository.find({
        where: {
          initiative_id: id,
          submission_id: versionId,
          phase_id: phaseId,
          type: 'INDICATOR',
        },
        relations: ['values', 'workPackage'],
      });
      return saved_data;
    } catch (error) {
      console.error('error getSaved Data', error);
      throw new BadRequestException('getSaved error');
    }
  }

  async getSelectedCountry(resultId: number, initiative_id: string, phase_id: number) { 
    return await this.partnerCountryRepository
    .createQueryBuilder("pc")
    .leftJoin("pc.organization", "org")
    .leftJoin("pc.country", "country")
    .leftJoin("pc.initiative", "initiative")
    .leftJoin("pc.phase", "phase")
    .select("pc.result_id", "resultId")
    .addSelect("pc.center_code", "centerCode")
    .addSelect("org.acronym", "centerName")
    .addSelect("GROUP_CONCAT(country.name ORDER BY country.name)", "countries")
    .where("pc.result_id = :resultId", { resultId: resultId })
    .andWhere('initiative.official_code = :initiative_id', { initiative_id })
    .andWhere('phase.id = :phase_id', { phase_id })
    .groupBy("pc.result_id")
    .addGroupBy("pc.center_code")
    .addGroupBy("org.acronym")
    .getRawMany();

  } 

  async saveResultData(id, data: any, user) {
    const initiativeId = id;
    const { partner_code, wp_id, item_id, per_id, value, phase_id, title, is_project } = data;
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    
    if(!workPackageObject){
      workPackageObject = this.workPackageRepository.create();
      workPackageObject.name = wp_id;
      workPackageObject.initiative_id = initiativeObject.id;
      workPackageObject.wp_official_code = wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepository.save(workPackageObject);
    }

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
      is_project: is_project
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
      await this.resultValuesRepository.save(newResultPeriodValue).then(
        async (data) => {
          const history = this.historyRepository.create();
          history.item_name = title;
          history.resource_property = value ? 'Checked partner' : 'unchecked partner';
          history.old_value = newResultPeriodValue.value == true ? 'False' : 'True';
          history.new_value = value == true ? 'True' : 'False';
          history.user_id = user.id;
          history.initiative_id = id;
          history.organization_id = partner_code;
          history.wp_id = workPackageObject.wp_id;
          history.period = data.period;
          await this.historyRepository.save(history);
          await this.initiativeRepository.update(id, {
            latest_history_id: history.id
          });
        },
        (error) => {
          console.error(error);
        }
      );
    }
    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }
  async saveAllResultData(id, data: any, user) {
    const initiativeId = id;
    const { partner_code, wp_id, title, itemsIds, value, phase_id, is_project } = data;

    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    if(!workPackageObject){
      workPackageObject = this.workPackageRepository.create();
      workPackageObject.name = wp_id;
      workPackageObject.initiative_id = initiativeObject.id;
      workPackageObject.wp_official_code = wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepository.save(workPackageObject);
    }
    let organizationObject = await this.organizationRepository.findOneBy({
      code: partner_code,
    });

    for (let item_id of itemsIds) {
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
        is_project: is_project
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

        let allPeriodObject = await this.periodRepository.find();

        for (let periodObject of allPeriodObject) {
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
      }
    }

    const history = this.historyRepository.create();
    history.resource_property = title;
    history.user_id = user.id;
    history.initiative_id = id;
    history.organization_id = partner_code;
    history.wp_id = workPackageObject.wp_id;
    await this.historyRepository.save(history);

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
      latest_history_id: history.id
    });
    if (!value)
      await this.clearAllResultValues(id, data);
    return { message: 'Data saved' };
  }
  async clearAllResultValues(id: number, data: any) {
    const initiativeId = id;

    const {
      partner_code,
      wp_id,
      itemsIds,
      phase_id
    } = data;
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let organizationObject = await this.organizationRepository.findOneBy({
      code: partner_code,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    if(!workPackageObject){
      workPackageObject = this.workPackageRepository.create();
      workPackageObject.name = wp_id;
      workPackageObject.initiative_id = initiativeObject.id;
      workPackageObject.wp_official_code = wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepository.save(workPackageObject);
    }

    for (let item_id of itemsIds) {
      let oldResult = await this.resultRepository.findOneBy({
        initiative_id: id,
        result_uuid: item_id,
        organization: organizationObject,
        workPackage: workPackageObject,
        submission: IsNull(),
        phase_id
      });


      if (oldResult) {
        oldResult.value = 0;
        oldResult.budget = '0';
        oldResult.no_budget = false;
        oldResult.phase_id = phase_id
        await this.resultRepository.save(oldResult);
      } else throw new NotFoundException();
    }

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }
  async saveResultDataValue(id, data: any, user) {
    const initiativeId = id;
    const {
      partner_code,
      wp_id,
      item_id,
      item_title,
      percent_value,
      budget_value,
      no_budget,
      phase_id,
      type,
      parent_id,
      indicator_type
    } = data;

    let budgetAssumptionsData = {
      organization_code: partner_code,
      item_id: item_id,
      wp_id: wp_id,
      type: type,
      phase_id: phase_id
    }
    let budgetAssumptions = await this.budgetAssumptionsService.findOne(budgetAssumptionsData)

    if(budget_value == 0 && budgetAssumptions) {
      await this.budgetAssumptionsService.delete(budgetAssumptions.id);
    }
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let organizationObject = await this.organizationRepository.findOneBy({
      code: partner_code,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    if(!workPackageObject){
      workPackageObject = this.workPackageRepository.create();
      workPackageObject.name = wp_id;
      workPackageObject.initiative_id = initiativeObject.id;
      workPackageObject.wp_official_code = wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepository.save(workPackageObject);
    }
    let oldResult = await this.resultRepository.findOneBy({
      initiative_id: id,
      result_uuid: item_id,
      organization: organizationObject,
      workPackage: workPackageObject,
      submission: IsNull(),
      phase_id
    });

    const newValues = {
      value: percent_value,
      budget: budget_value.toString(),
      no_budget: no_budget,
    }

    if(oldResult) {
      const objDifference = this.getDifference(oldResult, newValues);

      Object.keys(objDifference).forEach(async key => {
        const value = objDifference[key];
        const history = this.historyRepository.create();
  
        if (key == 'no_budget') {
          history.resource_property = value ? 'Checked result as no budget assigned' : 'unchecked result as no budget assigned';
          history.old_value = value == true ? 'False' : 'True';
          history.new_value = value == true ? 'True' : 'False';
        }
        //  else if (key == 'value') {
        //   if (oldResult.value == 0 && newValues.value != 0) {
        //     history.resource_property = 'Add percentage';
        //     history.old_value = null;
        //     history.new_value = newValues.value.toString() + '%';
        //   } else if (oldResult.value != 0 && newValues.value != 0) {
        //     history.resource_property = 'Edit percentage';
        //     history.old_value = oldResult.value.toString() + '%';
        //     history.new_value = newValues.value.toString() + '%';
        //   } else {
        //     history.resource_property = 'Remove percentage';
        //     history.old_value = oldResult.value.toString() + '%';
        //     history.new_value = null;
        //   }
  
        // }
         else if (key == 'budget') {
          if (oldResult.budget == '0' && newValues.budget != '0') {
            history.resource_property = 'Add budget';
            history.old_value = null;
            history.new_value = newValues.budget == '' ? '0' : Number(newValues.budget).toString();
          } else if (oldResult.budget != '0' && newValues.budget != '0') {
            history.resource_property = 'Edit budget';
            history.old_value = oldResult.budget == '' ? '0' : Number(oldResult.budget).toString();
            history.new_value = newValues.budget == '' ? '0' : Number(newValues.budget).toString();
          } else {
            history.resource_property = 'Remove budget';
            history.old_value = oldResult.budget == '' ? '0' : Number(oldResult.budget).toString();
            history.new_value = null;
          }
  
        }
        history.item_name = item_title;
        history.user_id = user.id;
        history.initiative_id = id;
        history.organization_id = partner_code;
        history.wp_id = workPackageObject.wp_id;
  
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(initiativeId, {
          latest_history_id: history.id
        });
      });
  
    }
    

    if (oldResult) {
      oldResult.value = percent_value;
      oldResult.budget = budget_value;
      oldResult.no_budget = no_budget;
      oldResult.phase_id = phase_id,
      oldResult.type = type
      oldResult.parent_id = parent_id;
      oldResult.indicator_type = indicator_type;

      await this.resultRepository.save(oldResult);
    } 
    else {
      const newResult = this.resultRepository.create();
      newResult.budget = budget_value;
      newResult.initiative = initiativeObject;
      newResult.type = type;
      newResult.indicator_type = indicator_type;

      newResult.value = percent_value;
      newResult.no_budget = no_budget;
      newResult.phase_id = phase_id;
      newResult.budget = budget_value;
      newResult.result_uuid = item_id;
      newResult.organization = organizationObject;
      newResult.workPackage = workPackageObject;
      newResult.parent_id = parent_id;
      await this.resultRepository.save(newResult);

    }
    // else throw new NotFoundException();

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  }

  getDifference(a, b) {
    return Object.fromEntries(
      Object.entries(b).filter(([key, val]) =>
        key !== 'value' && key in a && a[key] !== val
      )
    );
  }

  formatWithThousandsSeparator(num) {
    let numAsString = num?.toString();
    let characters = numAsString?.split("").reverse();
    let parts = [];
    for (let i = 0; i < characters?.length; i += 3) {
      let part = characters.slice(i, i + 3).reverse().join("");
      parts.unshift(part);
    }
    return parts.join(",");
  }

  async saveWpBudget(initiativeId: number, data: any, user) { 
    const { partner_code, wp_id, budget, phaseId } = data;
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: initiativeId,
    });
    let workPackageObject = await this.workPackageRepository.findOneBy({
      wp_official_code: wp_id,
    });
    if(!workPackageObject){
      workPackageObject = this.workPackageRepository.create();
      workPackageObject.name = wp_id;
      workPackageObject.initiative_id = initiativeObject.id;
      workPackageObject.wp_official_code = wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepository.save(workPackageObject);
    }
    let oldWpBudget = await this.wpBudgetRepository.findOneBy({
      initiative_id: initiativeId,
      organization_code: partner_code,
      wp_id: workPackageObject.wp_id,
      submission_id: IsNull(),
      phase_id: phaseId
    });

    const oldData: any = {
      initiative_id: initiativeId,
      organization_code: partner_code,
      wp_id: workPackageObject.wp_id,
      budget: oldWpBudget?.budget,
      submission_id: null,
      phase_id: phaseId
    };

    if (oldWpBudget) {
      oldWpBudget.budget = budget;

      await this.wpBudgetRepository.save(oldWpBudget).then(
        async (data) => {
          const history = this.historyRepository.create();

          if (oldData.budget == '' && data.budget != '') {
            history.resource_property = 'Add total budget';
            history.old_value = null;
            history.new_value = data.budget == '' ? '0' : Number(data.budget).toString();
          } else if (oldData.budget != '' && data.budget != '') {
            history.resource_property = 'Edit total budget';
            history.old_value = oldData.budget == '' ? '0' : Number(oldData.budget).toString();
            history.new_value = data.budget == '' ? '0' : Number(data.budget).toString();
          } else {
            history.resource_property = 'Remove total budget';
            history.old_value = oldData.budget == '' ? '0' : Number(oldData.budget).toString();
            history.new_value = null;
          }



          history.item_name = null;
          history.user_id = user.id;
          history.initiative_id = initiativeId;
          history.organization_id = partner_code;
          history.wp_id = workPackageObject.wp_id;
          await this.historyRepository.save(history);
          await this.initiativeRepository.update(initiativeId, {
            latest_history_id: history.id
          });
        },
        (error) => {
          console.log(error)
        }
      );
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
      this.wpBudgetRepository.save(newWpBudget).then(
        async (data: any) => {
          const history = this.historyRepository.create();

          if (oldData.budget == undefined && data.budget != '') {
            history.resource_property = 'Add total budget';
          }
          history.old_value = null;
          history.new_value = data.budget == '' ? '0' : Number(data.budget).toString();


          history.item_name = null;
          history.user_id = user.id;
          history.initiative_id = initiativeId;
          history.organization_id = partner_code;
          history.wp_id = workPackageObject.wp_id;
          await this.historyRepository.save(history);
          await this.initiativeRepository.update(initiativeId, {
            latest_history_id: history.id
          });
        },
        (error) => {
          console.log(error)
        }
      );;
    }


    let resultsForThisBudget = await this.resultRepository.find({
      where :{
        initiative_id: initiativeId,
        organization_code: partner_code,
        submission_id: IsNull(),
        wp_id: workPackageObject.wp_id,
        phase_id: phaseId
      }
    });
    if(budget) {
      const updatedResults = resultsForThisBudget.map(result => {
        const percentage = (Number(result.budget) / budget) * 100;
  
        result.value = +percentage;
        return result;
      });
      await this.resultRepository.save(updatedResults);
  
    }
   

    await this.initiativeRepository.update(initiativeId, {
      last_update_at: new Date(),
    });
    return { message: 'Data saved' };
  } 

  async getWpsBudgets(initiative_id: number, phaseId: any) {
    const initiative = await this.initService.findOne(initiative_id);

    let wpBudgets;

    if(initiative.synchronized)
      wpBudgets = await this.wpBudgetRepository.find({
        where: { initiative_id, submission_id: IsNull(), phase: { id: phaseId } , wp_id: Not(99998)},
        relations: ['workPackage'],
      });
    else
      wpBudgets = await this.wpBudgetRepository.find({
        where: { initiative_id, submission_id: IsNull(), phase: { id: phaseId } },
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
      where: { submission_id, phase_id: phaseId, wp_id: Not(99998) },
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
  getTotalIndValues(data: any, type: string) {
    if(data) {
      let sum = Object.values(data).reduce((sum, item: any) => {
        return sum + (item[type] || 0);
      }, 0);
      return sum;
    } else {
      return 0
    }
  
  }

  getTotalIndAllValues(data: any, type: string): number {
    if (!data) return 0;
  
    let total = 0;
  
    for (const uuid in data) {
      const item = data[uuid];
  
      total += item[type] || 0;
  
      for (const key in item) {
        const value = item[key];
        if (typeof value === 'object' && value !== null && value[type] !== undefined) {
          total += value[type] || 0;
        }
      }
    }
  
    return total;
  }

  getAllMeliasLength() {
    let total = 0;
    for(let wp of this.actualWps) {
      total += this.allData[wp.ost_wp.wp_official_code].filter((d: any) => d.category == "Melia").length;
    }
    return total
  }

  getConsolidatedData(wps: any[], indicatorsTypes: any[]) { 
    let ConsolidatedData = [];
    let lockupArray = [];
    wps.forEach((wp: any) => {
      let obj: any = {};
      obj['Results'] = wp.title;
      obj['Type'] = '';
      obj['wp_official_code'] = wp.ost_wp.wp_official_code;
      indicatorsTypes.forEach((indicator: any) => {
        obj[indicator] = this.getTotalIndValues(this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code], indicator);
      });
      obj['Melias'] = this.allData[wp.ost_wp.wp_official_code].filter((d: any) => d.category == "Melia").length;
      // obj['Percentage'] = this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code] + '%';
      obj['Percentage'] = this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-project']));
      obj['Budgets'] = this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code]));
      ConsolidatedData.push(obj);
    });
    let obj: any = {};
    obj['Results'] = 'Total';
    obj['Type'] = '';

    indicatorsTypes.forEach((indicator: any) => {
      obj[indicator] = this.getTotalIndAllValues(this.perAllValuesIndicator, indicator);
    });
    obj['Melias'] = this.getAllMeliasLength();
    // (obj['Percentage'] = this.roundNumber(this.wpsTotalSum) + '%'),
      (obj['Percentage'] = this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgetsProjectsTotal))),
      (obj['Budgets'] = this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgetsAllTotal))),
      ConsolidatedData.push(obj);

    lockupArray = ConsolidatedData.map((d: any) => {
      return d.Results;
    });

    return {
      ConsolidatedData: ConsolidatedData,
      lockupArray: lockupArray,
    };
  } 



  getConsolidatedDataForPartners(wps: any[], indicatorsTypes: any[], partner_code: number) {
    let ConsolidatedDataForPartners = [];
    let lockupArrayForPartners = [];

    wps.forEach((wp: any) => {
      let obj: any = {};

      obj['Results'] = wp.title;
      obj['Type'] = '';
      obj['wp_official_code'] = wp.ost_wp.wp_official_code;

      indicatorsTypes.forEach((indicator: any) => {
        obj[indicator] = this.getTotalIndValues(this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code], indicator);
      });
      obj['Melias'] = this.allData[wp.ost_wp.wp_official_code].filter((d: any) => d.category == "Melia").length;
      // obj['Percentage'] = this.totals[partner_code][wp.ost_wp.wp_official_code] + '%';
      obj['Percentage'] = this.formatWithThousandsSeparator(this.roundNumber(this.wp_budgets[partner_code][
        wp.ost_wp.wp_official_code + '-project']));
      obj['Budgets'] = this.formatWithThousandsSeparator(this.roundNumber(this.wp_budgets[partner_code][
        wp.ost_wp.wp_official_code]));
      ConsolidatedDataForPartners.push(obj);
    });
    let obj: any = {};
    obj['Results'] = 'Total';
    obj['Type'] = '';
    indicatorsTypes.forEach((indicator: any) => {
      obj[indicator] = this.getTotalIndAllValues(this.perAllValuesIndicator, indicator);
    });
    obj['Melias'] = this.getAllMeliasLength();
    (obj['Percentage'] = this.getTotalBudgetForEachPartnerProject(this.wp_budgets[partner_code])),
      (obj['Budgets'] = this.wp_budgets[partner_code]),
      ConsolidatedDataForPartners.push(obj)


    lockupArrayForPartners = ConsolidatedDataForPartners.map((d: any) => {
      return d.Results;
    });
    return {
      ConsolidatedDataForPartners: ConsolidatedDataForPartners,
      lockupArrayForPartners: lockupArrayForPartners,
    };
  }

  getAllData(wps: any[], indicatorTypes: any[]) {
    let data;
    let newArray = [];

    wps.forEach((wp: any) => {
      // let cross = this.allData['CROSS'] || [];
      // let melia = this.allData['CROSS-melia'] || [];
      // let crossCutting = this.allData['CROSS-Cross-Cutting'] || [];
      // this.allData['CROSS'] = [...cross, ...melia, ...crossCutting];

      data = this.allData[wp.ost_wp.wp_official_code].map((d: any) => {
        let obj: any = {};
        obj['id'] = d.id;
        obj['WP_Results'] = d.initiativeMelia?.meliaType?.name
          ? d.initiativeMelia?.meliaType?.name
          : d?.ipsr?.id
            ? d?.ipsr.title + ' (' + d.value + ')'
            : d.title || d.name;
        obj['Type'] = this.getCategory(d.category);
        indicatorTypes.forEach((indicator: any) => {
          obj[indicator] =
            this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code]?.[obj.id]?.[indicator] ?? '';
        });
        obj['Melias'] = '';

        // obj['BudgetPercentage'] = this.toggleSummaryValues[
        //   wp.ost_wp.wp_official_code
        // ]
        //   ? this.sammary[wp.ost_wp.wp_official_code][d.id]
        //   : this.roundNumber(this.sammary[wp.ost_wp.wp_official_code][d.id]) +
        //   '%';
        obj['BudgetPercentage'] = '';
        obj['Budget_USD'] = this.formatWithThousandsSeparator(this.roundNumber(this.toggleSummaryValues[wp.ost_wp.wp_official_code]))
          ? this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgets[wp.ost_wp.wp_official_code][d.id]))
          : this.formatWithThousandsSeparator(
            this.roundNumber(this.summaryBudgets[wp.ost_wp.wp_official_code][d.id]),
          );
        return obj;
      });
      let obj: any = {};
      obj['WP_Results'] = 'Subtotal';
      obj['Type'] = '';
      indicatorTypes.forEach((indicator: any) => {
        obj[indicator] = wp.category == 'WP' ? this.getTotalIndValues(this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code], indicator) : '';
      });
      obj['Melias'] = '';

      // obj['BudgetPercentage'] = this.toggleSummaryValues[
      //   wp.ost_wp.wp_official_code
      // ]
      //   ? this.sammaryTotal[wp.ost_wp.wp_official_code]
      //   : this.roundNumber(this.sammaryTotal[wp.ost_wp.wp_official_code]) + '%';
      obj['BudgetPercentage'] = '';


      obj['Budget_USD'] = this.formatWithThousandsSeparator(this.roundNumber(this.toggleSummaryValues[wp.ost_wp.wp_official_code]))
        ? this.formatWithThousandsSeparator(this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code]))
        : this.formatWithThousandsSeparator(
          this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code]),
        );
      data.push(obj);

      newArray.push(data);
    });
    return newArray;
  }

  async getAllDataForGeoAndPartner(
    wps: any[],
    period: any[],
    partners: any[],
    submissionId: any
  ) {
    const newArray: any[][] = Array(wps.length).fill(null).map(() => []);
  
    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i];
      const wpCode = wp?.ost_wp?.wp_official_code;
      const dataList = this.allData[wpCode] ?? [];
  
      const data = await Promise.all(
        dataList.map(async (d: any) => {
          let obj: any = {};
          obj['id'] = d.id;
          if(d.category == 'partners')
            obj['Partner'] = d.name;
          else
            obj['Scope'] = d.location;
          obj['Type'] = this.getCategory(d.category);
          obj['High Level Output'] = d.results;
  
          const centerSet = new Set<string>();
  
          for (const partner of partners) {
            for (const per of period) {
              const hasCenter =
                this.perValues?.[partner?.code]?.[wpCode]?.[d.id]?.[per.id] === true;
  
              if (hasCenter) {
                const partnerCenters = await this.getPartners(String(d.id), submissionId);
                if (partnerCenters) {
                  partnerCenters.split(',').forEach(c => centerSet.add(c.trim()));
                }
              }
            }
          }
  
          obj['Centers'] = Array.from(centerSet).join(', ');
  
          return obj;
        })
      );
  
      newArray[i].push(...data);
    }
  
    return newArray;
  }
  

  getPartnersData(wps: any[], indicatorTypes: any[], partners: any[], organization: any) { 
    let data;
    let newArray = [];

    // console.log(this.partnersData[49])
    if (organization)
      partners = partners.filter((d: any) => d.code == organization.code);
    partners = partners.sort((a: any, b: any) => a?.acronym?.toLowerCase().localeCompare(b?.acronym?.toLowerCase()))
    partners.forEach((partner: any) => {
      const partnersWp = [];
      // const cross = this.partnersData[partner.code]['CROSS'] || [];
      // const melia = this.partnersData[partner.code]['CROSS-melia'] || [];
      // const crossCutting = this.partnersData[partner.code]['CROSS-Cross-Cutting'] || [];

      // // Merge all into CROSS
      // this.partnersData[partner.code]['CROSS'] = [...cross, ...melia, ...crossCutting];
      wps.forEach((wp: any) => {
       
        data = (this.partnersData[partner.code][wp?.ost_wp?.wp_official_code] || [])?.map(
          (d: any) => {
            let obj: any = {};
            obj['id'] = d.id;
            obj['WP_Results'] = d?.initiativeMelia?.meliaType?.name
              ? d?.initiativeMelia?.meliaType?.name
              : d?.ipsr?.id
                ? d?.ipsr.title + ' (' + d.value + ')'
                : d.title || d.name;
            obj['Type'] = this.getCategory(d.category);
            indicatorTypes.forEach((indicator: any) => {
              obj[indicator] =
                this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code]?.[obj.id]?.[indicator] ?? '';
            });
            obj['Melias'] = '';

            // obj['Percentage'] = this.toggleValues[partner.code][
            //   wp.ost_wp.wp_official_code
            // ]
            //   ? this.values[partner.code][wp.ost_wp.wp_official_code][d.id]
            //   : this.displayValues[partner.code][wp.ost_wp.wp_official_code][
            //   d.id
            //   ] + '%';
            obj['Percentage'] = '';

            // if(d.category == 'WP') {
              obj['Budget'] = this.formatWithThousandsSeparator(this.roundNumber(this.toggleValues[partner.code][
                wp.ost_wp.wp_official_code
              ]))
                ? this.formatWithThousandsSeparator(this.roundNumber(this.budgetValues[partner.code][wp.ost_wp.wp_official_code][
                  d.id
                ]))
                : this.formatWithThousandsSeparator(this.roundNumber(this.displayBudgetValues[partner.code][
                  wp.ost_wp.wp_official_code
                ][d.id]));
            // }
            //  else if(d.category == 'MELIA Studies') {
            //   obj['Budget'] = this.formatWithThousandsSeparator(this.roundNumber(this.toggleValues[partner.code][
            //     wp.ost_wp.wp_official_code + '-melia'
            //   ]))
            //     ? this.formatWithThousandsSeparator(this.roundNumber(this.budgetValues[partner.code][wp.ost_wp.wp_official_code+ '-melia'][
            //       d.id
            //     ]))
            //     : this.formatWithThousandsSeparator(this.roundNumber(this.displayBudgetValues[partner.code][
            //       wp.ost_wp.wp_official_code+ '-melia'
            //     ][d.id]));
            // } else if(d.category == 'Cross-Cutting') {
            //   obj['Budget'] = this.formatWithThousandsSeparator(this.roundNumber(this.toggleValues[partner.code][
            //     wp.ost_wp.wp_official_code + '-Cross-Cutting'
            //   ]))
            //     ? this.formatWithThousandsSeparator(this.roundNumber(this.budgetValues[partner.code][wp.ost_wp.wp_official_code+ '-Cross-Cutting'][
            //       d.id
            //     ]))
            //     : this.formatWithThousandsSeparator(this.roundNumber(this.displayBudgetValues[partner.code][
            //       wp.ost_wp.wp_official_code+ '-Cross-Cutting'
            //     ][d.id]));
            // }
            
            return obj;
          },
        );

        let obj = {};

        obj['WP_Results'] = 'Subtotal';
        obj['Type'] = '';
        indicatorTypes.forEach((indicator: any) => {
          obj[indicator] = wp.category == 'WP' ? this.getTotalIndValues(this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code], indicator) : '';
        });
        obj['Melias'] = '';

        // obj['Percentage'] = this.toggleValues[partner.code][
        //   wp.ost_wp.wp_official_code
        // ]
        //   ? this.totals[partner.code][wp.ost_wp.wp_official_code]
        //   : this.roundNumber(
        //     this.totals[partner.code][wp.ost_wp.wp_official_code],
        //   ) + '%';
        obj['Percentage'] = '';

        obj['Budget'] =
          this.formatWithThousandsSeparator(this.roundNumber(this.wp_budgets[partner.code][wp.ost_wp.wp_official_code]));

        data?.push(obj);
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
  totalTargetsIndicator: any = {};
  summaryBudgetsIndicator: any = {};
  budgetValuesIndicatorPartner: any = {};
  totalBudgetValuesIndicatorPartner: any = {};

  summaryBudgetsTotal: any = {};
  summaryBudgetsAllTotal: any = 0;
  summaryBudgetsProjectsTotal: any = 0;
  wp_budgets: any = {};
  anaplanBudgets: any = {};
  anaplanLabels: any[] = [];
  anaplanValues: any[] = [];
  budgetValues: any = {};
  displayBudgetValues: any = {};
  toggleValues: any = {};
  toggleSummaryValues: any = {};
  errors: any = {};
  period: Array<any> = [];

  perValues: any = {};
  perValuesSammary: any = {};
  perValuesSammaryForPartner: any = {};
  perAllValues: any = {};
  perAllValuesIndicator: any = {};
  indicatorTypes: Array<any> = [];
  indicatorTypesTitles: Array<any> = [];
  highLevelOutputIndicatorTypes: Array<any> = [];
  outcomeIndicatorTypes: Array<any> = [];
  sammaryTotal: any = {};
  sammaryTotalConsolidated: any = {};
  results: any;
  loading = false;
  params: any;
  ipsr_value_data: any;
  getHeaderGeoAndPartner(submission, title, initiative, type) {
    const main =
    submission
      ? `${submission.initiative.official_code} - ${submission.initiative.name}`
      : `${initiative.official_code} - ${initiative.name}`;

    const white = { color: { rgb: 'ffffff' } };
    const centerWrap = { horizontal: 'center', vertical: 'center', wrapText: true };

    const blk   = { fill: { fgColor: { rgb: '04030f' } }, font: white, alignment: centerWrap };
    const dark  = { fill: { fgColor: { rgb: '2a2e45' } }, font: white, alignment: centerWrap };
    const light = { fill: { fgColor: { rgb: '3d425e' } }, font: white, alignment: centerWrap };

    if(type == 'partner') {
      return [
        [{ v: main,  s: blk }, null, null, null, null, null, null],
  
        [{ v: title, s: dark }, null, null, null, null, null, null],
  
        [
          { v: 'Partner',                                    s: light }, null, 
          { v: 'Type',                                               s: light }, 
          { v: 'High Level Output',                                  s: light }, 
          { v: 'Centers',     s: light } 
        ],
  
        [null, null, null, null, null, null, null],
      ];
    } else {
      return [
        [{ v: main,  s: blk }, null, null, null, null, null, null],
  
        [{ v: title, s: dark }, null, null, null, null, null, null],
  
        [
          { v: 'Scope',                                    s: light }, null, 
          { v: 'Type',                                               s: light }, 
          { v: 'High Level Output',                                  s: light }, 
          { v: 'Centers',     s: light } 
        ],
  
        [null, null, null, null, null, null, null],
      ];
    }
 
  }


  getHeader(submission, title, initiative) { 
    let period_ = [];
    this.indicatorTypesTitles.forEach((period) => {
      period_.push({
        v: period,
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
        ...this.indicatorTypesTitles.map((d, index) => {
          if (index == 0)
            return {
              v: '2026',
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
        ...this.indicatorTypesTitles.map((d, index) => {
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
        ...this.indicatorTypesTitles.map((d, index) => {
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
          v: 'W3 Baratialar Project (USD)',
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
          v: 'Pooled Funded (USD)',
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
  submission_data: any;
  InitiativeId: any;
  GeographicScopeWp:any;
  partnersWp: any;
  budgetValuesIndicatorSummary: any = {};
  totalBudgetValuesIndicatorSummary: any = {};
  summaryBudgetsPartnerTotal: any = 0;
  summaryBudgetsMeliaTotal: any = 0;
  savedValuesForIndicator: any = null;
  displayBudgetValuesIndicator: any = {};
  displayBudgetValuesItemIndicator: any = {};
  totalTargetsIndicatorPartners: any = {};
  totalConsolidatedTargetPartner: any;

  async generateExcel(submissionId: any, initId: any, tocData: any, organization: any, showGeographicScope: boolean,res: Response, anaplan: boolean, zip: boolean) { 
    this.perValues = {};
    this.perValuesSammary = {};
    this.perValuesSammaryForPartner = {};
    this.perAllValues = {};
    this.sammaryTotal = {};
    this.sammaryTotalConsolidated = {};
    this.data = [];
    this.wps = [];
    this.GeographicScopeWp = [];
    this.partnersWp = [];
    this.actualWps = [];
    this.wpsTotalSum = 0;
    this.partnersData = {};
    this.sammary = {};
    this.summaryBudgets = {};
    this.totalTargetsIndicator = {};
    this.totalTargetsIndicatorPartners = {};
    this.budgetValuesIndicatorSummary = {};
    this.displayBudgetValuesIndicator = {};
    this.displayBudgetValuesItemIndicator = {};
    this.summaryBudgetsIndicator = {};
    this.budgetValuesIndicatorPartner = {};
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

    // let melia_data;
    let cross_data;

    let partners;

    this.InitiativeId = initId;
    let submission: any = null;
    if (submissionId != null) {
      submission = await this.findSubmissionsById(submissionId);
      this.submission_data = submission;
      this.results = submission.toc_data.results;
      this.period = submission.phase.periods;
      this.wp_budgets = await this.getSubmissionBudgets(submissionId, submission.phase.id);

      this.initiative_data = await this.initService.findOne(submission.initiative_id);
      cross_data = await this.CrossCuttingService.findBySubmissionID(
        submissionId
      );
      this.anaplanLabels = await this.anaplanService.findAll();

      if(!this.initiative_data.synchronized)
        this.ipsr_value_data = await this.IpsrValueService.findBySubmissionId(
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
      partners = await this.PhasesService.fetchAssignedOrganizations(this.phase.id, initId);
      if (partners.length < 1) {
        partners = await this.organizationRepository.find();
      }

      this.initiative_data = await this.initService.findOne(initId);

      this.period = await this.periodService.findByPhaseId(this.phase.id);

      this.anaplanLabels = await this.anaplanService.findAll();
      this.results = await tocData.results;


      if(!this.initiative_data.synchronized)
        this.ipsr_value_data = await this.IpsrValueService.findByInitiativeID(initId);

      cross_data = await this.CrossCuttingService.findByInitiativeID(initId)

      this.wp_budgets = await this.getWpsBudgets(initId, this.phase.id);

    }
    this.indicatorTypesTitles = [
      'Policy Change',
      'Innovation Use',
      'Other Outcomes',
      'knowledge products',
      'Innovation Development)',
      'Capacity Sharing',
      'Others outputs',
      'Melias'
    ];

    this.indicatorTypes = [
      'Number of Policy (Policy Change)',
      'Innovation Use',
      'custom-OUTCOME',
      'Number of knowledge products',
      'Number of innovations (innovation development)',
      'Number of people trained (capacity sharing for development)',
      'custom-OUTPUT'
    ];

    this.highLevelOutputIndicatorTypes = [
      'Number of knowledge products',
      'Number of innovations (innovation development)',
      'Number of people trained (capacity sharing for development)',
      'custom-OUTPUT'
    ];
    this.outcomeIndicatorTypes = [
      'Number of Policy (Policy Change)',
      'Innovation Use',
      'custom-OUTCOME'
    ];

    cross_data.map((d: any) => {
      d['category'] = 'Cross Cutting';
      d['wp_id'] = 'CROSS';
      return d;
    });

          
    if(!this.initiative_data.synchronized){
      this.ipsr_value_data.map((d: any) => {
        d['category'] = 'IPSR';
        d['wp_id'] = 'IPSR';
        return d;
      });
    }
    
    if(!this.initiative_data.synchronized)
      this.results = [
        ...cross_data,
        ...this.ipsr_value_data,
        ...this?.results,
      ];
    else
      this.results = [
        ...cross_data,
        ...this?.results,
      ];

    this.wps = this.results
      .filter((d: any) => {
        if (d.category == "WP")
          d.title = d.ost_wp.acronym + ": " + d.ost_wp.name;
        return d.category == "WP" && !d.group;
      }).sort((a: any, b: any) => a.title.localeCompare(b.title));
      const isCrosscuttingAndManagementValid = this.wps.some((wp: any) => wp.ost_wp?.acronym == "AOW00");
      
      if(!isCrosscuttingAndManagementValid && this.initiative_data.synchronized) {
        this.wps.unshift({
          id: "CROSS",
          title: "AOW00: Cross-Cutting and Management",
          category: "WP",
          ost_wp: { wp_official_code: "CROSS", acronym: "AOW00" },
        });
      } else {
        const wpToUpdate = this.wps.find(
          (wp: any) => wp.ost_wp?.acronym === "AOW00"
        );
        if (wpToUpdate) {
          wpToUpdate.ost_wp.wp_official_code = "CROSS";
        }
      }
      this.actualWps = this.wps;
      if(!this.initiative_data.synchronized)
        this.wps.unshift({
          id: 'CROSS',
          title: 'Cross Cutting',
          category: 'Cross Cutting',
          ost_wp: { wp_official_code: 'CROSS' },
        });
      if(!this.initiative_data.synchronized)
        this.wps.push({
          id: 'IPSR',
          title: 'Innovation packages & Scalling Readiness',
          category: 'IPSR',
          ost_wp: { wp_official_code: 'IPSR' },
        });
        let melias = [];
        if(this.initiative_data.synchronized){
          for (let wp of this.wps) {
            melias.push({
              id: wp.id,
              title: wp.ost_wp.wp_official_code + '-melia',
              category: "melia",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-melia', acronym: wp.ost_wp.wp_official_code },
            });
          }
        }
        let crossCutting = [];
        if(this.initiative_data.synchronized){
          for (let wp of this.wps) {
            crossCutting.push({
              id: 'Cross-Cutting', 
              title: wp.ost_wp.wp_official_code + '-Cross-Cutting',
              category: "Cross Cutting",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-Cross-Cutting' },
            });
          }
        }
        let w3Projects = [];
        if(this.initiative_data.synchronized){
          
          for (let wp of this.wps) {
            w3Projects.push({
              id: wp.id, // actual wp id 
              title: wp.ost_wp.wp_official_code + '-project',
              category: "Projects",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-project' },
            });
          }
        }

        let geographicScope = [];
        let partnersWps = [];

        if(this.initiative_data.synchronized){
          for (let wp of this.actualWps) {
            geographicScope.push({
              id: wp.id,
              title: wp.ost_wp.wp_official_code + "-Geographic Scope",
              category: "Geographic-Scope",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-Geographic-Scope" },
            });

            partnersWps.push({
              id: wp.id,
              title: wp.ost_wp.wp_official_code + "-partners",
              category: "partners",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-partners" },
            });
          }
        }

        let synergyPrograms = [];
        if(this.initiative_data.synchronized){
          
          for (let wp of this.actualWps) {
            synergyPrograms.push({
              id: wp.id,
              title: wp.ost_wp.wp_official_code + "-synergy-programs",
              category: "synergy-programs",
              ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-synergy-programs" },
            });
          }
        }

        this.wps = [...this.wps, ... melias, ...crossCutting, ...w3Projects ,...geographicScope, ...partnersWps, ...synergyPrograms];

    if (partners.length < 1)
      partners = await this.organizationRepository.find();

    for (let partner of partners) {
      if (!this.budgetValues[partner.code])
        this.budgetValues[partner.code] = {};
      if (!this.anaplanBudgets[partner.code]) {
        this.anaplanBudgets[partner.code] = {};
      }
      if (!this.displayBudgetValuesItemIndicator[partner.code])
        this.displayBudgetValuesItemIndicator[partner.code] = {};
      if (!this.displayBudgetValuesIndicator[partner.code])
        this.displayBudgetValuesIndicator[partner.code] = {};
      if (!this.budgetValuesIndicatorPartner[partner.code])
        this.budgetValuesIndicatorPartner[partner.code] = {};
      if (!this.displayBudgetValues[partner.code])
        this.displayBudgetValues[partner.code] = {};
      if (!this.noValuesAssigned[partner.code])
        this.noValuesAssigned[partner.code] = {};
      for (let wp of this.wps) {
        // console.log(wp)
        if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
        if (!this.wp_budgets[partner.code][wp.ost_wp.wp_official_code])
          this.wp_budgets[partner.code][wp.ost_wp.wp_official_code] = null;

        if (!this.toggleValues[partner.code])
          this.toggleValues[partner.code] = {};

        if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code]) {
          this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code] = {};
        }
        if (!this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code] =
            {};
        if (!this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code] = {};
        if (!this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code] = {};
        for(let type of this.highLevelOutputIndicatorTypes) {
          if (!this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code][type])
            this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code] = 0;
        }
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
        if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code])
          this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;

        const result = await this.getDataForWp(
          wp.id,
          partner.code,
          wp.ost_wp.wp_official_code,
          wp.ost_wp.acronym,
          wp.category
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


        if (!this.perValuesSammaryForPartner[partner.code])
          this.perValuesSammaryForPartner[partner.code] = {};
        if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code])
          this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code] = {};
        this.period.forEach((element) => {
          if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id] =
              false;
        });

        this.anaplanLabels.forEach((element) => {
          if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id] =
              0;
        });

        result.forEach((item: any) => {
          if (item.category !== "OUTPUT") {
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
        } else if(item.category === "OUTPUT") {
            this.checkForOutput(
              this.values,
              partner.code,
              wp.ost_wp.wp_official_code,
              item
            );
            this.checkForOutput(
              this.displayValues,
              partner.code,
              wp.ost_wp.wp_official_code,
              item
            );
          }

          this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
            null;

          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          if(item.category == 'OUTPUT'){
            this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code][
              item.id
            ] = {};
            for(let indicator of item.quantitative_indicators) {
              this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code][item.id][indicator.id] = null;
            }
          }
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = false;

          if (!this.summaryBudgets[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgets[wp.ost_wp.wp_official_code][item.id] = 0;
          if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id] = {};
          if (item.category === 'OUTPUT') {
            for (let indicator of item.quantitative_indicators) {
              if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id][indicator.id]) {
                this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id][indicator.id] = 0;
              }
            }
          }
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

            if (!this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code])
              this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code] = 0;
          });
        });
      }

      if(!this.initiative_data.synchronized)
        if (this.partnersData[partner.code]?.IPSR)
          this.partnersData[partner.code].IPSR = this.partnersData[
            partner.code
          ]?.IPSR?.filter((d: any) => d.value != null && d.value != "").sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));

          if(!this.initiative_data.synchronized){
            let newCrossCenters = this.partnersData[partner.code]?.CROSS?.filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
           if(this.partnersData[partner.code]?.CROSS)
             this.partnersData[partner.code].CROSS = this.partnersData[partner.code]?.CROSS?.filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
           newCrossCenters?.forEach((d: any) => this.partnersData[partner.code].CROSS.unshift(d))
         }

      this.wps.forEach((d: any) => {
        if (d.category == "WP") {
          let outputData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
            .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

          let outcomeData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
            .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

          this.partnersData[partner.code][d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
        }
      })
    }

    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code] = await this.getDataForWp(
        wp.id,
        null,
        wp.ost_wp.wp_official_code,
        wp.ost_wp.acronym,
        wp.category
      );
    }
    
    if (submissionId != null) {
      this.setvalues(
        submission.consolidated.values,
        submission.consolidated.perValues,
      );
      this.savedValuesForIndicator = await this.getSavedIndicatorForVersion(
        this.initiative_data.id,
        this.submission_data.phase.id,
        submissionId
      );
      this.setvaluesForIndicators(this.savedValuesForIndicator, 1);
      this.setPartnervaluesForIndicators(this.savedValuesForIndicator, 1);
  
      await this.setAnaplanValuesVersion(submissionId);
    } else {
      this.setvaluesCurrent(
        this.savedValues.values,
        this.savedValues.perValues,
        this.savedValues.no_budget
      );
      this.savedValuesForIndicator = await this.getSavedIndicator(
        this.initiative_data.id,
        this.phase.id
      );
      this.setvaluesForIndicators(this.savedValuesForIndicator, 1);
      this.setPartnervaluesForIndicators(this.savedValuesForIndicator, 1);
  
      await this.setAnaplanValues();
    }
  

    this.setTotalTargetForIndicators();
    // if(!submissionId)
      this.setTotalTargetForIndicatorsForPartners()
    this.setItemIndicatorAndBudget();
    this.sammaryCalc();
    this.getTotalIndValuesByPartner(this.totalTargetsIndicatorPartners);

    const firstKey = Object.keys(this.allData)[0];
    //sort first AOW
      const newCROSS = this.allData[firstKey].filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
      this.allData[firstKey] = this.allData[firstKey].filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
      newCROSS.forEach((d: any) => this.allData[firstKey].unshift(d))
    

    if(!this.initiative_data.synchronized){
      const newIPSR = this.allData["IPSR"]
        .filter((d: any) => d.value != "")
        .sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
      this.allData["IPSR"] = newIPSR;
    }

    //sort WP titles
    this.wps.forEach((d: any) => {
      if (d.category == "WP") {
        let outputData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
          .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

        let outcomeData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
          .sort((a: any, b: any) => a?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()));

        this.allData[d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
      }
    })

    // if (!this.allData["IPSR"].length) {
    //   delete this.allData["IPSR"]
    //   this.wps = this.wps.filter(d => d.id != 'IPSR')
    // }

    this.GeographicScopeWp = this.wps.filter((d: any) => d.category == 'Geographic-Scope');
    this.partnersWp = this.wps.filter((d: any) => d.category == 'partners');

    let file_name = 'Planning';

    var wb = XLSX.utils.book_new();



  if(organization && !anaplan && !zip && !submissionId){
  //  center Consolidated
  const centerConsolidated = this.generateExcelCenterConsolidated(organization.code);
  XLSX.utils.book_append_sheet(wb, centerConsolidated, 'Summary');


  // cenert Cross-Cutting
  const centerCross = this.generateExcelCenterCrossCutting(organization.code);
  XLSX.utils.book_append_sheet(wb, centerCross, 'Cross-Cutting');


  // HLO for center
  const centerHighLevelOutput =  await this.generateExcelCenterHLO(organization.code);
  XLSX.utils.book_append_sheet(wb, centerHighLevelOutput, 'HLO');

  // Partners for centers
  const partnersCenterSheet = this.generateExcelCenterPartner(organization.code);
  XLSX.utils.book_append_sheet(wb, partnersCenterSheet, 'Partner');


  const data = await this.getActualTocs(this.initiative_data.official_code);

  if(data.projects.length) {
    const projectSheet = await this.generateExcelProject(data.projects, organization, 'project');
    XLSX.utils.book_append_sheet(wb, projectSheet, 'W3-Bilateral projects');
  }
  
  if(data.melias.length) {
    const meliaSheet = await this.generateExcelProject(data.melias, organization, 'melia');
    XLSX.utils.book_append_sheet(wb, meliaSheet, 'MELIA');
  }

  const anaplanSheet = this.generateExcelAnaplan(organization);
  XLSX.utils.book_append_sheet(wb, anaplanSheet, 'Anaplan');



  } else  if(!organization && !anaplan && !zip && !submissionId){
      //  summary Consolidated
      const summaryConsolidated = this.generateExcelSummaryConsolidated();
      XLSX.utils.book_append_sheet(wb, summaryConsolidated, 'Summary');

      // HLO for summary
      const summaryHighLevelOutput = this.generateExcelSummaryHLO();
      XLSX.utils.book_append_sheet(wb, summaryHighLevelOutput, 'HLO');


      // Outcome for summary
      const summaryOutcome = this.generateExcelSummaryOutcome();
      XLSX.utils.book_append_sheet(wb, summaryOutcome, 'Outcome');

      // melia for summary
      const summaryMelia = this.generateExcelSummaryMelia();
      XLSX.utils.book_append_sheet(wb, summaryMelia, 'MELIA');

      // project for summary
      const summaryProject = this.generateExcelSummaryProject();
      XLSX.utils.book_append_sheet(wb, summaryProject, 'W3-Bilateral projects');

      // summary Cross-Cutting
      const summaryCross = this.generateExcelSummaryCrossCutting();
      XLSX.utils.book_append_sheet(wb, summaryCross, 'Cross-Cutting');


      // synergy programs for summary
      const synergyProgramsSheet = this.generateExcelSummarySynergyPrograms();
      XLSX.utils.book_append_sheet(wb, synergyProgramsSheet, 'Synergy programs');

      // Partners for summary
      const partnersSummarySheet = this.generateExcelSummaryPartner();
      XLSX.utils.book_append_sheet(wb, partnersSummarySheet, 'Partner');

      const anaplanSummarySheet = this.generateExcelSummaryAnaplan();
      XLSX.utils.book_append_sheet(wb, anaplanSummarySheet, 'Anaplan');
  
  } else if(organization && anaplan && !zip && !submissionId) {
    const anaplanSheet = this.generateExcelAnaplan(organization);
    XLSX.utils.book_append_sheet(wb, anaplanSheet, 'Anaplan');
  } else if(!organization && anaplan && !zip && !submissionId) {
    const anaplanSummarySheet = this.generateExcelSummaryAnaplan();
    XLSX.utils.book_append_sheet(wb, anaplanSummarySheet, 'Anaplan');
  } 
  else if(submissionId && !organization && !zip) {
    //  summary Consolidated
    const summaryConsolidated = this.generateExcelSummaryConsolidated();
    XLSX.utils.book_append_sheet(wb, summaryConsolidated, 'Summary');

    // HLO for summary
    const summaryHighLevelOutput = this.generateExcelSummaryHLO();
    XLSX.utils.book_append_sheet(wb, summaryHighLevelOutput, 'HLO');


    // Outcome for summary
    const summaryOutcome = this.generateExcelSummaryOutcome();
    XLSX.utils.book_append_sheet(wb, summaryOutcome, 'Outcome');

    // melia for summary
    const summaryMelia = this.generateExcelSummaryMelia();
    XLSX.utils.book_append_sheet(wb, summaryMelia, 'Melia');

    // project for summary
    const summaryProject = this.generateExcelSummaryProject();
    XLSX.utils.book_append_sheet(wb, summaryProject, 'Project');

    // summary Cross-Cutting
    const summaryCross = this.generateExcelSummaryCrossCutting();
    XLSX.utils.book_append_sheet(wb, summaryCross, 'Cross-Cutting');


    // synergy programs for summary
    const synergyProgramsSheet = this.generateExcelSummarySynergyPrograms();
    XLSX.utils.book_append_sheet(wb, synergyProgramsSheet, 'Synergy programs');

    // Partners for summary
    const partnersSummarySheet = this.generateExcelSummaryPartner();
    XLSX.utils.book_append_sheet(wb, partnersSummarySheet, 'Partner');

    const anaplanSummarySheet = this.generateExcelSummaryAnaplan();
    XLSX.utils.book_append_sheet(wb, anaplanSummarySheet, 'Anaplan');
} 
  else if(submissionId && !organization && zip) {

        //  summary Consolidated
        const summaryConsolidated = this.generateExcelSummaryConsolidated();
        XLSX.utils.book_append_sheet(wb, summaryConsolidated, 'Summary');
  
        // HLO for summary
        const summaryHighLevelOutput = this.generateExcelSummaryHLO();
        XLSX.utils.book_append_sheet(wb, summaryHighLevelOutput, 'HLO');
  
  
        // Outcome for summary
        const summaryOutcome = this.generateExcelSummaryOutcome();
        XLSX.utils.book_append_sheet(wb, summaryOutcome, 'Outcome');
  
        // melia for summary
        const summaryMelia = this.generateExcelSummaryMelia();
        XLSX.utils.book_append_sheet(wb, summaryMelia, 'MELIA');
  
        // project for summary
        const summaryProject = this.generateExcelSummaryProject();
        XLSX.utils.book_append_sheet(wb, summaryProject, 'W3-Bilateral projects');
  
        // summary Cross-Cutting
        const summaryCross = this.generateExcelSummaryCrossCutting();
        XLSX.utils.book_append_sheet(wb, summaryCross, 'Cross-Cutting');
  
  
        // synergy programs for summary
        const synergyProgramsSheet = this.generateExcelSummarySynergyPrograms();
        XLSX.utils.book_append_sheet(wb, synergyProgramsSheet, 'Synergy programs');
  
        // Partners for summary
        const partnersSummarySheet = this.generateExcelSummaryPartner();
        XLSX.utils.book_append_sheet(wb, partnersSummarySheet, 'Partner');
  
        const anaplanSummarySheet = this.generateExcelSummaryAnaplan();
        XLSX.utils.book_append_sheet(wb, anaplanSummarySheet, 'Anaplan');
  } else if(submissionId && organization && zip) {

    //  center Consolidated
  const centerConsolidated = this.generateExcelCenterConsolidated(organization.code);
  XLSX.utils.book_append_sheet(wb, centerConsolidated, 'Summary');


  // cenert Cross-Cutting
  const centerCross = this.generateExcelCenterCrossCutting(organization.code);
  XLSX.utils.book_append_sheet(wb, centerCross, 'Cross-Cutting');


  // HLO for center
  const centerHighLevelOutput =  await this.generateExcelCenterHLO(organization.code);
  XLSX.utils.book_append_sheet(wb, centerHighLevelOutput, 'HLO');

  // Partners for centers
  const partnersCenterSheet = this.generateExcelCenterPartner(organization.code);
  XLSX.utils.book_append_sheet(wb, partnersCenterSheet, 'Partner');


  // const data = await this.getActualTocs(this.initiative_data.official_code);

  if(this.submission_data.toc_data?.extra?.projects) {
    const projectSheet = await this.generateExcelProject(this.submission_data.toc_data?.extra?.projects, organization, 'project');
    XLSX.utils.book_append_sheet(wb, projectSheet, 'Project');
  }
  
  if(this.submission_data.toc_data?.extra?.melias) {
    const meliaSheet = await this.generateExcelProject(this.submission_data.toc_data?.extra?.melias, organization, 'melia');
    XLSX.utils.book_append_sheet(wb, meliaSheet, 'Melia');
  }

  const anaplanSheet = this.generateExcelAnaplan(organization);
  XLSX.utils.book_append_sheet(wb, anaplanSheet, 'Anaplan');

}
    (wb.Workbook as any) = { fullCalcOnLoad: 1 }; // <calcPr fullCalcOnLoad="1"/>
    if(organization)
      file_name =  organization?.acronym? file_name+`_${this.initiative_data?.official_code}_${organization.acronym}` : file_name+ '_'+ this.initiative_data?.official_code;
    else 
      file_name = file_name +'_'+ this.initiative_data?.official_code

    await XLSX.writeFile(
      wb,
      join(process.cwd(), 'generated_files', `${file_name}.xlsx`),
      { cellStyles: true },
    );
    const file = createReadStream(
      join(process.cwd(), 'generated_files', `${file_name}.xlsx`),
    );

    setTimeout(async () => {
      try {
        unlink(join(process.cwd(), 'generated_files', `${file_name}.xlsx`), null);
      } catch (e) { }
    }, 9000);
    if(!zip) {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file_name}.xlsx"`,
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Disposition',
      );  
    }
        
    return new StreamableFile(file);

    // return {
    //   ConsolidatedData: ConsolidatedData,
    //   summary_data: allData,
    //   lockupArray: lockupArray,
    //   partners: partnersData,
    //   wps: this.wps
    // };

  }

  wpsTotalSum = 0;
  sammaryCalc() {
    let totalsum: any = {};
    let totalsumcenter: any = {};
    let totalWp: any = {};
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};
    this.summaryBudgetsIndicator = {};

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

    Object.keys(this.displayBudgetValuesIndicator).forEach((partner_code) => {
      Object.keys(this.displayBudgetValuesIndicator[partner_code]).forEach((wp_id) => {
        if (!this.summaryBudgetsIndicator[wp_id]) {
          this.summaryBudgetsIndicator[wp_id] = {};
        }
    
        Object.keys(this.displayBudgetValuesIndicator[partner_code][wp_id]).forEach((item_id) => {
          if (!this.summaryBudgetsIndicator[wp_id][item_id]) {
            this.summaryBudgetsIndicator[wp_id][item_id] = {};
          }
    
          Object.keys(this.displayBudgetValuesIndicator[partner_code][wp_id][item_id]).forEach((indicator_id) => {
            if (this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] == null) {
              this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] = 0;
            }
    
            const raw = this.displayBudgetValuesIndicator[partner_code][wp_id][item_id][indicator_id];
            const value = Number(raw) || 0;
    
            this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] += value;
          });
        });
      });
    });



    this.summaryBudgetsProjectsTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-project'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsAllTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => !key.includes('-project'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsPartnerTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-partners'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsMeliaTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-melia'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

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
    this.sammaryTotalConsolidated["CROSS"] = 0;
    this.sammaryTotalConsolidated["IPSR"] = 0;
    Object.keys(this.sammary).forEach((wp_id) => {
      this.sammaryTotal[wp_id] = 0;
      this.sammaryTotalConsolidated[wp_id] = 0;
      Object.keys(this.sammary[wp_id]).forEach((item_id) => {
        this.sammaryTotal[wp_id] += totalWp[wp_id][item_id];
        this.sammaryTotalConsolidated[wp_id] = this.summaryBudgetsAllTotal ? this.roundNumber(this.summaryBudgetsTotal[wp_id] / this.summaryBudgetsAllTotal * 100) : 0;
      });
    });
    this.wpsTotalSum = 0;
    Object.keys(this.sammaryTotal).forEach((wp_id) => {
      this.wpsTotalSum += this.sammaryTotalConsolidated[wp_id];
    });
    // this.wpsTotalSum = this.wpsTotalSum / Object.keys(this.sammaryTotal).length;
  }

  allvalueChange() {
    for (let wp of this.wps) {
      if(this.allData[wp.ost_wp.wp_official_code]) {
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
    }

    for (let wp of this.wps) {
      if(wp.category == 'WP')
        if(this.allData[wp.ost_wp.wp_official_code]) {
          this.allData[wp.ost_wp.wp_official_code].forEach((item: any) => {
            this.indicatorTypes.forEach((type) => {
              if (!this.perAllValuesIndicator[wp.ost_wp.wp_official_code])
                this.perAllValuesIndicator[wp.ost_wp.wp_official_code] = {};
              if (!this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id])
                this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id] = {};
              this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id][type] =
                0;
            });
          });
        }

    }

    this.wps.forEach((wp: any) => {
      this.period.forEach((per) => {
        this.perValuesSammary[wp.ost_wp.wp_official_code][per.id] = false;
      });
    });

    this.partners.forEach((partner: any) => {
      this.wps.forEach((wp: any) => {
        this.period.forEach((per) => {
          this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][per.id] = false;
        });
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

              if (this.perValues[partner_code][wp_id][item_id][per_id] == true) {
                this.perValuesSammary[wp_id][per_id] = true;
                this.perValuesSammaryForPartner[partner_code][wp_id][per_id] = true;
              }
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
  checkForOutput(values: any, code: string, id: number, item: any) {
    if (!values[code]) {
      values[code] = {};
      this.totals[code] = {};
      this.errors[code] = {};
    }
  
    if (!values[code][id]) {
      values[code][id] = {};
      this.totals[code][id] = 0;
      this.errors[code][id] = null;
    }
  
    if (!values[code][id][item.id]) {
      values[code][id][item.id] = {};
    }
  
    for (let indicator of item.quantitative_indicators) {
      if (!values[code][id][item.id][indicator.id]) {

        values[code][id][item.id][indicator.id] = 0;
      }
    }
    return true;
  }
  checkEOI(category: any) {
    if (this.InitiativeId == null)
      return this.submission_data.phase?.show_eoi ? category == "EOI" : false;
    else
      return this.phase?.show_eoi ? category == "EOI" : false;
  }

  // async getDataForWp(
  //   id: string,
  //   partner_code: any | null = null,
  //   official_code: any = null,
  //   ost_wp_acronym: string,
  //   wp_category: string
  // ) {
  //   let wp_data;
  //   if(wp_category != 'Projects' && wp_category != 'Geographic-Scope' && wp_category != 'partners') {
  //     wp_data = this.results.filter((d: any) => {
  //       if (partner_code)
  //         return (
  //           (d.category == "OUTPUT" ||
  //             d.category == "OUTCOME" ||
  //             this.checkEOI(d.category) ||
  //             d.category == "Cross Cutting" ||
  //             d.category == "IPSR" ||
  //             d.category == "Melia"
  //           ) &&
  //           (d.group == id ||
  //             (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects') ||
  //             // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
  //             ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
  //             d.wp_id == official_code ||
  //             (official_code == "CROSS" && this.checkEOI(d.category))
  //           )
  //         );
  //       else
  //         return (
  //           ((d.category == "OUTPUT" ||
  //             d.category == "OUTCOME" ||
  //             this.checkEOI(d.category) ||
  //             d.category == "Cross Cutting" ||
  //             d.category == "IPSR" ||
  //             d.category == "Melia" 
  //           ) &&
  //             (d.group == id || (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects')  ||
  //             // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
  //             ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
  //               d.wp_id == official_code)) ||
  //           (official_code == "CROSS" && this.checkEOI(d.category))
  //         );
  //     });
  //   }  else if(wp_category == 'Projects') {
  //     wp_data = this.results.filter((d: any) => {
  //       if (partner_code)
  //         return (
  //           (d.category == "Project") &&
  //           (
  //             (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects')
  //           )
  //         );
  //       else
  //       return (
  //         (d.category == "Project") &&
  //         (
  //           (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects')
  //         )
  //       );
  //     });
  //   } else if(wp_category == 'Geographic-Scope') {
  //     wp_data = this.results.filter((d: any) => {
  //       if (partner_code)
  //         return (
  //           (d.category == "Geographic-Scope") &&
  //           (
  //             (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
  //           )
  //         );
  //       else
  //       return (
  //         (d.category == "Geographic-Scope") &&
  //         (
  //           (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
  //         )
  //       );
  //     });
  //   } else if(wp_category == 'partners') {
  //     wp_data = this.results.filter((d: any) => {
  //       if (partner_code)
  //         return (
  //           (d.category == "partners") &&
  //           (
  //             (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
  //           )
  //         );
  //       else
  //       return (
  //         (d.category == "partners") &&
  //         (
  //           (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
  //         )
  //       );
  //     });
  //   }
 
  //   if (ost_wp_acronym === 'AOW00') {
  //     const meliaMap = new Map<string, any>();
  //     const nonMeliaItems: any[] = [];
    
  //     for (const item of wp_data) {
  //       if (item.category !== 'Melia') {
  //         nonMeliaItems.push(item);
  //         continue;
  //       }
    
  //       const key = `${item.id}`;
    
  //       if (!meliaMap.has(key)) {
  //         meliaMap.set(key, {
  //           ...item,
  //           results: item.results ?? '',
  //         });
  //       } else {
  //         const existing = meliaMap.get(key);
  //         if (item.results && !existing.results.includes(item.results)) {
  //           existing.results += `, ${item.results}`;
  //         }
  //       }
  //     }
    
  //     wp_data = [...nonMeliaItems, ...Array.from(meliaMap.values())];
  //   }
    


  //   wp_data.sort(this.compare);

  //   return wp_data;
  // }
  async getDataForWp(
    id: string,
    partner_code: any | null = null,
    official_code: any = null,
    ost_wp_acronym: string,
    wp_category: string
  ) {
    let wp_data;
    if(wp_category != 'Projects' && wp_category != 'Geographic-Scope' && wp_category != 'partners' && wp_category != 'melia' && wp_category != 'Cross Cutting' && wp_category != 'synergy-programs') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "OUTPUT" ||
              d.category == "OUTCOME" ||
              this.checkEOI(d.category) ||
              // d.category == "Cross Cutting" ||
              d.category == "IPSR" 
              // d.category == "Melia"
            ) &&
            (d.group == id ||
              (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects') ||
              // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
              ((this.checkEOI(d.category) || d.category == "OUTCOME" && !d.group) && ost_wp_acronym == 'AOW00') ||

              // ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
              d.wp_id == official_code 
              // (official_code == "CROSS" && this.checkEOI(d.category))
            )
          );
        else
          return (
            ((d.category == "OUTPUT" ||
              d.category == "OUTCOME" ||
              this.checkEOI(d.category) ||
              // d.category == "Cross Cutting" ||
              d.category == "IPSR" 
              // d.category == "Melia" 
            ) &&
              (d.group == id || (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects')  ||
              // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
              ((this.checkEOI(d.category) || d.category == "OUTCOME" && !d.group) && ost_wp_acronym == 'AOW00') ||

              // ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
                d.wp_id == official_code)) 
            // (official_code == "CROSS" && this.checkEOI(d.category))
          );
      });
    }  else if(wp_category == 'Projects') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Project") &&
            (
              (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') || (!d?.parent_id && d.category == 'Project' && official_code == 'CROSS-project')
            )
          );
        else
        return (
          (d.category == "Project") &&
          (
            (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') || (!d?.parent_id && d.category == 'Project' && official_code == 'CROSS-project')
          )
        );
      });
    } 
    else if(wp_category == 'melia') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Melia") &&
            (
              (d?.parent_id == id) || ( (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')  && ost_wp_acronym == 'CROSS') 
            )
          );
        else
        return (
          (d.category == "Melia") &&
          (
            (d?.parent_id == id) || ( (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')  && ost_wp_acronym == 'CROSS') 
          )
        );
      });
    } 
     else if(wp_category == 'Cross Cutting') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
              (d.category == "Cross Cutting" && official_code == 'CROSS-Cross-Cutting')
          );
        else
        return (
          (d.category == "Cross Cutting" && official_code == 'CROSS-Cross-Cutting')
        );
      });
    } 
    else if(wp_category == 'Geographic-Scope') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Geographic-Scope") &&
            (
              (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
            )
          );
        else
        return (
          (d.category == "Geographic-Scope") &&
          (
            (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
          )
        );
      });
    } else if(wp_category == 'partners') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "partners") &&
            (
              (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
            )
          );
        else
        return (
          (d.category == "partners") &&
          (
            (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
          )
        );
      });
    }  else if(wp_category == 'synergy-programs') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "synergy-programs") &&
            (
              (d?.wp.id == id && d.category == 'synergy-programs' && wp_category == 'synergy-programs')
            )
          );
        else
        return (
          (d.category == "synergy-programs") &&
          (
            (d?.wp.id == id && d.category == 'synergy-programs' && wp_category == 'synergy-programs')
          )
        );
      });
    } 
 
    // if (ost_wp_acronym === 'AOW00') {
    //   const meliaMap = new Map<string, any>();
    //   const nonMeliaItems: any[] = [];
    
    //   for (const item of wp_data) {
    //     if (item.category !== 'Melia') {
    //       nonMeliaItems.push(item);
    //       continue;
    //     }
    
    //     const key = `${item.id}`;
    
    //     if (!meliaMap.has(key)) {
    //       meliaMap.set(key, {
    //         ...item,
    //         results: item.results ?? '',
    //       });
    //     } else {
    //       const existing = meliaMap.get(key);
    //       if (item.results && !existing.results.includes(item.results)) {
    //         existing.results += `, ${item.results}`;
    //       }
    //     }
    //   }
    
    //   wp_data = [...nonMeliaItems, ...Array.from(meliaMap.values())];
    // }
    


    wp_data.sort(this.compare);

    return wp_data;
  }

  compare(a: any, b: any) {
    if (a.category == 'OUTPUT' && b.category == 'OUTCOME') return -1;
    if (b.category == 'OUTPUT' && a.category == 'OUTCOME') return 1;
    return 0;
  }

  
   setItemIndicatorAndBudget() {
    if (!this.displayBudgetValuesIndicator) return;
  
    Object.keys(this.displayBudgetValuesIndicator).forEach((code) => {
      const orgObj = this.displayBudgetValuesIndicator[code];
      if (!orgObj) return;
  
      Object.keys(orgObj).forEach((wp_id) => {
        const wpObj = orgObj[wp_id];
        if (!wpObj) return;
  
        Object.keys(wpObj).forEach((item_id) => {
          const itemObj = wpObj[item_id];
          if (!itemObj) return;
  
          let sum = 0;
          let total = 0;
  
          Object.keys(itemObj).forEach((indicator_id) => {
            const value = itemObj[indicator_id];
            sum += Number(value) || 0;
          });
  
          this.displayBudgetValuesItemIndicator[code] ??= {};
          this.displayBudgetValuesItemIndicator[code][wp_id] ??= {};
          this.budgetValues[code] ??= {};
          this.budgetValues[code][wp_id] ??= {};
          this.displayBudgetValues[code] ??= {};
          this.displayBudgetValues[code][wp_id] ??= {};
          this.wp_budgets[code] ??= {};
  
          this.displayBudgetValuesItemIndicator[code][wp_id][item_id] = sum;
          this.budgetValues[code][wp_id][item_id] = sum;
          this.displayBudgetValues[code][wp_id][item_id] = sum;
  
          Object.values(this.displayBudgetValuesItemIndicator[code][wp_id]).forEach((val) => {
            if (typeof val === "number") {
              total += Number(val) || 0;
            }
          });
  
          this.wp_budgets[code][wp_id] = total;
        });
      });
    });
  }
  
  setTotalTargetForIndicatorsForPartners() {
    for (let partner of this.partners) {
      if (!this.totalTargetsIndicatorPartners[partner.code]) {
        this.totalTargetsIndicatorPartners[partner.code] = {};
      }
      for (let wp of this.actualWps) {
        if (!this.totalTargetsIndicatorPartners[partner.code][wp.ost_wp.wp_official_code]) {
          this.totalTargetsIndicatorPartners[partner.code][wp.ost_wp.wp_official_code] = {};
        }
      }
    }
   
    for (let wp of this.actualWps) {
      const wpDataArray = this.allData[wp.ost_wp.wp_official_code];
    
      for (let wpData of wpDataArray) {
        const wpCode = wpData.ost_wp?.wp_official_code || wp.ost_wp.wp_official_code;
    
        for (let indicator of wpData.quantitative_indicators || []) {
          const indicatorType = this.highLevelOutputIndicatorTypes.includes(indicator?.type?.value)
            ? indicator.type.value
            : 'Other';
    
          for (let target of indicator.targets || []) {
            for (let targetPartner of target.centers || []) {
              const partnerCode = targetPartner.code;
    
              if (!this.totalTargetsIndicatorPartners[partnerCode]) {
                this.totalTargetsIndicatorPartners[partnerCode] = {};
              }
    
              if (!this.totalTargetsIndicatorPartners[partnerCode][wpCode]) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode] = {};
              }
    
              if (!this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType]) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType] = 0;
              }
    
              const value = parseFloat(target[this.phase.reportingYear]); 
              if (!isNaN(value)) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType] += value;
              }
            }
          }
        }
      }
    }
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
    this.setIndecatorValues();

  }

  budgetValue(value: number, totalBudget: number) {
    return (value * totalBudget) / 100;
  }

  percentValue(value: number, totalBudget: number) {
    return (value / totalBudget) * 100;
  }

  finalPeriodVal(period_id: any) {
    return this.actualWps
      .map(
        (wp: any) =>
          this.perValuesSammary[wp.ost_wp.wp_official_code][period_id],
      )
      .reduce((a: any, b: any) => a || b);
  }

  finalPeriodValForPartner(partner_code: number, period_id: any) {
    return this.actualWps.map((wp: any) =>
      this.perValuesSammaryForPartner[partner_code][wp.ost_wp.wp_official_code][period_id]
    ).reduce((a: any, b: any) => a || b)
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
  actualWps:any;

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
    this.setIndecatorValues();

  }

  async updateLatestSubmitionStatus(id, data, user) {
    const submission = await this.submissionRepository.findOne({
      where: {
        id: id
      }
    });

    submission.status = SubmissionStatus.DRAFT;
    await this.submissionRepository.save(submission).then(
      async () => {
        const history = this.historyRepository.create();
        history.resource_property = `Cancel submit for version Id: ${id}`;
        history.user_id = user.id;
        history.initiative_id = data.initiative_id;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(data.initiative_id, {
          latest_history_id: history.id
        });
      }, (error) => {
        console.log(error)
      }
    );
  }


  async getTocSubmissionData(id: number) {
    return await firstValueFrom(
      this.httpService
        .get(process.env.TOC_API + '/toc/' + id)
        .pipe(
          map((d: any) => ({
            original_id: d.data.original_id,
            version_id: d.data.version_id,
            version: d.data.version,
            phase: d.data.phase,
            initiative_id: id
          })),
          catchError((error: AxiosError) => {
            console.log('Error', error.message);
            throw new InternalServerErrorException();
          }),
        ),
    ).catch((err) => {
      console.log(err);
      return {
        original_id: null,
        version_id: null,
        version: null,
        phase: null,
        initiative_id: id
      };
    })
  }


  async getdata() {
    const emptyArray = [];
    const initiatives = await this.initiativeRepository.find({
      select: ['id']
    });

    for (let init of initiatives) {
      let data = await this.getTocSubmissionData(init.id);
      emptyArray.push(data);
    }

    const allSubmissions = await this.submissionRepository.find({
      relations: ['phase']
    });


    for (let submission of allSubmissions) {
      for (let tocData of emptyArray) {
        if (submission.initiative_id == tocData.initiative_id && submission.phase.tocPhase == tocData.phase) {
          await this.submissionRepository.update(submission.id, {
            toc_original_id: tocData.original_id,
            toc_version_id: tocData.version_id,
            toc_version: tocData.version,
            toc_phase_id: tocData.phase
          });
        }
      }
    }


    return { message: 'Data Saved' };
  }

  roundNumbers(values: number[]): number {
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return Math.round(sum);
  }

  //summary page
  getWpTotalBudgets(data: any[], stCol: any, ws) {
    let WpTotalBudgets;
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const rowCount = range.e.r;
    const columnCount = range.e.c;
    for (let row = 0; row <= rowCount; row++) {
      for (let col = 0; col <= columnCount; col++) {
        let cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (col == columnCount && row == data.length + 1 + stCol) {
          WpTotalBudgets = cellRef
          return WpTotalBudgets
        }
      }
    }
  }


  getWpTotalBudgetsForPartner(data: any[], stCol: any, ws) {
    let WpTotalBudgets;
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const rowCount = range.e.r;
    const columnCount = range.e.c;
    for (let row = 0; row <= rowCount; row++) {
      let cellRef = XLSX.utils.encode_cell({ r: row, c: columnCount });
      if (row == data.length + stCol) {
        WpTotalBudgets = cellRef
        return WpTotalBudgets
      }
    }
  }

  newgetCellRefBudgets(data: any[], startRaw: number, ws: any): string {
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const col = range.e.c;
    const groupExpressions: string[] = [];
    let currentRow = startRaw;
  
    for (const dataset of data) {
      if (!dataset || dataset.length === 0) continue;
  
      const cellRefs: string[] = [];
  
      for (let i = 0; i < dataset.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow + i, c: col });
        cellRefs.push(cellRef);
      }
  
      currentRow += dataset.length + 1;
  
      if (cellRefs.length > 0) {
        groupExpressions.push(cellRefs.join('+'));
      }
    }
  
    return groupExpressions.length === 0 ? '0' : '1- ' + groupExpressions.join(' + ');
  }
  

  getCellRefBudgets(data: any[], startRaw: any, ws) {
    let arrayBudgets = [];
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const col = range.e.c;
    for (let row = startRaw; row < startRaw + data.length; row++) {
      let cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      arrayBudgets.push(cellRef)
    }
    if (arrayBudgets.length === 0) {
      return '0';
    }
    return arrayBudgets.map(d => `${d}+ `).join().replaceAll(',', '').slice(0, -2)
  }

  getTotalBudgetForEachPartnerProject(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-project"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartner(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
      .filter(([key]) => 
        !key.includes('-project')
      )
      .reduce((sum, [, value]) => sum + Number(value || 0), 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerPartner(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-partners"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerMelia(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-melia"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalIndValuesByPartner(data: any): Record<string, Record<string, number>> {
    if (!data) return {};
  
    const totals: Record<string, Record<string, number>> = {};
  
    Object.keys(data).forEach((partnerId) => {
      totals[partnerId] = {};
      const partner = data[partnerId];
  
      Object.keys(partner).forEach((category) => {
        const categoryData = partner[category];
  
        if (typeof categoryData === 'object' && categoryData !== null) {
          Object.keys(categoryData).forEach((indicator) => {
            const value = categoryData[indicator];
            if (typeof value === 'number') {
              totals[partnerId][indicator] = (totals[partnerId][indicator] || 0) + value;
            }
          });
        }
      });
    });
    this.totalConsolidatedTargetPartner = totals;
    return totals;
  }
  
  getCategory(category: string) {
    switch (category) {
      case "OUTPUT":
        return "High Level Output";
      case "OUTCOME":
        return "Intermediate Outcome";
      case "EOI":
        return "2030 Outcome";
      case "Melia":
        return "MELIA Studies";
      default:
        return category;
    }
  }
  getScope(indicator: any, type: string) {
    let target = type == 'item' ? 'location' : 'geographic_scope'
      let scope = '';
      if(indicator[target] == 'global') {
        scope = 'Global';
      } else if(indicator[target] == 'country') {
        if(target == 'geographic_scope')
          scope = 'Country: ' + indicator.country?.map((c:any) => c.name).join(', ')
        else
          scope = 'Country: ' + indicator.countries?.map((c:any) => c.name).join(', ')
      } else if(indicator[target] == 'regional') {
        scope = 'Regional: ' + indicator.regions?.map((c:any) => c.name).join(', ')
      }
      return scope
  }
  getTargetValue(targets: any[],code:string='') {
     let  filterd;
      
      if(code!='')
        filterd = targets.filter((target:any)=>target?.centers?.map((d:any)=>d.code).includes(code))
      else
        filterd = targets;
     
    return filterd.reduce((sum, target) => {
      const val = parseFloat(target?.[this?.phase?.reportingYear || this?.submission_data?.phase?.reportingYear]) || 0; 
      return sum + val;
    }, 0);
  }
  async getPartners(resultId: any, submissionId: any) {
    const query = this.resultRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.organization', 'org')
      .leftJoinAndSelect('r.values', 'rv')
      .where('r.result_uuid = :resultId', { resultId })
      .andWhere('rv.value = :isTrue', { isTrue: true });
  
    if (submissionId !== null && submissionId !== undefined) {
      query.andWhere('r.submission_id = :submissionId', { submissionId });
    } else {
      query.andWhere('r.submission_id IS NULL');
    }
  
    const result = await query.distinct().getMany();
  
    const out = result.map(r => r.organization?.acronym).join(', ');
  
    return out;
  }
  setIndecatorValues() {
    for (const wp of this.wps) {
      if (wp.category === 'WP') {
        const group = wp.ost_wp?.wp_official_code;
        if (!group) continue;
  
        const allData = this.allData[group];
        if (!Array.isArray(allData)) continue;
  
        if (!this.perAllValuesIndicator[group]) {
          this.perAllValuesIndicator[group] = {};
        }
  
        for (let data of allData) {
          const dataId = data.id;
          const indicatorValues = data.pooled_funded_indicator_values || {};
  
          if (!this.perAllValuesIndicator[group][dataId]) {
            this.perAllValuesIndicator[group][dataId] = {};
          }
  
          for (let key of this.indicatorTypes) {
            this.perAllValuesIndicator[group][dataId][key] = indicatorValues[key] ?? 0;
          }
        }
      }
    }
  }

  sortByType(rows: any[]) {
    const mainRows = rows.filter(r => r.WP_Results !== 'Subtotal');
    const subtotalRow = rows.find(r => r.WP_Results === 'Subtotal');
    const typeOrder = {
      'High Level Output': 1,
      'Intermediate Outcome': 2,
      '2030 Outcome': 3,
      'Cross Cutting': 4,
      'MELIA Studies': 5
    };
    mainRows.sort((a, b) => {
      const orderA = typeOrder[a.Type] ?? 999;
      const orderB = typeOrder[b.Type] ?? 999;
      return orderA - orderB;
    });
  
    return subtotalRow ? [...mainRows, subtotalRow] : mainRows;
  }
  async setAnaplanValues() {
    this.anaplanValues = await this.anaplanService.findAllValues(this.initiative_data.id, this.phase.id);
    for(let values of this.anaplanValues){
     this.anaplanBudgets[values.organization.code][values.workPackage.wp_official_code][values.anaplan.id] = values.value
    }
  }
  async setAnaplanValuesVersion(id: number) {
    this.anaplanValues = await this.anaplanService.findAllValuesVersion(this.initiative_data.id, id, this.submission_data.phase.id);
    for(let values of this.anaplanValues){
     this.anaplanBudgets[values.organization.code][values.workPackage.wp_official_code][values.anaplan.id] = values.value
    }
  }
  async getActualTocs(code: string) {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${process.env.TOC_API}/toc/${code}`)
          .pipe(
            catchError((error: AxiosError) => {
              console.error('TOC API Error:', error.message);
              throw new InternalServerErrorException(
                'Failed to fetch TOC data',
              );
            }),
          ),
      );
      
      const { melias, projects } = response.data;

     

      const processItems = (items: any[]) => {
        return items.map((item) => {
          const groupedResults: Record<string, any> = {};
          if(item.related_node_id)
            item.id = item.related_node_id;
          item.results.forEach((result) => {
            const related_node_id = result.group?.related_node_id;
  
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

  async generateExcelProject(dataa: any, partner: any, type: string) {

 const  indicatorTogelvalue = await this.constantsRepository.findOne({where: { id: 3 }})
  let  data :any
    if(indicatorTogelvalue?.value == '1')
      data = dataa.filter((d:any)=> { 
        if(d?.center?.code && d?.center?.code == partner.code)
          return true;
        if(d?.center?.code && d?.center?.code != partner.code)
          return false 

          return true
      
      });
    else 
      data = dataa
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
    };

    const cellStyle = {
      alignment: { vertical: "center", wrapText: true },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
    };

    const centeredCellStyle = {
        ...cellStyle,
        alignment: { ...cellStyle.alignment, horizontal: "center" }
    }

    const subTotalStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
      },
    };

    let header = [];
    if(type == 'project')
      header = ['Project title','AOW','High Level Outputs','Budget (USD)','Total budget (USD)'];
    else
      header = ['MELIA study','AOW','Supported outcomes','AOW budget (USD)','Total budget (USD)'];

    const { rows, mergeRanges, formulae } = this.flattenProjectData(data, partner, type);


    const dataToSheet = rows.map(row => [
      row.title, 
      row.aow, 
      row.highLevelOutput, 
      row.budget, 
      null
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header]); 
  XLSX.utils.sheet_add_aoa(ws, dataToSheet, { origin: -1 }); 

  formulae.forEach(({ cell, formula }) => {
    if (!ws[cell]) {
        ws[cell] = { t: 'n', v: 0 };
    }
    
    ws[cell].t = 'f';
    ws[cell].f = formula;
    
});


const totalRowIndex = rows.length + 1; 
  const firstTotalCell = XLSX.utils.encode_cell({ r: 1, c: 4 }); 
  const lastTotalCell = XLSX.utils.encode_cell({ r: rows.length, c: 4 }); 
  const totalFormula = `SUM(${firstTotalCell}:${lastTotalCell})`;

  let totalLabel = '';
  if(type == 'project')
    totalLabel = "W3/Bilateral projects subtotal";
  else
    totalLabel = "MELIA Studies Budget subtotal";

  XLSX.utils.sheet_add_aoa(ws, [[totalLabel, null, null, null, null]], { origin: -1 });

  const totalCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 4 });
  ws[totalCell] = { t: 'n', f: totalFormula};

 
  // header
  for (let C = 0; C < header.length; ++C) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cell]) ws[cell].s = headerStyle;
  }

  
  // last row
  for (let c = 0; c <= 4; c++) {
    const cell = XLSX.utils.encode_cell({ r: totalRowIndex, c });
    if (ws[cell]) ws[cell].s = subTotalStyle;
  }



  rows.forEach((_, rowIndex) => {
      const R = rowIndex + 1; 
      
      const cells = [
          { c: 0, style: cellStyle }, 
          { c: 1, style: centeredCellStyle }, 
          { c: 2, style: cellStyle }, 
          { c: 3, style: centeredCellStyle }, 
          { c: 4, style: centeredCellStyle }
      ];
      ws['!rows'] = [];
      ws['!rows'].push({
        hpt: 75
      })
      cells.forEach(({ c, style }) => {
          const cell = XLSX.utils.encode_cell({ r: R, c: c });
          if (ws[cell]) ws[cell].s = style;
      });
  });

  ws['!merges'] = [...mergeRanges.project, ...mergeRanges.totalBudget];
  ws['!merges'].push({
    s: { r: totalRowIndex, c: 0 },
    e: { r: totalRowIndex, c: 3 }
  });
  ws['!cols'] = [
      { wpx: 250 }, { wpx: 60 }, { wpx: 350 }, { wpx: 100 }, { wpx: 120 }
  ];

  ws['!rows'] = ws['!rows'] || [];
  for (let r = 1; r < totalRowIndex + 1; r++) { 
    ws['!rows'].push({ hpt: 30 });
  }
  

  return ws
  }

  flattenProjectData(data: any[], partner:any, type: string) {
    const flattenedRows: any[] = [];
    const mergeRanges = { project: [], totalBudget: [] };
    let currentRow = 1; 
    const formulae = [];
    for (const item of data) {
        const startRow = currentRow;
        const resultCount = item.results.length ?? 0;

            const budgetStartCell = XLSX.utils.encode_cell({ r: startRow, c: 3 }); 
            const budgetEndCell = XLSX.utils.encode_cell({ r: startRow + resultCount - 1, c: 3 });
    
            const totalBudgetCell = XLSX.utils.encode_cell({ r: startRow, c: 4 });

            const formulaString = `=SUM(${budgetStartCell}:${budgetEndCell})`;
        
            if (resultCount > 0) {
                formulae.push({ cell: totalBudgetCell, formula: formulaString });
            }

            item.results.forEach((result, index) => {
            const highLevelOutput = result.titles.join(' / ');
            const aowPlaceholder = result.group.ost_wp.acronym;
            const wp_official_code = result?.group?.ost_wp?.wp_official_code + '-' + type;
            flattenedRows.push({
                title: type == 'melia' ? item.title : item.name,
                aow: aowPlaceholder,
                highLevelOutput: highLevelOutput,
                budget: this.displayBudgetValues?.[partner.code]?.[wp_official_code]?.[item.id],
            });
            currentRow++;
        });

        if (resultCount > 1) {
            mergeRanges.project.push({
                s: { r: startRow, c: 0 }, 
                e: { r: currentRow - 1, c: 0 } 
            });
            mergeRanges.totalBudget.push({
                s: { r: startRow, c: 4 }, 
                e: { r: currentRow - 1, c: 4 } 
            });
        }
    }

    return { rows: flattenedRows, mergeRanges, formulae };
  };

  generateExcelAnaplan(partner: any){
    const mainAccountLabels = this.anaplanLabels.map(d => d.label);
    let header = this.actualWps.map(wp => wp.ost_wp.acronym);
    header = ['Main Accounts', ...header, 'Total budget (USD)'];

    const COLUMNS_COUNT = header.length;
    const TOTAL_BUDGET_COLUMN_INDEX = COLUMNS_COUNT - 1;
    const DATA_ROWS_COUNT = mainAccountLabels.length; 
    const HEADER_ROW = 0;
    const FIRST_DATA_ROW = HEADER_ROW + 1;
    const SUB_TOTAL_ROW = FIRST_DATA_ROW + DATA_ROWS_COUNT; 

    const ws = XLSX.utils.aoa_to_sheet([header]);

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
    };
    
    const subtotalHeaderStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    
    const subtotalCellStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      border: { top: { style: "medium" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
      numFmt: '0',
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
      numFmt: '0',
    };

    let currentRow = FIRST_DATA_ROW;
    const formulae = [];
    const sheetData = [];

    this.anaplanLabels.forEach(anaplan => {
      const rowArray = [anaplan.label]; // Start with the static Main Account label
      
      // Add dynamic AOW budget values
      this.actualWps.forEach((wp, colIndex) => {
        const budgetValue = this.anaplanBudgets[partner.code]?.[wp.ost_wp.wp_official_code]?.[anaplan.id] || 0;
        rowArray.push(budgetValue);
      });
      
      rowArray.push(0); // Placeholder for Total Budget (USD)
      sheetData.push(rowArray);

      // Total Budget Formula (Row-wise sum: B[R+1] through H[R+1], where H is dynamic)
      // Start cell is always Column B (index 1). End cell is TOTAL_BUDGET_COLUMN_INDEX - 1
      const startCell = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
      const endCell = XLSX.utils.encode_cell({ r: currentRow, c: TOTAL_BUDGET_COLUMN_INDEX - 1 }); 
      const totalBudgetCell = XLSX.utils.encode_cell({ r: currentRow, c: TOTAL_BUDGET_COLUMN_INDEX }); 

      formulae.push({ cell: totalBudgetCell, formula: `=SUM(${startCell}:${endCell})` });

      currentRow++;
    });

    XLSX.utils.sheet_add_aoa(ws, sheetData, { origin: -1 });
    const subTotalRowData: any = ['Subtotal'];

    for (let C = 1; C < COLUMNS_COUNT; C++) {
      const startCell = XLSX.utils.encode_cell({ r: FIRST_DATA_ROW, c: C });
      const endCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW - 1, c: C });
      const subTotalCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW, c: C });

      formulae.push({ cell: subTotalCell, formula: `=SUM(${startCell}:${endCell})` });
      subTotalRowData.push(0);
    }

    XLSX.utils.sheet_add_aoa(ws, [subTotalRowData], { origin: -1 });

    formulae.forEach(({ cell, formula }) => {
      if (!ws[cell]) ws[cell] = { t: 'n', v: 0 }; 
      ws[cell].t = 'f';
      ws[cell].f = formula;
    });


    for (let C = 0; C < COLUMNS_COUNT; ++C) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cell]) ws[cell].s = headerStyle;
    }

    // Data Cell Styling (Rows 1 to DATA_ROWS_COUNT) 
    for (let R = FIRST_DATA_ROW; R < SUB_TOTAL_ROW; R++) {
      for (let C = 0; C < COLUMNS_COUNT; C++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell]) {
            ws[cell].s = dataCellStyle;
        }
      }
      // Highlight Total Budget column // last col
      // const totalBudgetCell = XLSX.utils.encode_cell({ r: R, c: TOTAL_BUDGET_COLUMN_INDEX });
      // if (ws[totalBudgetCell]) ws[totalBudgetCell].s = subtotalCellStyle;
    }

    for (let C = 0; C < COLUMNS_COUNT; C++) {
      const cell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW, c: C });
      if (C === 0) {
        if (ws[cell]) ws[cell].s = subtotalHeaderStyle;
      } else {
        if (ws[cell]) ws[cell].s = subtotalCellStyle;
      }
    }

    const colWidths = [
      { wch: 25 }, // Main Accounts
      ...Array(this.actualWps.length).fill({ wch: 10 }), // Dynamic AOW columns
      { wch: 20 }  // Total budget (USD)
    ];
    ws['!cols'] = colWidths;

    const colHeight = [
      { hpt: 25 }, // Main Accounts
      ...Array(mainAccountLabels.length).fill({ hpt: 20 }), // Dynamic AOW columns
      { hpt: 20 }  // Total budget (USD)
    ];
    ws['!rows'] = colHeight;

    return ws
  }
  getAnaplanValueAcrossPartners(wpCode: string, anaplanId: number): number {
    let total = 0;
  
    for (const partnerCode in this.anaplanBudgets) {
      const partnerData = this.anaplanBudgets[partnerCode];
      const wpData = partnerData[wpCode];
      if (wpData && wpData[anaplanId] !== undefined) {
        total += Number(wpData[anaplanId]) || 0;
      }
    }
  
    return total;
  }
  generateExcelSummaryAnaplan(){
    const mainAccountLabels = this.anaplanLabels.map(d => d.label);
    let header = this.actualWps.map(wp => wp.ost_wp.acronym);
    header = ['Main Accounts', ...header, 'Total budget (USD)'];

    const COLUMNS_COUNT = header.length;
    const TOTAL_BUDGET_COLUMN_INDEX = COLUMNS_COUNT - 1;
    const DATA_ROWS_COUNT = mainAccountLabels.length; 
    const HEADER_ROW = 0;
    const FIRST_DATA_ROW = HEADER_ROW + 1;
    const SUB_TOTAL_ROW = FIRST_DATA_ROW + DATA_ROWS_COUNT; 

    const ws = XLSX.utils.aoa_to_sheet([header]);

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
    };
    
    const subtotalHeaderStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    
    const subtotalCellStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      border: { top: { style: "medium" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
      numFmt: '0',
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
    
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
      numFmt: '0',
    };

    let currentRow = FIRST_DATA_ROW;
    const formulae = [];
    const sheetData = [];

    this.anaplanLabels.forEach(anaplan => {
      const rowArray = [anaplan.label]; // Start with the static Main Account label
      
      this.actualWps.forEach((wp, colIndex) => {
        const budgetValue = this.getAnaplanValueAcrossPartners(wp.ost_wp.wp_official_code, anaplan.id) || 0;
        rowArray.push(budgetValue);
      });
      
      rowArray.push(0); // Placeholder for Total Budget (USD)
      sheetData.push(rowArray);

      const startCell = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
      const endCell = XLSX.utils.encode_cell({ r: currentRow, c: TOTAL_BUDGET_COLUMN_INDEX - 1 }); 
      const totalBudgetCell = XLSX.utils.encode_cell({ r: currentRow, c: TOTAL_BUDGET_COLUMN_INDEX }); 

      formulae.push({ cell: totalBudgetCell, formula: `=SUM(${startCell}:${endCell})` });

      currentRow++;
    });

    XLSX.utils.sheet_add_aoa(ws, sheetData, { origin: -1 });
    const subTotalRowData: any = ['Subtotal'];

    for (let C = 1; C < COLUMNS_COUNT; C++) {
      const startCell = XLSX.utils.encode_cell({ r: FIRST_DATA_ROW, c: C });
      const endCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW - 1, c: C });
      const subTotalCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW, c: C });

      formulae.push({ cell: subTotalCell, formula: `=SUM(${startCell}:${endCell})` });
      subTotalRowData.push(0);
    }

    XLSX.utils.sheet_add_aoa(ws, [subTotalRowData], { origin: -1 });

    formulae.forEach(({ cell, formula }) => {
      if (!ws[cell]) ws[cell] = { t: 'n', v: 0 }; 
      ws[cell].t = 'f';
      ws[cell].f = formula;
    });


    for (let C = 0; C < COLUMNS_COUNT; ++C) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cell]) ws[cell].s = headerStyle;
    }

    // Data Cell Styling (Rows 1 to DATA_ROWS_COUNT) 
    for (let R = FIRST_DATA_ROW; R < SUB_TOTAL_ROW; R++) {
      for (let C = 0; C < COLUMNS_COUNT; C++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell]) {
            ws[cell].s = dataCellStyle;
        }
      }
    }

    for (let C = 0; C < COLUMNS_COUNT; C++) {
      const cell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW, c: C });
      if (C === 0) {
        if (ws[cell]) ws[cell].s = subtotalHeaderStyle;
      } else {
        if (ws[cell]) ws[cell].s = subtotalCellStyle;
      }
    }

    const colWidths = [
      { wch: 25 }, // Main Accounts
      ...Array(this.actualWps.length).fill({ wch: 10 }), // Dynamic AOW columns
      { wch: 20 }  // Total budget (USD)
    ];
    ws['!cols'] = colWidths;

    const colHeight = [
      { hpt: 25 }, // Main Accounts
      ...Array(mainAccountLabels.length).fill({ hpt: 20 }), // Dynamic AOW columns
      { hpt: 20 }  // Total budget (USD)
    ];
    ws['!rows'] = colHeight;

    return ws
  }

  setTotalTargetForIndicators() {
    for (let wp of this.actualWps) {
      if (!this.totalTargetsIndicator[wp.ost_wp.wp_official_code]) {
        this.totalTargetsIndicator[wp.ost_wp.wp_official_code] = {};
      }
  
      const wpData = this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code];
      if (!wpData) continue;
  
      Object.keys(wpData).forEach((itemId) => {
        const indicators = wpData[itemId];
  
        Object.keys(indicators).forEach((indicatorName) => {
          const value = Number(indicators[indicatorName]) || 0;
  
          if (!this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName]) {
            this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName] = 0;
          }
  
          this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName] += value;
        });
      });
    }
    
  }
  setvaluesForIndicators(data: any[], index: number) {
    const indicatorIds = this.results[this.results.length - index].indicator_ids;
    const ids = Object.values(indicatorIds);
    const filtered = data.filter(item => ids.includes(item.result_uuid));
    for (let value of filtered) {
      const org = value.organization_code;
      const wp = value.workPackage.wp_official_code;
      const parent = value.parent_id;
      const result = value.result_uuid;
  
      this.displayBudgetValuesIndicator[org] ??= {};
      this.displayBudgetValuesIndicator[org][wp] ??= {};
      this.displayBudgetValuesIndicator[org][wp][parent] ??= {};
  
      this.displayBudgetValuesIndicator[org][wp][parent][result] = Number(value.budget);
    }
  
  
    this.sammaryCalc();
  }
  setPartnervaluesForIndicators(data: any[], index: number) {  
    this.budgetValuesIndicatorPartner = {};
    this.budgetValuesIndicatorSummary = {};
    this.totalBudgetValuesIndicatorPartner = {};
    this.totalBudgetValuesIndicatorSummary = {};
    const indicatorIds = this.results[this.results.length - index].indicator_ids;
    const ids = Object.values(indicatorIds);
    const filtered = data.filter(item => ids.includes(item.result_uuid));

    for(let value of filtered) {
      const orgCode = value.organization_code;
      const wpCode = value.workPackage.wp_official_code;
      const indicatorType = value.indicator_type;
      const budget = Number(value.budget) || 0;

      
      if (!this.budgetValuesIndicatorPartner[orgCode] || typeof this.budgetValuesIndicatorPartner[orgCode] !== 'object') {
        this.budgetValuesIndicatorPartner[orgCode] = {};
      }

      if (!this.budgetValuesIndicatorPartner[orgCode][wpCode] || typeof this.budgetValuesIndicatorPartner[orgCode][wpCode] !== 'object') {
        this.budgetValuesIndicatorPartner[orgCode][wpCode] = {};
      }

      if (!this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType]) {
        this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType] = 0;
      }

      this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType] += budget;




      if (!this.budgetValuesIndicatorSummary[wpCode]) {
        this.budgetValuesIndicatorSummary[wpCode] = {};
      }
  
      if (!this.budgetValuesIndicatorSummary[wpCode][indicatorType]) {
        this.budgetValuesIndicatorSummary[wpCode][indicatorType] = 0;
      }
  
      this.budgetValuesIndicatorSummary[wpCode][indicatorType] += budget;


      if (!this.totalBudgetValuesIndicatorPartner[orgCode]) {
        this.totalBudgetValuesIndicatorPartner[orgCode] = {};
      }
  
      if (!this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType]) {
        this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] = 0;
      }
  
      this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] += budget;
  
      if (!this.totalBudgetValuesIndicatorSummary[indicatorType]) {
        this.totalBudgetValuesIndicatorSummary[indicatorType] = 0;
      }
  
      this.totalBudgetValuesIndicatorSummary[indicatorType] += budget;
      
    }
  }


  generateExcelSummaryConsolidated() {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
    };
  
    const totalRowStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
    };
  
    const numberCellStyle = {
      alignment: { horizontal: "center", vertical: "center" },
    };

    const ws_data = [
      ['Area of Work', 'Pooled Funding', null, null, null, null, null, null, null, null, null, null, 'W3/ Bilateral Project (USD)'],
      [null, 'Innovation Development', null, 'Knowledge product', null, 'Capacity Sharing', null, 'Others outputs', null, 'Partner budget', 'MELIA Studies budget', 'Total Pooled Funding budget (USD)', null],
      [null, 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', null, null, null, null],
    ];

    this.actualWps.forEach(wp => {
      const row = [
        wp.title,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0 ,
        this.budgetValuesIndicatorSummary?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0 ,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0 ,
        this.budgetValuesIndicatorSummary?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0 ,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0 ,
        this.budgetValuesIndicatorSummary?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0 ,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0 ,
        this.budgetValuesIndicatorSummary?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0 ,
        this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-partners']) ?? 0,
        this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-melia']) ?? 0,
        this.roundNumbers([
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code],
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-melia'],
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-Cross-Cutting'],
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-partners']
        ]) ?? 0,
        this.roundNumber(this.summaryBudgetsTotal[wp.ost_wp.wp_official_code + '-project']) ?? 0,
      ];
      ws_data.push(row);
    });
    const totalRow = [
      'Total',
      this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of innovations (innovation development)'),
      this.totalBudgetValuesIndicatorSummary?.['Number of innovations (innovation development)'] ?? 0,
      this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of knowledge products'),
      this.totalBudgetValuesIndicatorSummary?.['Number of knowledge products'] ?? 0,
      this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of people trained (capacity sharing for development)'),
      this.totalBudgetValuesIndicatorSummary?.['Number of people trained (capacity sharing for development)'] ?? 0,
      this.getTotalIndAllValues(this.perAllValuesIndicator, 'custom-OUTPUT'),
      this.totalBudgetValuesIndicatorSummary?.['custom-OUTPUT'] ?? 0,
      this.roundNumber(this.summaryBudgetsPartnerTotal),
      this.roundNumber(this.summaryBudgetsMeliaTotal),
      this.roundNumber(this.summaryBudgetsAllTotal),
      this.roundNumber(this.summaryBudgetsProjectsTotal),
    ];
    ws_data.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);


    ws['!merges'] = [
      // rowspan="3" for "Area of Work"
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      // colspan="11" for "Pooled Funding"
      { s: { r: 0, c: 1 }, e: { r: 0, c: 11 } },
      // rowspan="3" for "W3/ Bilateral Project (USD)"
      { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } },
      // colspan="2" for sub-headers
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }, // Innovation Development
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }, // Knowledge product
      { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } }, // Capacity Sharing
      { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } }, // Others outputs
      // rowspan="2" for single headers
      { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },  // Partner budget
      { s: { r: 1, c: 10 }, e: { r: 2, c: 10 } },// MELIA Studies budget
      { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },// Total Pooled Funding
    ];

    for (let R = 0; R < ws_data.length; ++R) {
      for (let C = 0; C < ws_data[R].length; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue; // Skip empty cells from merges

          // Apply header style to the first 3 rows
          if (R < 3) {
              ws[cell_address].s = headerStyle;
          }
          
          // Apply number formatting to budget/numeric columns (skip headers)
          const isNumericColumn = C === 2 || C === 4 || C === 6 || C === 8 || (C >= 9 && C <= 12);
          if (R >= 3 && isNumericColumn) {
              ws[cell_address].s = numberCellStyle;
          }

          // Apply total row style to the last row
          if (R === ws_data.length - 1) {
              // Combine total style with number style if applicable
              ws[cell_address].s = isNumericColumn 
                  ? { ...totalRowStyle, ...numberCellStyle } 
                  : totalRowStyle;
          }
      }
    }

    const colHeight = [
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      ...Array(this.actualWps.length).fill({ hpt: 20 }),
      { hpt: 25 }  // Total budget (USD)
    ];
    ws['!rows'] = colHeight;

    ws['!cols'] = [
      { wch: 30 }, // A: Area of Work
      { wch: 12 }, // B: Target
      { wch: 15 }, // C: Budget
      { wch: 12 }, // D: Target
      { wch: 15 }, // E: Budget
      { wch: 12 }, // F: Target
      { wch: 15 }, // G: Budget
      { wch: 12 }, // H: Target
      { wch: 15 }, // I: Budget
      { wch: 25 }, // J: Partner budget
      { wch: 25 }, // K: MELIA Studies budget
      { wch: 35 }, // L: Total Pooled Funding
      { wch: 30 }, // M: W3/ Bilateral Project
  ];

  return ws
  }


  // generateExcelCenterConsolidated(partner_code: number) {
  //   const headerStyle = {
  //     font: { bold: true, color: { rgb: "FFFFFF" } },
  //     fill: { fgColor: { rgb: "2B3C53" } },
  //     alignment: { horizontal: "center", vertical: "center" },
  //     border: { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } },
  //   };
  
  //   const totalRowStyle = {
  //     alignment: { horizontal: "center", vertical: "center" },
  //     font: { bold: true, color: { rgb: "FFFFFF" } },
  //     fill: { fgColor: { rgb: "2B3C53" } },
  //   };
  
  //   const numberCellStyle = {
  //     alignment: { horizontal: "center", vertical: "center" },
  //   };

  //   const ws_data = [
  //     ['Area of Work', 'Pooled Funding', null, null, null, null, null, null, null, null, null, null, 'W3/ Bilateral Project (USD)'],
  //     [null, 'Innovation Development', null, 'Knowledge product', null, 'Capacity Sharing', null, 'Others outputs', null, 'Partner budget', 'MELIA Studies budget', 'Total Pooled Funding budget (USD)', null],
  //     [null, 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', null, null, null, null],
  //   ];

  //   this.actualWps.forEach(wp => {
  //     const row = [
  //       wp.title,
  //       this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0 ,
  //       this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0 ,
  //       this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0 ,
  //       this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0 ,
  //       this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0 ,
  //       this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0 ,
  //       this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0 ,
  //       this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0 ,
  //       this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-partners']) ?? 0,
  //       this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-melia']) ?? 0,
  //       this.roundNumbers([
  //         this.wp_budgets[partner_code][wp.ost_wp.wp_official_code],
  //         this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-melia'],
  //         this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-Cross-Cutting'],
  //         this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-partners']
  //       ]) ?? 0,
  //       this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-project']) ?? 0,
  //     ];
  //     ws_data.push(row);
  //   });
  //   const totalRow = [
  //     'Total',
  //     this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of innovations (innovation development)'),
  //     this.totalBudgetValuesIndicatorPartner[partner_code]?.['Number of innovations (innovation development)'] ?? 0,
  //     this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of knowledge products'),
  //     this.totalBudgetValuesIndicatorPartner[partner_code]?.['Number of knowledge products'] ?? 0,
  //     this.getTotalIndAllValues(this.perAllValuesIndicator, 'Number of people trained (capacity sharing for development)'),
  //     this.totalBudgetValuesIndicatorPartner[partner_code]?.['Number of people trained (capacity sharing for development)'] ?? 0,
  //     this.getTotalIndAllValues(this.perAllValuesIndicator, 'custom-OUTPUT'),
  //     this.totalConsolidatedTargetPartner[partner_code]?.['custom-OUTPUT'] ?? 0,
  //     this.getTotalBudgetForEachPartnerMelia(this.wp_budgets[partner_code]),
  //     this.getTotalBudgetForEachPartnerPartner(this.wp_budgets[partner_code]),
  //     this.getTotalBudgetForEachPartner(this.wp_budgets[partner_code]),
  //     this.getTotalBudgetForEachPartnerProject(this.wp_budgets[partner_code]),
  //   ];
  //   ws_data.push(totalRow);

  //   const ws = XLSX.utils.aoa_to_sheet(ws_data);


  //   ws['!merges'] = [
  //     // rowspan="3" for "Area of Work"
  //     { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
  //     // colspan="11" for "Pooled Funding"
  //     { s: { r: 0, c: 1 }, e: { r: 0, c: 11 } },
  //     // rowspan="3" for "W3/ Bilateral Project (USD)"
  //     { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } },
  //     // colspan="2" for sub-headers
  //     { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }, // Innovation Development
  //     { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }, // Knowledge product
  //     { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } }, // Capacity Sharing
  //     { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } }, // Others outputs
  //     // rowspan="2" for single headers
  //     { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },  // Partner budget
  //     { s: { r: 1, c: 10 }, e: { r: 2, c: 10 } },// MELIA Studies budget
  //     { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },// Total Pooled Funding
  //   ];

  //   for (let R = 0; R < ws_data.length; ++R) {
  //     for (let C = 0; C < ws_data[R].length; ++C) {
  //         const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
  //         if (!ws[cell_address]) continue; // Skip empty cells from merges

  //         // Apply header style to the first 3 rows
  //         if (R < 3) {
  //             ws[cell_address].s = headerStyle;
  //         }
          
  //         // Apply number formatting to budget/numeric columns (skip headers)
  //         const isNumericColumn = C === 2 || C === 4 || C === 6 || C === 8 || (C >= 9 && C <= 12);
  //         if (R >= 3 && isNumericColumn) {
  //             ws[cell_address].s = numberCellStyle;
  //         }

  //         // Apply total row style to the last row
  //         if (R === ws_data.length - 1) {
  //             // Combine total style with number style if applicable
  //             ws[cell_address].s = isNumericColumn 
  //                 ? { ...totalRowStyle, ...numberCellStyle } 
  //                 : totalRowStyle;
  //         }
  //     }
  //   }

  //   const colHeight = [
  //     { hpt: 15 },
  //     { hpt: 15 },
  //     { hpt: 15 },
  //     ...Array(this.actualWps.length).fill({ hpt: 20 }),
  //     { hpt: 25 }  // Total budget (USD)
  //   ];
  //   ws['!rows'] = colHeight;

  //   ws['!cols'] = [
  //     { wch: 30 }, // A: Area of Work
  //     { wch: 12 }, // B: Target
  //     { wch: 15 }, // C: Budget
  //     { wch: 12 }, // D: Target
  //     { wch: 15 }, // E: Budget
  //     { wch: 12 }, // F: Target
  //     { wch: 15 }, // G: Budget
  //     { wch: 12 }, // H: Target
  //     { wch: 15 }, // I: Budget
  //     { wch: 25 }, // J: Partner budget
  //     { wch: 25 }, // K: MELIA Studies budget
  //     { wch: 35 }, // L: Total Pooled Funding
  //     { wch: 30 }, // M: W3/ Bilateral Project
  // ];

  // return ws
  // }

  generateExcelCenterConsolidated(partner_code: number) {
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
      },
    };
  
    const totalRowStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2B3C53' } },
    };
  
    const numberCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  
    const ws_data: (string | number | null | { f: string })[][] = [
      ['Area of Work', 'Pooled Funding', null, null, null, null, null, null, null, null, null, null, 'W3/ Bilateral Project (USD)'],
      [null, 'Innovation Development', null, 'Knowledge product', null, 'Capacity Sharing', null, 'Others outputs', null, 'Partner budget', 'MELIA Studies budget', 'Total Pooled Funding budget (USD)', null],
      [null, 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', 'Target', 'Budget', null, null, null, null],
    ];
  
    this.actualWps.forEach(wp => {
      const row = [
        wp.title,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0,
        this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of innovations (innovation development)'] ?? 0,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0,
        this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of knowledge products'] ?? 0,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0,
        this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['Number of people trained (capacity sharing for development)'] ?? 0,
        this.totalTargetsIndicator?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0,
        this.budgetValuesIndicatorPartner[partner_code]?.[wp.ost_wp.wp_official_code]?.['custom-OUTPUT'] ?? 0,
        this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-partners']) ?? 0,
        this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-melia']) ?? 0,
        this.roundNumbers([
          this.wp_budgets[partner_code][wp.ost_wp.wp_official_code],
          this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-melia'],
          this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-Cross-Cutting'],
          this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-partners'],
        ]) ?? 0,
        this.roundNumber(this.wp_budgets[partner_code][wp.ost_wp.wp_official_code + '-project']) ?? 0,
      ];
      ws_data.push(row);
    });
  
    const firstDataRow = 4;
    const lastDataRow = firstDataRow + this.actualWps.length - 1;
  
    const totalRow: (string | { f: string })[] = [
      'Total',
      { f: `SUM(B${firstDataRow}:B${lastDataRow})` },
      { f: `SUM(C${firstDataRow}:C${lastDataRow})` },
      { f: `SUM(D${firstDataRow}:D${lastDataRow})` },
      { f: `SUM(E${firstDataRow}:E${lastDataRow})` },
      { f: `SUM(F${firstDataRow}:F${lastDataRow})` },
      { f: `SUM(G${firstDataRow}:G${lastDataRow})` },
      { f: `SUM(H${firstDataRow}:H${lastDataRow})` },
      { f: `SUM(I${firstDataRow}:I${lastDataRow})` },
      { f: `SUM(J${firstDataRow}:J${lastDataRow})` },
      { f: `SUM(K${firstDataRow}:K${lastDataRow})` },
      { f: `SUM(L${firstDataRow}:L${lastDataRow})` },
      { f: `SUM(M${firstDataRow}:M${lastDataRow})` },
    ];
    ws_data.push(totalRow);
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 11 } },
      { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
      { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },
      { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },
      { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },
      { s: { r: 1, c: 10 }, e: { r: 2, c: 10 } },
      { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },
    ];
  
    for (let R = 0; R < ws_data.length; ++R) {
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddr];
        if (!cell) continue;
  
        if (R < 3) {
          cell.s = headerStyle;
        } else if (R === ws_data.length - 1) {
          cell.s = { ...totalRowStyle, ...numberCellStyle };
        } else if (C === 2 || C === 4 || C === 6 || C === 8 || (C >= 9 && C <= 12)) {
          cell.s = numberCellStyle;
        }
      }
    }
  
    ws['!rows'] = [
      { hpt: 15 },
      { hpt: 15 },
      { hpt: 15 },
      ...Array(this.actualWps.length).fill({ hpt: 20 }),
      { hpt: 25 },
    ];
  
    ws['!cols'] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 35 },
      { wch: 30 },
    ];
  
    return ws;
  }


  generateExcelSummaryHLO() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '2B3C53' } },
      border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
      },
    };
    const subTotalRowStyle = {
      font: { bold: true, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'E6E6E6' } }, 
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  

    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { 
          horizontal: 'center', 
          vertical: 'center', 
      }, 
      border: {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
      }
    };

    const ws_data = [];
    const merges = [];


    ws_data.push([
      'AOW', // Placeholder for the new vertical title column A
      'High Level Output',
      'Key Performance Indicators', null, null, null, null,
      'Total Budget (USD)',
    ]);
    ws_data.push([
      null, null, // Two placeholders now
      'Description', 'Type', 'Geographic Location', 'Target', 'Budget (USD)', null,
    ]);

    // 2. Define Header Merges
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }); // AOW
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }); // High Level Output
    merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 6 } }); // Key Performance Indicators
    merges.push({ s: { r: 0, c: 7 }, e: { r: 1, c: 7 } }); // Total Budget (USD)

    let currentRowIndex = 2; // Start adding data from the 3rd row (index 2)


    this.actualWps.forEach(wp => {
      const wpCode = wp.ost_wp.wp_official_code;
      const wpItems = this.allData[wpCode] || [];
      const isValidItem = wpItems.filter(d => d.category == 'OUTPUT');
      // if (wpItems.length === 0) return; // Skip if no data

      if(isValidItem.length){

     
      const wpStartRow = currentRowIndex; // Mark the starting row for this WP

      // 3. Loop through items and build rows
      wpItems.forEach((item, itemIndex) => {
        if(item.category == 'OUTPUT') {
          const startRowForItem = currentRowIndex;
          const wpTitleCell = wp.ost_wp.acronym;

          if (item.quantitative_indicators && item.quantitative_indicators.length > 0) {
              const numIndicators = item.quantitative_indicators.length;
              item.quantitative_indicators.forEach((indicator, indicatorIndex) => {
                  const isFirstIndicator = (indicatorIndex === 0);
                  let row;
                  
                  
                  if (isFirstIndicator) {
                      row = [
                          wpTitleCell,
                          item.title,
                          indicator.description,
                          indicator.type?.name || 'N/A',
                          this.getScope(indicator, 'item'),
                          this.getTargetValue(indicator?.targets),
                          this.summaryBudgetsIndicator[wpCode]?.[item.id]?.[indicator?.id] || 0,
                          this.summaryBudgets[wpCode]?.[item.id] || 0,
                      ];
                  } else {
                      row = [
                          wpTitleCell, // This will always be null here
                          null,
                          indicator.description,
                          indicator.type?.name || 'N/A',
                          this.getScope(indicator, 'item'),
                          this.getTargetValue(indicator?.targets),
                          this.summaryBudgetsIndicator[wpCode]?.[item.id]?.[indicator?.id] || 0,
                          null,
                      ];
                  }
                  ws_data.push(row);
                  currentRowIndex++;
              });

              // Rowspan for 'High Level Output' and 'Total Budget'
              if (numIndicators > 1) {
                  merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numIndicators - 1, c: 1 } });
                  merges.push({ s: { r: startRowForItem, c: 7 }, e: { r: startRowForItem + numIndicators - 1, c: 7 } });
              }
          }
          // else  {
          //   ws_data.push([
          //     wpTitleCell,
          //     item.title, 'No quantitative indicators available', null, null, null, null,
          //     this.summaryBudgets[wpCode]?.[item.id] || 0,
          //   ]);
          //   merges.push({ s: { r: startRowForItem, c: 2 }, e: { r: startRowForItem, c: 6 } });
          //   currentRowIndex++;
          // }
        }
      });

      if (currentRowIndex > wpStartRow) {
        ws_data.push([
            null,
            'HLO budget subtotal', null, null, null, null, null,
            this.roundNumber(this.summaryBudgetsTotal[wpCode]) || 0,
        ]);
        merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 6 } });
        currentRowIndex++;
      }
      const wpEndRow = currentRowIndex - 1; 
      if (currentRowIndex > wpStartRow) {
         merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
      }
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!merges'] = merges;


  ws['!cols'] = [
    { wch: 8 },  // A: Narrow column for vertical WP title
    { wch: 40 }, // B: High Level Output
    { wch: 30 }, // C: Description
    { wch: 30 }, // D: Type
    { wch: 30 }, // E: Geographic Location
    { wch: 10 }, // F: Target
    { wch: 15 }, // G: Budget (USD)
    { wch: 20 }, // H: Total Budget (USD)
  ];


  ws['!rows'] = []; 

  for (let R = 0; R < ws_data.length; ++R) {
    const isHeader = R < 2;
    const isSubtotal = ws_data[R][1] === 'HLO budget subtotal';

    if (isHeader) {
      ws['!rows'][R] = { hpt: 30 };
    } else if (isSubtotal) {
      ws['!rows'][R] = { hpt: 25 };
    } else {
      ws['!rows'][R] = { hpt: 50 };
    }

    for (let C = 0; C < ws_data[R].length; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cell_address];
      if (!cell) continue; // 🟢 Skip empty cells safely
  
      if (R < 2) {
        // Header rows (first two rows)
        cell.s = headerStyle;
      } else if (
        ws_data[R][1] === 'HLO budget subtotal' // 🟢 Detect subtotal rows by value
      ) {
        cell.s = subTotalRowStyle;
      } else {
        cell.s = dataCellStyle;
      }
    }
  }

    merges.forEach(merge => {
      // Find our vertical merges (column 0 to column 0)
      if (merge.s.c === 0 && merge.e.c === 0) {
          const cellAddress = XLSX.utils.encode_cell(merge.s);
          if(ws[cellAddress]) {
              ws[cellAddress].s = wpVerticalTitleStyle;
          }
      }
    });
    return ws

   
  }


//  async generateExcelCenterHLO(partner_code: number) {
//     const headerStyle = {
//       font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
//       alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
//       fill: { fgColor: { rgb: '2B3C53' } },
//       border: {
//           top: { style: 'thin' },
//           bottom: { style: 'thin' },
//           left: { style: 'thin' },
//           right: { style: 'thin' },
//       },
//     };
  
//     const dataCellStyle = {
//       alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
//       border: {
//           top: { style: 'thin' },
//           bottom: { style: 'thin' },
//           left: { style: 'thin' },
//           right: { style: 'thin' },
//       },
//     };
//     const subTotalRowStyle = {
//       font: { bold: true, color: { rgb: '000000' } },
//       fill: { fgColor: { rgb: 'E6E6E6' } }, 
//       alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
//       border: {
//         top: { style: 'thin' },
//         bottom: { style: 'thin' },
//         left: { style: 'thin' },
//         right: { style: 'thin' },
//       },
//     };
  

//     const wpVerticalTitleStyle = {
//       font: { bold: true, color: { rgb: "FFFFFF" } },
//       fill: { fgColor: { rgb: '2B3C53' } },
//       alignment: { 
//           horizontal: 'center', 
//           vertical: 'center', 
//       }, 
//       border: {
//           top: { style: 'thin' }, bottom: { style: 'thin' },
//           left: { style: 'thin' }, right: { style: 'thin' },
//       }
//     };

//     const ws_data = [];
//     const merges = [];


//     ws_data.push([
//       'AOW', // Placeholder for the new vertical title column A
//       'High Level Output',
//       'Key Performance Indicators', null, null, null, null,
//       'Total Budget (USD)',
//     ]);
//     ws_data.push([
//       null, null, // Two placeholders now
//       'Description', 'Type', 'Geographic Location', 'Target', 'Budget (USD)', null,
//     ]);

//     // 2. Define Header Merges
//     merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }); // AOW
//     merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }); // High Level Output
//     merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 6 } }); // Key Performance Indicators
//     merges.push({ s: { r: 0, c: 7 }, e: { r: 1, c: 7 } }); // Total Budget (USD)

//     let currentRowIndex = 2; // Start adding data from the 3rd row (index 2)

//   const  indicatorTogelvalue = await this.constantsRepository.findOne({where: { id: 3 }})
 
//     this.actualWps.forEach(wp => {
//       const wpCode = wp.ost_wp.wp_official_code;
      
//       const wpItemsa = this.partnersData[partner_code][wpCode] || [];
//       let  isValidItem
//        if( indicatorTogelvalue?.value == '1')
//         isValidItem = wpItemsa.filter(d => d.category == 'OUTPUT' && d?.pooled_centers?.map((d:any)=>d.code).includes(partner_code));
//        else
//        isValidItem = wpItemsa.filter(d => d.category == 'OUTPUT');
//        // if (wpItems.length === 0) return; // Skip if no data

//       if(isValidItem.length){

//       const wpStartRow = currentRowIndex; // Mark the starting row for this WP

//       // 3. Loop through items and build rows
//       isValidItem.forEach((item, itemIndex) => {
//         if(item.category == 'OUTPUT') {
//           const startRowForItem = currentRowIndex;
//           const wpTitleCell = wp.ost_wp.acronym;

//           if (item.quantitative_indicators && item.quantitative_indicators.length > 0) {
//               const numIndicators = item.quantitative_indicators.length;
//               item.quantitative_indicators.forEach((indicator, indicatorIndex) => {
//                   const isFirstIndicator = (indicatorIndex === 0);
//                   let row;
                  
                  
//                   if (isFirstIndicator) {
//                       row = [
//                           wpTitleCell,
//                           item.title,
//                           indicator.description,
//                           indicator.type?.name || 'N/A',
//                           this.getScope(indicator, 'item'),
//                           this.getTargetValue(indicator?.targets),
//                           this.displayBudgetValuesIndicator[partner_code][wpCode]?.[item.id]?.[indicator?.id] || 0,
//                           this.displayBudgetValuesItemIndicator[partner_code][wpCode]?.[item.id] || 0,
//                       ];
//                   } else {
//                       row = [
//                           wpTitleCell, // This will always be null here
//                           null,
//                           indicator.description,
//                           indicator.type?.name || 'N/A',
//                           this.getScope(indicator, 'item'),
//                           this.getTargetValue(indicator?.targets),
//                           this.displayBudgetValuesIndicator[partner_code][wpCode]?.[item.id]?.[indicator?.id] || 0,
//                           null,
//                       ];
//                   }
//                   ws_data.push(row);
//                   currentRowIndex++;
//               });

//               // Rowspan for 'High Level Output' and 'Total Budget'
//               if (numIndicators > 1) {
//                   merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numIndicators - 1, c: 1 } });
//                   merges.push({ s: { r: startRowForItem, c: 7 }, e: { r: startRowForItem + numIndicators - 1, c: 7 } });
//               }
//           }
//           // else {
//           //   ws_data.push([
//           //     wpTitleCell,
//           //     item.title, 'No quantitative indicators available', null, null, null, null,
//           //     this.displayBudgetValuesItemIndicator[partner_code][wpCode]?.[item.id] || 0,
//           //   ]);
//           //   merges.push({ s: { r: startRowForItem, c: 2 }, e: { r: startRowForItem, c: 6 } });
//           //   currentRowIndex++;
//           // }
//         }
//       });

//       if (currentRowIndex > wpStartRow) {
//         ws_data.push([
//             null,
//             'HLO budget Subtotal', null, null, null, null, null,
//             this.wp_budgets[partner_code][wpCode] || 0,
//         ]);
//         merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 6 } });
//         currentRowIndex++;
//       }
//       const wpEndRow = currentRowIndex - 1; 
//       if (currentRowIndex > wpStartRow) {
//          merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
//       }
//     }
//   });

//   const ws = XLSX.utils.aoa_to_sheet(ws_data);
//   ws['!merges'] = merges;


//   ws['!cols'] = [
//     { wch: 8 },  // A: Narrow column for vertical WP title
//     { wch: 40 }, // B: High Level Output
//     { wch: 30 }, // C: Description
//     { wch: 30 }, // D: Type
//     { wch: 30 }, // E: Geographic Location
//     { wch: 10 }, // F: Target
//     { wch: 15 }, // G: Budget (USD)
//     { wch: 20 }, // H: Total Budget (USD)
//   ];


//   ws['!rows'] = []; 

//   for (let R = 0; R < ws_data.length; ++R) {
//     const isHeader = R < 2;
//     const isSubtotal = ws_data[R][1] === 'HLO budget Subtotal';

//     if (isHeader) {
//       ws['!rows'][R] = { hpt: 30 };
//     } else if (isSubtotal) {
//       ws['!rows'][R] = { hpt: 25 };
//     } else {
//       ws['!rows'][R] = { hpt: 50 };
//     }

//     for (let C = 0; C < ws_data[R].length; ++C) {
//       const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
//       const cell = ws[cell_address];
//       if (!cell) continue; // 🟢 Skip empty cells safely
  
//       if (R < 2) {
//         // Header rows (first two rows)
//         cell.s = headerStyle;
//       } else if (
//         ws_data[R][1] === 'HLO budget Subtotal' // 🟢 Detect subtotal rows by value
//       ) {
//         cell.s = subTotalRowStyle;
//       } else {
//         cell.s = dataCellStyle;
//       }
//     }
//   }

//     merges.forEach(merge => {
//       // Find our vertical merges (column 0 to column 0)
//       if (merge.s.c === 0 && merge.e.c === 0) {
//           const cellAddress = XLSX.utils.encode_cell(merge.s);
//           if(ws[cellAddress]) {
//               ws[cellAddress].s = wpVerticalTitleStyle;
//           }
//       }
//     });
//     return ws

   
//   }

generateExcelCenterHLO(partner_code: number) {
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: '2B3C53' } },
    border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
    },
  };

  const dataCellStyle = {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
    },
  };
  const subTotalRowStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'E6E6E6' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };


  const wpVerticalTitleStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: '2B3C53' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  };

  const ws_data: any[][] = [];
  const merges: any[] = [];

  ws_data.push([
    'AOW',
    'High Level Output',
    'Key Performance Indicators', null, null, null, null,
    'Total Budget (USD)',
  ]);
  ws_data.push([
    null, null,
    'Description', 'Type', 'Geographic Location', 'Target', 'Budget (USD)', null,
  ]);

  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 6 } });
  merges.push({ s: { r: 0, c: 7 }, e: { r: 1, c: 7 } });

  let currentRowIndex = 2;

  this.actualWps.forEach(wp => {
    const wpCode = wp.ost_wp.wp_official_code;
    const wpItems = this.partnersData[partner_code][wpCode] || [];
    const validItems = wpItems.filter(d => d.category == 'OUTPUT');

    if (!validItems.length) return;

    const wpStartRow = currentRowIndex; 

    validItems.forEach((item) => {
      if (item.category == 'OUTPUT') {
        const startRowForItem = currentRowIndex;
        const wpTitleCell = wp.ost_wp.acronym;

        if (item.quantitative_indicators && item.quantitative_indicators.length > 0) {
          const numIndicators = item.quantitative_indicators.length;

          item.quantitative_indicators.forEach((indicator, indicatorIndex) => {
            const isFirstIndicator = (indicatorIndex === 0);

            const row = [
              wpTitleCell,
              isFirstIndicator ? item.title : null,
              indicator.description,
              indicator.type?.name || 'N/A',
              this.getScope(indicator, 'item'),
              this.getTargetValue(indicator?.targets,String(partner_code)),
              this.displayBudgetValuesIndicator[partner_code][wpCode]?.[item.id]?.[indicator?.id] || 0,
              null,
            ];

            ws_data.push(row);
            currentRowIndex++;
          });

          if (numIndicators > 1) {
            merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numIndicators - 1, c: 1 } });
          }

          const totalBudgetCellRow = startRowForItem + 1;
          const totalBudgetFormula = `SUM(G${totalBudgetCellRow}:G${totalBudgetCellRow + item.quantitative_indicators.length - 1})`;
          ws_data[startRowForItem][7] = { f: totalBudgetFormula };

          if (numIndicators > 1) {
            merges.push({ s: { r: startRowForItem, c: 7 }, e: { r: startRowForItem + numIndicators - 1, c: 7 } });
          }
        }
      }
    });

    if (currentRowIndex > wpStartRow) {
      const subtotalFirstDataRow = wpStartRow; 
      const subtotalLastDataRow = currentRowIndex - 1; 

      const subtotalFormula = `SUM(H${subtotalFirstDataRow + 1}:H${subtotalLastDataRow + 1})`;

      ws_data.push([
        null,
        'HLO budget subtotal', null, null, null, null, null,
        { f: subtotalFormula },
      ]);

      merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 6 } });
      currentRowIndex++;
    }

    const wpEndRow = currentRowIndex - 1;
    if (currentRowIndex > wpStartRow) {
      merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!merges'] = merges;

  ws['!cols'] = [
    { wch: 8 },
    { wch: 40 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
  ];

  ws['!rows'] = [];

  for (let R = 0; R < ws_data.length; ++R) {
    const isHeader = R < 2;
    const isSubtotal = ws_data[R][1] === 'HLO budget subtotal';

    if (isHeader) {
      ws['!rows'][R] = { hpt: 30 };
    } else if (isSubtotal) {
      ws['!rows'][R] = { hpt: 25 };
    } else {
      ws['!rows'][R] = { hpt: 50 };
    }

    for (let C = 0; C < ws_data[R].length; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cell_address];
      if (!cell) continue;

      if (R < 2) {
        cell.s = headerStyle;
      } else if (ws_data[R][1] === 'HLO budget subtotal') {
        cell.s = subTotalRowStyle;
      } else {
        cell.s = dataCellStyle;
      }
    }
  }

  merges.forEach(merge => {
    if (merge.s.c === 0 && merge.e.c === 0) {
      const cellAddress = XLSX.utils.encode_cell(merge.s);
      if (ws[cellAddress]) {
        ws[cellAddress].s = wpVerticalTitleStyle;
      }
    }
  });

  return ws;
}
    
    

  generateExcelSummaryOutcome() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '2B3C53' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      'AOW',
      'Outcome title',
      'Key Performance Indicators', null, null,
    ]);
    ws_data.push([
      null, null,
      'Type', 'Geographic Location', 'Target',
    ]);
  
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }); // AOW
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }); // Outcome title
    merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 4 } }); // KPI group
  
    let currentRowIndex = 2;
  
    this.actualWps.forEach(wp => {
      const wpCode = wp.ost_wp.wp_official_code;
      const wpItems = this.allData[wpCode] || [];
      const isValidItem = wpItems.filter(d => d.category == 'OUTCOME' || d.category == 'EOI');
      if (!isValidItem.length) return;
  
      const wpStartRow = currentRowIndex;
  
      isValidItem.forEach(item => {
        const startRowForItem = currentRowIndex;
  
        if (item.quantitative_indicators && item.quantitative_indicators.length > 0) {
          item.quantitative_indicators.forEach((indicator, i) => {
            const isFirstIndicator = i === 0;
            const row = isFirstIndicator
              ? [
                  wp.ost_wp.acronym,
                  item.title,
                  indicator?.type?.name || 'N/A',
                  this.getScope(indicator, 'item'),
                  this.getTargetValue(indicator?.targets),
                ]
              : [
                  wp.ost_wp.acronym,
                  null,
                  indicator?.type?.name || 'N/A',
                  this.getScope(indicator, 'item'),
                  this.getTargetValue(indicator?.targets),
                ];
            ws_data.push(row);
            currentRowIndex++;
          });
  
          merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: currentRowIndex - 1, c: 1 } });
  
        } 
        // else {
        //   ws_data.push([
        //     wp.ost_wp.acronym,
        //     item.title,
        //     'No quantitative indicators available',
        //     null,
        //     null,
        //   ]);
        //   merges.push({ s: { r: startRowForItem, c: 2 }, e: { r: startRowForItem, c: 4 } });
        //   currentRowIndex++;
        // }
      });
  
      const wpEndRow = currentRowIndex - 1;
      if (wpEndRow >= wpStartRow) {
        merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
      }
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
  
    ws['!cols'] = [
      { wch: 10 }, // A: AOW
      { wch: 40 }, // B: Outcome title
      { wch: 25 }, // C: Type
      { wch: 30 }, // D: Geographic Location
      { wch: 25 }, // E: Target
    ];
  
    ws['!rows'] = [];
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R < 2;
      ws['!rows'][R] = { hpt: isHeader ? 30 : 45 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = isHeader ? headerStyle : dataCellStyle;
      }
    }
  
    merges.forEach(m => {
      if (m.s.c === 0 && m.e.c === 0) {
        const cellAddr = XLSX.utils.encode_cell(m.s);
        if (ws[cellAddr]) ws[cellAddr].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }
  




  generateExcelSummarySynergyPrograms() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '2B3C53' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      'AOW',
      'Program or Accelerator',
      'High Level Output',
      'Brief description of how each Program/Accelerator contributes',
    ]);
  
  
    let currentRowIndex = 1;
  
    this.actualWps.forEach(wp => {
      const wpCode = wp.ost_wp.wp_official_code + '-synergy-programs';
      const wpItems = this.allData[wpCode] || [];
      if (!wpItems.length) return; // Skip if no data
      const wpStartRow = currentRowIndex;

  
        wpItems.forEach(item => {
    
              const row = [
                wp.ost_wp.acronym,
                item.flow.title,
                item.result.title,
                item.description
              ];
              ws_data.push(row);
              currentRowIndex++;
        });
        const wpEndRow = currentRowIndex - 1;
        if (wpEndRow >= wpStartRow) {
          merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
        }
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
  
    ws['!cols'] = [
      { wch: 10 }, // A: AOW
      { wch: 40 }, // B: Outcome title
      { wch: 25 }, // C: Type
      { wch: 30 }, // D: Geographic Location
    ];
  
    ws['!rows'] = [];
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R < 1;
      ws['!rows'][R] = { hpt: isHeader ? 60 : 45 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = isHeader ? headerStyle : dataCellStyle;
      }
    }
  
    merges.forEach(m => {
      if (m.s.c === 0 && m.e.c === 0) {
        const cellAddr = XLSX.utils.encode_cell(m.s);
        if (ws[cellAddr]) ws[cellAddr].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }




  generateExcelSummaryPartner() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { fgColor: { rgb: "2B3C53" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const subTotalRowStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "E6E6E6" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push(["AOW", "Partner", "Center", "Geographic location", "Total Budget (USD)"]);
    let currentRowIndex = 1; 
  
    this.actualWps.forEach((wp) => {
      const wpCode = wp.ost_wp.wp_official_code + "-partners";
      const wpItems = this.allData[wpCode] || [];
  
      const validPartners = wpItems.filter((item) => item.selectedCountries && item.selectedCountries.length > 0);
      if (validPartners.length === 0) return;
  
      const wpStartRow = currentRowIndex;
  
      validPartners.forEach((item) => {
        const startRowForItem = currentRowIndex;
        const wpTitleCell = wp.ost_wp.acronym;
  
        if (item.selectedCountries && item.selectedCountries.length > 0) {
          const numCountries = item.selectedCountries.length;
  
          item.selectedCountries.forEach((country, idx) => {
            ws_data.push([
              idx === 0 ? wpTitleCell : null,
              idx === 0 ? item.name : null,
              country.centerName,
              country.countries || "N/A",
              idx === 0 ? this.summaryBudgets[wpCode]?.[item.id] || 0 : null,
            ]);
            currentRowIndex++;
          });
  
          // Merge partner name column (B)
          if (numCountries > 1) {
            merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numCountries - 1, c: 1 } });
            // Merge budget column (E)
            merges.push({ s: { r: startRowForItem, c: 4 }, e: { r: startRowForItem + numCountries - 1, c: 4 } });
          }
        } 
      });
  
      // ---- SUBTOTAL ROW ----
      ws_data.push([
        null,
        "Contracted partners subtotal",
        null,
        null,
        this.roundNumber(this.summaryBudgetsTotal[wpCode]) || 0,
      ]);
  
      merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 3 } }); // Merge B-D for subtotal
      currentRowIndex++;
  
      const wpEndRow = currentRowIndex - 1;
      merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!merges"] = merges;
  
    ws["!cols"] = [
      { wch: 8 },  // A
      { wch: 40 }, // B
      { wch: 30 }, // C
      { wch: 30 }, // D
      { wch: 30 }, // E
    ];
  
    ws["!rows"] = [];
  
    // ---- STYLING ----
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R === 0;
      const isSubtotal = ws_data[R][1] === "Contracted partners subtotal";
  
      ws["!rows"][R] = { hpt: isHeader ? 30 : isSubtotal ? 25 : 50 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;
  
        if (isHeader) cell.s = headerStyle;
        else if (isSubtotal) cell.s = subTotalRowStyle;
        else cell.s = dataCellStyle;
      }
    }
  
    // ---- STYLE FOR WP VERTICAL TITLE ----
    merges.forEach((merge) => {
      if (merge.s.c === 0 && merge.e.c === 0) {
        const cellAddress = XLSX.utils.encode_cell(merge.s);
        if (ws[cellAddress]) ws[cellAddress].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }

  // generateExcelCenterPartner(partner_code: any) {
  //   const headerStyle = {
  //     font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
  //     alignment: { horizontal: "center", vertical: "center", wrapText: true },
  //     fill: { fgColor: { rgb: "2B3C53" } },
  //     border: {
  //       top: { style: "thin" },
  //       bottom: { style: "thin" },
  //       left: { style: "thin" },
  //       right: { style: "thin" },
  //     },
  //   };
  
  //   const dataCellStyle = {
  //     alignment: { horizontal: "center", vertical: "center", wrapText: true },
  //     border: {
  //       top: { style: "thin" },
  //       bottom: { style: "thin" },
  //       left: { style: "thin" },
  //       right: { style: "thin" },
  //     },
  //   };
  
  //   const subTotalRowStyle = {
  //     font: { bold: true, color: { rgb: "000000" } },
  //     fill: { fgColor: { rgb: "E6E6E6" } },
  //     alignment: { horizontal: "center", vertical: "center", wrapText: true },
  //     border: {
  //       top: { style: "thin" },
  //       bottom: { style: "thin" },
  //       left: { style: "thin" },
  //       right: { style: "thin" },
  //     },
  //   };
  
  //   const wpVerticalTitleStyle = {
  //     font: { bold: true, color: { rgb: "FFFFFF" } },
  //     fill: { fgColor: { rgb: "2B3C53" } },
  //     alignment: { horizontal: "center", vertical: "center" },
  //     border: {
  //       top: { style: "thin" },
  //       bottom: { style: "thin" },
  //       left: { style: "thin" },
  //       right: { style: "thin" },
  //     },
  //   };
  
  //   const ws_data = [];
  //   const merges = [];
  
  //   ws_data.push(["AOW", "Partner", "High level outputs", "Geographic location", "Total Budget (USD)"]);
  //   let currentRowIndex = 1; 
  
  //   this.actualWps.forEach((wp) => {
  //     const wpCode = wp.ost_wp.wp_official_code + "-partners";
  //     const wpItems = this.partnersData[partner_code][wpCode] || [];
  
  //     const validPartners = wpItems
  //     .filter(
  //       (item) =>
  //         item.selectedCountries &&
  //         item.selectedCountries.length > 0 &&
  //         item.selectedCountries.some((country) => country.centerCode === partner_code)
  //     )
  //     .map((item) => ({
  //       ...item,
  //       selectedCountries: item.selectedCountries.filter(
  //         (country) => country.centerCode === partner_code
  //       ),
  //     }));
  //     if (validPartners.length === 0) return;
  
  //     const wpStartRow = currentRowIndex;
  
  //     validPartners.forEach((item) => {
  //       const startRowForItem = currentRowIndex;
  //       const wpTitleCell = wp.ost_wp.acronym;
  
  //       if (item.selectedCountries && item.selectedCountries.length > 0) {
  //         const numCountries = item.selectedCountries.length;
  
  //         item.selectedCountries.forEach((country, idx) => {
  //           ws_data.push([
  //             idx === 0 ? wpTitleCell : null,
  //             idx === 0 ? item.name : null,

  //             item.results,
  //             country.countries || "N/A",
  //             idx === 0 ? this.budgetValues[partner_code][wpCode]?.[item.id] || 0 : null,
  //           ]);
  //           currentRowIndex++;
  //         });
  
  //         // Merge partner name column (B)
  //         if (numCountries > 1) {
  //           merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numCountries - 1, c: 1 } });
  //           // Merge budget column (E)
  //           merges.push({ s: { r: startRowForItem, c: 4 }, e: { r: startRowForItem + numCountries - 1, c: 4 } });
  //         }
  //       } 
  //     });
  
  //     ws_data.push([
  //       null,
  //       "Contracted Partners budget Subtotal",
  //       null,
  //       null,
  //       this.wp_budgets[partner_code][wpCode] || 0,
  //     ]);
  
  //     merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 3 } }); // Merge B-D for subtotal
  //     currentRowIndex++;
  
  //     const wpEndRow = currentRowIndex - 1;
  //     merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
  //   });
  
  //   const ws = XLSX.utils.aoa_to_sheet(ws_data);
  //   ws["!merges"] = merges;
  
  //   ws["!cols"] = [
  //     { wch: 8 },  // A
  //     { wch: 40 }, // B
  //     { wch: 60 }, // C
  //     { wch: 30 }, // D
  //     { wch: 15 }, // E
  //   ];
  
  //   ws["!rows"] = [];
  
  //   // ---- STYLING ----
  //   for (let R = 0; R < ws_data.length; ++R) {
  //     const isHeader = R === 0;
  //     const isSubtotal = ws_data[R][1] === "Contracted Partners budget Subtotal";
  
  //     ws["!rows"][R] = { hpt: isHeader ? 30 : isSubtotal ? 25 : 70 };
  
  //     for (let C = 0; C < ws_data[R].length; ++C) {
  //       const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
  //       const cell = ws[cellAddress];
  //       if (!cell) continue;
  
  //       if (isHeader) cell.s = headerStyle;
  //       else if (isSubtotal) cell.s = subTotalRowStyle;
  //       else cell.s = dataCellStyle;
  //     }
  //   }
  
  //   // ---- STYLE FOR WP VERTICAL TITLE ----
  //   merges.forEach((merge) => {
  //     if (merge.s.c === 0 && merge.e.c === 0) {
  //       const cellAddress = XLSX.utils.encode_cell(merge.s);
  //       if (ws[cellAddress]) ws[cellAddress].s = wpVerticalTitleStyle;
  //     }
  //   });
  
  //   return ws;
  // }

  generateExcelCenterPartner(partner_code: any) {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { fgColor: { rgb: "2B3C53" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const subTotalRowStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "E6E6E6" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const ws_data: (string | number | { f: string })[][] = [];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  
    ws_data.push(["AOW", "Partner", "High level outputs", "Geographic location", "Total Budget (USD)"]);
    let currentRowIndex = 1;
  
    this.actualWps.forEach((wp) => {
      const wpCode = wp.ost_wp.wp_official_code + "-partners";
      const wpItems = this.partnersData[partner_code][wpCode] || [];
  
      const validPartners = wpItems
        .filter(
          (item) =>
            item.selectedCountries &&
            item.selectedCountries.length > 0 &&
            item.selectedCountries.some((country) => country.centerCode === partner_code)
        )
        .map((item) => ({
          ...item,
          selectedCountries: item.selectedCountries.filter(
            (country) => country.centerCode === partner_code
          ),
        }));
  
      if (validPartners.length === 0) return;
  
      const wpStartRow = currentRowIndex;
  
      validPartners.forEach((item) => {
        const startRowForItem = currentRowIndex;
        const wpTitleCell = wp.ost_wp.acronym;
  
        if (item.selectedCountries && item.selectedCountries.length > 0) {
          const numCountries = item.selectedCountries.length;
  
          item.selectedCountries.forEach((country, idx) => {
            ws_data.push([
              idx === 0 ? wpTitleCell : null,
              idx === 0 ? item.name : null,
              item.results,
              country.countries || "N/A",
              idx === 0 ? this.displayBudgetValues[partner_code][wpCode]?.[item.id] || 0 : null,
            ]);
            currentRowIndex++;
          });
  
          if (numCountries > 1) {
            merges.push({ s: { r: startRowForItem, c: 1 }, e: { r: startRowForItem + numCountries - 1, c: 1 } });
            merges.push({ s: { r: startRowForItem, c: 4 }, e: { r: startRowForItem + numCountries - 1, c: 4 } });
          }
        }
      });
  
      const subtotalRowIndex = currentRowIndex;
      ws_data.push([
        null,
        "Contracted partners subtotal",
        null,
        null,
        { f: `SUM(E${wpStartRow + 1}:E${currentRowIndex})` },
      ]);
  
      merges.push({ s: { r: subtotalRowIndex, c: 1 }, e: { r: subtotalRowIndex, c: 3 } });
      currentRowIndex++;
  
      const wpEndRow = currentRowIndex - 1;
      merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!merges"] = merges;
  
    ws["!cols"] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 60 },
      { wch: 30 },
      { wch: 15 },
    ];
  
    ws["!rows"] = [];
  
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R === 0;
      const isSubtotal = ws_data[R][1] === "Contracted partners subtotal";
  
      ws["!rows"][R] = { hpt: isHeader ? 30 : isSubtotal ? 25 : 70 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;
  
        if (isHeader) cell.s = headerStyle;
        else if (isSubtotal) cell.s = subTotalRowStyle;
        else cell.s = dataCellStyle;
      }
    }
  
    merges.forEach((merge) => {
      if (merge.s.c === 0 && merge.e.c === 0) {
        const cellAddress = XLSX.utils.encode_cell(merge.s);
        if (ws[cellAddress]) ws[cellAddress].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }
  

  generateExcelSummaryCrossCutting () {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '2B3C53' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      'AOW',
      'Cost elements',
      'Total budget (USD)',
    ]);
  
  
    let currentRowIndex = 1;
  
    this.actualWps.forEach(wp => {
      const wpCode = wp.ost_wp.wp_official_code + '-Cross-Cutting';
      const wpItems = this.allData[wpCode] || [];
      if (!wpItems.length) return; // Skip if no data
      const wpStartRow = currentRowIndex;

  
        wpItems.forEach(item => {
    
              const row = [
                wp.ost_wp.acronym,
                item.title,
                this.summaryBudgets[wpCode][
                  item.id
                ]
              ];
              ws_data.push(row);
              currentRowIndex++;
        });
        const wpEndRow = currentRowIndex - 1;
        if (wpEndRow >= wpStartRow) {
          merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
        }
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
  
    ws['!cols'] = [
      { wch: 10 }, // A: AOW
      { wch: 40 }, 
      { wch: 25 }, 
    ];
  
    ws['!rows'] = [];
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R < 1;
      ws['!rows'][R] = { hpt: isHeader ? 60 : 45 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = isHeader ? headerStyle : dataCellStyle;
      }
    }
  
    merges.forEach(m => {
      if (m.s.c === 0 && m.e.c === 0) {
        const cellAddr = XLSX.utils.encode_cell(m.s);
        if (ws[cellAddr]) ws[cellAddr].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }



  generateExcelCenterCrossCutting(partner_code: number) {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '2B3C53' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: '2B3C53' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      'AOW',
      'Cross-Cutting',
      'Description',
      'Pooled Funded (USD)',
    ]);
  
  
    let currentRowIndex = 1;
  
    this.actualWps.forEach(wp => {
      const wpCode = wp.ost_wp.wp_official_code + '-Cross-Cutting';
      const wpItems = this.partnersData[partner_code][wpCode] || [];
      if (!wpItems.length) return; // Skip if no data
      const wpStartRow = currentRowIndex;

  
        wpItems.forEach(item => {
              const row = [
                wp.ost_wp.acronym,
                item.title,
                item.description,
                this.budgetValues[partner_code][wpCode][
                  item.id
                ]
              ];
              ws_data.push(row);
              currentRowIndex++;
        });
        const wpEndRow = currentRowIndex - 1;
        if (wpEndRow >= wpStartRow) {
          merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow, c: 0 } });
        }
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
  
    ws['!cols'] = [
      { wch: 10 }, // A: AOW
      { wch: 40 }, 
      { wch: 25 }, 
    ];
  
    ws['!rows'] = [];
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R < 1;
      ws['!rows'][R] = { hpt: isHeader ? 60 : 45 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = isHeader ? headerStyle : dataCellStyle;
      }
    }
  
    merges.forEach(m => {
      if (m.s.c === 0 && m.e.c === 0) {
        const cellAddr = XLSX.utils.encode_cell(m.s);
        if (ws[cellAddr]) ws[cellAddr].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }

  stripHtml(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
  }

  generateExcelSummaryMelia() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { fgColor: { rgb: "2B3C53" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const subTotalRowStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "E6E6E6" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      "AOW",
      "MELIA study",
      "Supported outcomes",
      "Geographic location",
      "Total Budget (USD)",
    ]);
    let currentRowIndex = 1;
  
    this.actualWps.forEach((wp) => {
      const wpCode = wp.ost_wp.wp_official_code + "-melia";
      const wpItems = this.allData[wpCode] || [];
  
      if (wpItems.length === 0) return;
  
      const wpStartRow = currentRowIndex;
  
      wpItems.forEach((item) => {
        ws_data.push([
          wp.ost_wp.acronym,
          item.title || "N/A",
          this.stripHtml(item.supported_outcome) || "N/A",
          this.getScope(item, "melia") || "N/A",
          this.summaryBudgets[wpCode]?.[item.id] || 0,
        ]);
  
        currentRowIndex++;
      });
  
      ws_data.push([
        null,
        "MELIA budget subtotal",
        null,
        null,
        this.summaryBudgetsTotal[wpCode] || 0,
      ]);
  
      merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 3 } });
      currentRowIndex++;
  
      const wpEndRow = currentRowIndex - 1;
      merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow , c: 0 } });
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!merges"] = merges;
  
    ws["!cols"] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 30 },
      { wch: 30 },
      { wch: 25 },
    ];
  
    ws["!rows"] = [];
  
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R === 0;
      const isSubtotal = ws_data[R][1] === "MELIA budget subtotal";
  
      ws["!rows"][R] = { hpt: isHeader ? 30 : isSubtotal ? 25 : 60 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;
  
        if (isHeader) cell.s = headerStyle;
        else if (isSubtotal) cell.s = subTotalRowStyle;
        else cell.s = dataCellStyle;
      }
    }
  
    merges.forEach((merge) => {
      if (merge.s.c === 0 && merge.e.c === 0) {
        const cellAddress = XLSX.utils.encode_cell(merge.s);
        if (ws[cellAddress]) ws[cellAddress].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }


  generateExcelSummaryProject() {
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { fgColor: { rgb: "2B3C53" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const dataCellStyle = {
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const subTotalRowStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "E6E6E6" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const wpVerticalTitleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2B3C53" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };
  
    const ws_data = [];
    const merges = [];
  
    ws_data.push([
      "AOW",
      "Project title",
      "High Level Output title",
      "W3/Bilateral Project (USD)"
    ]);

    let currentRowIndex = 1;
  
    this.actualWps.forEach((wp) => {
      const wpCode = wp.ost_wp.wp_official_code + "-project";
      const wpItems = this.allData[wpCode] || [];
  
      if (wpItems.length === 0) return;
  
      const wpStartRow = currentRowIndex;
  
      wpItems.forEach((item) => {
        ws_data.push([
          wp.ost_wp.acronym,
          item.name || "N/A",
          item.result || "N/A",
          this.summaryBudgets[wpCode]?.[item.id] || 0
        ]);
  
        currentRowIndex++;
      });
  
      ws_data.push([
        null,
        "W3/Bilateral budget subtotal",
        null,
        this.summaryBudgetsTotal[wpCode] || 0,
      ]);
  
      merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 2 } });
      currentRowIndex++;
  
      const wpEndRow = currentRowIndex - 1;
      merges.push({ s: { r: wpStartRow, c: 0 }, e: { r: wpEndRow , c: 0 } });
    });
  
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!merges"] = merges;
  
    ws["!cols"] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 30 },
      { wch: 30 },
      { wch: 25 },
    ];
  
    ws["!rows"] = [];
  
    for (let R = 0; R < ws_data.length; ++R) {
      const isHeader = R === 0;
      const isSubtotal = ws_data[R][1] === "W3/Bilateral budget subtotal";
  
      ws["!rows"][R] = { hpt: isHeader ? 30 : isSubtotal ? 25 : 60 };
  
      for (let C = 0; C < ws_data[R].length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;
  
        if (isHeader) cell.s = headerStyle;
        else if (isSubtotal) cell.s = subTotalRowStyle;
        else cell.s = dataCellStyle;
      }
    }
  
    merges.forEach((merge) => {
      if (merge.s.c === 0 && merge.e.c === 0) {
        const cellAddress = XLSX.utils.encode_cell(merge.s);
        if (ws[cellAddress]) ws[cellAddress].s = wpVerticalTitleStyle;
      }
    });
  
    return ws;
  }
  
}

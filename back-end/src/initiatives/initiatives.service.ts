import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { CreateInitiativeDto } from './dto/create-initiative.dto';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { HttpService } from '@nestjs/axios';
import { Initiative } from 'src/entities/initiative.entity';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { CreateWorkPackageDto } from './dto/create-workpackage.dto';
import { UpdateWorkPackageDto } from './dto/update-workpackage.dto';
import { InitiativeRoles } from 'src/entities/initiative-roles.entity';
import { EmailService } from 'src/email/email.service';
import { User, userRole } from 'src/entities/user.entity';
import { ChatMessageRepositoryService } from './chat-group-repository/chat-group-repository.service';
import { History } from 'src/entities/history.entity';
import * as XLSX from 'xlsx-js-style';
import { join } from 'path';
import { createReadStream, unlink } from 'fs';
import { Result } from 'src/entities/result.entity';
import { Submission, SubmissionStatus } from 'src/entities/submission.entity';
import { PhasesService } from 'src/phases/phases.service';
import { WpBudget } from 'src/entities/wp-budget.entity';
import { Organization } from 'src/entities/organization.entity';
import { Archive } from 'src/entities/archive.entity';
import { INITIATIVE_ROLES, LEAD_ROLES, isLeadRole } from '../shared/roles';

@Injectable()
export class InitiativesService {
  offical(query) {
    if (query.initiative_id != null) {
      if (query.initiative_id.charAt(0) == '0') {
        const id = query.initiative_id.substring(1);
        if (id <= 9) {
          return 'INIT-0' + id;
        }
      } else {
        if (query.initiative_id <= 9) {
          return 'INIT-0' + query.initiative_id;
        } else {
          return 'INIT-' + query.initiative_id;
        }
      }
    }
    return query.initiative_id;
  }
  sort(query): any {
    if (query?.sort) {
      let obj = {};
      const sorts = query.sort.split(',');
      obj['init.' + sorts[0]] = sorts[1];
      return obj;
    } else return { 'init.official_code': 'ASC' };
  }
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Initiative)
    public initiativeRepository: Repository<Initiative>,
    @InjectRepository(Archive)
    public archiveRepository: Repository<Archive>,
    @InjectRepository(WorkPackage)
    private workPackageRepository: Repository<WorkPackage>,
    @InjectRepository(InitiativeRoles)
    public iniRolesRepository: Repository<InitiativeRoles>,
    @InjectRepository(History)
    public historyRepository: Repository<History>,
    @InjectRepository(User)
    public userRepository: Repository<User>,
    @InjectRepository(Result)
    public resultRepository: Repository<Result>,
    @InjectRepository(WpBudget)
    public WpBudgetRepository: Repository<WpBudget>,
    @InjectRepository(Submission)
    public submissionRepository: Repository<Submission>,
    @InjectRepository(Organization)
    public organizationRepository: Repository<Organization>,
    private emailService: EmailService,
    private chatGroupRepositoryService: ChatMessageRepositoryService,
  ) {}

  async getClarisaPrograms() {
    const initiativesData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/cgiar-entities?version=2')
        .pipe(
          map((response: any) =>
            response.data.filter(
              (item: any) =>
                item.level == 1 &&
                !(
                  item.entity_type?.name === 'Initiative' ||
                  item.entity_type?.name === 'CRP'
                ),
            ),
          ),
        ),
    );

    const currenetInitiatives = await this.initiativeRepository.find();

    const clarisaExistCodes = currenetInitiatives.map((d) => d.official_code);

    return initiativesData.filter((d) => !clarisaExistCodes.includes(d.code));
  }
  //(new sync)
  async syncInit(data: any) {
    const initiativesData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/cgiar-entities?version=2')
        .pipe(
          map((response: any) =>
            response.data.filter((item: any) => item.level == 1),
          ),
        ),
    );

    const filtered_clarisa_initiatives = initiativesData.filter((d) =>
      data.ids.includes(d.code),
    );

    for (const element of filtered_clarisa_initiatives) {
      let entity;
      entity = await this.initiativeRepository.findOne({
        where: {
          official_code: element.code,
        },
      });
      if (!entity) {
        entity = this.initiativeRepository.create();
        entity.name = element.name;
        entity.official_code = element.code;
        entity.short_name = element.short_name;
        entity.synchronized = true;
        await this.initiativeRepository.save(entity);
      }
    }
    this.importWorkPackages(data);
  }

  //(old sync)
  // @Cron(CronExpression.EVERY_WEEK)
  // async importInitiatives() {
  //   const initiativesData = await firstValueFrom(
  //     this.httpService
  //       .get('https://api.clarisa.cgiar.org/api/initiatives')
  //       .pipe(
  //         map((d: any) => d.data),
  //         catchError((error: AxiosError) => {
  //           throw new InternalServerErrorException();
  //         }),
  //       ),
  //   );

  //   initiativesData.forEach(async (element) => {
  //     const { id, stages, ...parameters } = element;
  //     const entity = await this.initiativeRepository.findOneBy({ id });
  //     if (entity != null) {
  //       this.update(id, { ...parameters });
  //     } else {
  //       this.create({ id, ...parameters });
  //     }
  //   });
  // }

  @Cron(CronExpression.EVERY_WEEK)
  async importWorkPackages(programIds: any) {
    console.log(programIds);
    let workPackagesData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/cgiar-entities?version=2')
        .pipe(
          map((response: any) =>
            response.data.filter((item: any) => item.level == 2),
          ),
        ),
    );

    let filteredWorkPackages = workPackagesData.filter((wp) =>
      programIds.ids.includes(wp.parent.code),
    );

    for (let element of filteredWorkPackages) {
      let entity = await this.workPackageRepository.findOneBy({
        wp_official_code: element.code,
        initiative_offical_code: element.parent.code,
      });

      let initiative = await this.initiativeRepository.findOne({
        where: {
          official_code: element.parent.code,
        },
      });

      if (!entity) {
        entity = this.workPackageRepository.create();
        entity.name = element.name;
        entity.acronym = element.acronym;
        entity.initiative_id = initiative.id;
        entity.wp_official_code = element.parent.code + '-' + element.code;
        entity.initiative_status = initiative.status;
        entity.initiative_offical_code = element.parent.code;
        await this.workPackageRepository.save(entity);
      }
    }
  }

  create(createInitiativeDto: CreateInitiativeDto) {
    const newInitiative = this.initiativeRepository.create({
      ...createInitiativeDto,
    });
    this.initiativeRepository.save(newInitiative);
  }

  update(id: number, updateInitiativeDto: UpdateInitiativeDto) {
    this.initiativeRepository.update(id, { ...updateInitiativeDto });
  }

  createWorkPackage(createWorkPackageDto: CreateWorkPackageDto) {
    const newWorkPackage = this.workPackageRepository.create({
      ...createWorkPackageDto,
    });
    this.workPackageRepository.save(newWorkPackage);
  }

  updateWorkPackage(wp_id: number, updateWorkPackageDto: UpdateWorkPackageDto) {
    this.workPackageRepository.update(wp_id, { ...updateWorkPackageDto });
  }

  findAll() {
    return this.initiativeRepository.find({
      where: {
        archived: false,
      },
      order: { official_code: 'asc' },
    });
  }

async findAllFull(query: any, req: any) {
  try {
    const take = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * take;
    const userId = req.user.id;

    // ---------- 1) MAIN QUERY: initiatives WITHOUT latest_submission join ----------
    // Build base query selecting only initiative + small joins. Avoid joining one-to-many relations
    // (like roles) unless required by filters to reduce result-set explosion.
    const baseQb = this.initiativeRepository.createQueryBuilder('init').where(
      'init.archived = :archived',
      { archived: false },
    );

    // center status and latest_history are lightweight single-valued relations used in list view
    baseQb.leftJoinAndSelect('init.center_status', 'center_status');
    baseQb.leftJoinAndSelect('init.latest_history', 'latest_history');
    baseQb.leftJoinAndSelect('latest_history.user', 'user');

    // Only join roles (one-to-many) when filtering by role or user membership to avoid
    // row multiplication which hurts pagination performance.
   baseQb.leftJoinAndSelect('init.roles', 'roles');

    // name filter
    if (query.name && String(query.name).trim() !== '') {
      baseQb.andWhere('init.name LIKE :name', {
        name: `%${String(query.name).trim()}%`,
      });
    }

    // initiative_id filter
    if (query.initiative_id != null && query.initiative_id !== '') {
      const id = String(query.initiative_id);
      baseQb.andWhere('init.official_code IN (:...initiative_id)', {
        initiative_id: [
          `INIT-0${id}`,
          `INIT-${id}`,
          `PLAT-${id}`,
          `PLAT-0${id}`,
          `SGP-${id}`,
          `SGP-0${id}`,
          `SP0${id}`,
          `SP${id}`,
        ],
      });
    }

    // my_role / my_ini
    if (query?.my_role) {
      if (Array.isArray(query.my_role)) {
        baseQb.andWhere('roles.role IN (:...my_role)', {
          my_role: query.my_role,
        });
      } else {
        baseQb.andWhere('roles.role = :my_role', {
          my_role: query.my_role,
        });
      }
      baseQb.andWhere('roles.user_id = :userId', { userId });
    } else if (query?.my_ini === 'true') {
      baseQb.andWhere('roles.user_id = :userId', { userId });
    }

    // NOTE: here I'm only applying status logic that uses INIT columns.
    // Anything that depends on latest_submission.status we will handle in 2nd query or skip.
    if (query.status === 'Draft') {
      baseQb.andWhere(
        new Brackets((qb) => {
          qb.where('init.last_submitted_at IS NULL')
            .orWhere('init.last_update_at != init.last_submitted_at');
        }),
      );
    } else if (query.status && query.status !== 'Draft') {
      // simplest option: leave this out here and handle in 2nd query,
      // or if you must filter at DB level, you'll need a subquery on latest_submission
      // (I explain trade-offs below).
    }

    // count query (cheap)
    const countQb = baseQb
      .clone()
      .select('COUNT(DISTINCT init.id)', 'cnt')
      .orderBy(undefined)
      .skip(undefined)
      .take(undefined);

    // data query (page of initiatives)
    const dataQb = baseQb
      .clone()
      .orderBy(this.sort(query))
      .take(take)
      .skip(skip);

    const [initiatives, rawCount] = await Promise.all([
      dataQb.getMany(),
      countQb.getRawOne<{ cnt: string }>(),
    ]);

    const total = Number(rawCount?.cnt ?? 0);
    if (!initiatives.length) {
      return { result: [], count: total };
    }

    // ---------- 2) SECOND QUERY: latest_submissions for these initiatives only ----------
    const initiativeIds = initiatives.map((i) => i.latest_submission_id);

    const submissionQb = this.submissionRepository
      .createQueryBuilder('latest_submission')
      // select only essential columns to reduce payload
      .select([
        'latest_submission.id',
        'latest_submission.initiative_id',
        'latest_submission.status',
        'latest_submission.created_at',
        'latest_submission.phase_id',
      ])
      .where('latest_submission.id IN (:...ids)', { ids: initiativeIds })
    
    // If you still want to filter by status using latest_submission:
    if (query.status && query.status !== 'Draft') {
      console.log('query.status',query.status)
      submissionQb.andWhere('latest_submission.status = :status', {
        status: query.status,

      });
    } else if (query.status === 'Draft') {
      // optional: if you had a "Draft" in latest_submission too
      // submissionQb.andWhere('latest_submission.status = :status', { status: 'Draft' });
    }

    const latestSubmissions = await submissionQb.getMany();

    // Build a map: initiative_id -> latest_submission
    const submissionByInitiative = new Map<
      number | string,
      typeof latestSubmissions[number]
    >();

    for (const sub of latestSubmissions) {
      // adjust property name to match your entity (initiativeId / initiative_id)
      const key = (sub as any).initiative_id ?? (sub as any).initiativeId;
      if (key != null) {
        submissionByInitiative.set(key, sub);
      }
    }

    // ---------- 3) MERGE: attach latest_submission to initiatives ----------
    for (const ini of initiatives) {
      const submission = submissionByInitiative.get(ini.id);
      // This assumes the relation name is "latest_submission"
      (ini as any).latest_submission = submission ?? null;
    }
    let result;
    if(query.status && query.status !== 'Draft')
      result = initiatives.filter(d=>d.latest_submission)
    else result= initiatives;
        return {
          result: result,
          count: total,
        };
      } catch (error) {
        console.log(error)
        throw new BadRequestException('Connection Error');
      }
}


  async exportInitForTrack() {
    try {
      const data = await this.initiativeRepository
        .createQueryBuilder('init')
        .leftJoinAndSelect('init.latest_submission', 'latest_submission')
        .leftJoinAndSelect('init.center_status', 'center_status')
        .leftJoinAndSelect('init.history', 'history')
        .leftJoinAndSelect('history.user', 'user')
        .getMany();

      data.forEach((d) => {
        d.history = d.history.reduce((prevValue: any, currValue: any) => {
          return prevValue.id > currValue.id
            ? prevValue.user.full_name
            : currValue.user.full_name;
        }, '-');
      });

      const { finaldata, merges } = this.prepareTemplate(data);
      const file_name = 'Initiative.xlsx';
      var wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(finaldata);
      ws['!merges'] = merges;

      this.appendStyleForXlsx(ws);

      this.autofitColumnsXlsx(finaldata, ws);

      XLSX.utils.book_append_sheet(wb, ws, 'Initiative');
      // ensure Workbook exists
        wb.Workbook = wb.Workbook || {} as any;
       (wb.Workbook as any).CalcPr = { fullCalcOnLoad: 1 };
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
    } catch (error) {
      throw new BadRequestException('Connection Error');
    }
  }

  appendStyleForXlsx(ws: XLSX.WorkSheet) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? '');
    const rowCount = range.e.r;
    const columnCount = range.e.c;

    for (let row = 0; row <= rowCount; row++) {
      for (let col = 0; col <= columnCount; col++) {
        let cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (col != 2 && row != rowCount) {
          ws[cellRef].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }

        if (row == rowCount && col == 0) {
          ws[cellRef].s = {
            font: {
              bold: true,
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }

        if (row === 0 || row === 1) {
          // Format headers and names
          ws[cellRef].s = {
            ...ws[cellRef].s,
            fill: { fgColor: { rgb: '0f212f' } },
            font: { color: { rgb: 'ffffff' }, bold: true },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          };
        }

        if (col >= 3 && row > 1 && row < rowCount) {
          ws[cellRef].z = '#,##0';
        }
      }
    }
  }

  autofitColumnsXlsx(
    json: any[],
    worksheet: XLSX.WorkSheet,
    header?: string[],
  ) {
    const jsonKeys = header ? header : Object.keys(json[0]);

    let objectMaxLength = [];
    for (let i = 0; i < json.length; i++) {
      let objValue = json[i];
      for (let j = 0; j < jsonKeys.length; j++) {
        if (typeof objValue[jsonKeys[j]] == 'number') {
          objectMaxLength[j] = 10;
        } else {
          const l = objValue[jsonKeys[j]]
            ? objValue[jsonKeys[j]].length + 5
            : 0;

          objectMaxLength[j] = objectMaxLength[j] >= l ? objectMaxLength[j] : l;
        }
      }

      let key = jsonKeys;
      for (let j = 0; j < key.length; j++) {
        objectMaxLength[j] =
          objectMaxLength[j] >= key[j].length
            ? objectMaxLength[j]
            : key[j].length + 1; //for Flagged column
      }
    }

    const wscols = objectMaxLength.map((w) => {
      return { width: w };
    });

    //row height
    worksheet['!rows'] = [];
    worksheet['!rows'].push({
      //for header
      hpt: 20,
    });
    worksheet['!rows'].push({
      //for header
      hpt: 20,
    });

    worksheet['!cols'] = wscols;
  }

  prepareTemplate(data: any) {
    let finaldata = [this.getTemplate()];

    let merges = [];
    for (let index = 0; index < 4; index++) {
      merges.push({
        s: { c: index, r: 0 },
        e: { c: index, r: 1 },
      });
    }

    data.forEach((element: any) => {
      const template = this.getTemplate();
      this.mapTemplate(template, element);
      finaldata.push(template);
    });
    return { finaldata, merges };
  }

  getTemplate() {
    return {
      'Program ID': null,
      'Program Title': null,
      'Updated by': null,
      'Current status': null,
    };
  }

  mapTemplate(template, element) {
    template['Program ID'] = element?.official_code;
    template['Program Title'] = element?.name;
    template['Updated by'] = element?.history;
    template['Current status'] =
      new Date(element.last_submitted_at).getTime() != null &&
      new Date(element.last_update_at).getTime() ==
        new Date(element.last_submitted_at).getTime()
        ? element?.latest_submission
          ? element?.latest_submission?.status
          : 'Draft'
        : 'Draft';
  }

  async getAllFull() {
    const finalResult = await this.initiativeRepository
      .createQueryBuilder('init')
      .where('init.archived = :archived', { archived: false })
      .leftJoinAndSelect('init.roles', 'roles')
      .leftJoinAndSelect('init.latest_submission', 'latest_submission')
      .leftJoinAndSelect('init.center_status', 'center_status')
      .getMany();

    return {
      result: finalResult,
    };
  }

async findOne(id: number) {
  // 1) Load initiative & the cheap relations
  const initiative = await this.initiativeRepository.findOne({
    where: { id },
    relations: [
      'organizations',
      'roles',
      'roles.organizations',
      'center_status',
      // ⚠️  no latest_submission here
    ],
  });

  if (!initiative) return null;

  // 2) Load only the latest submission, optimized
  const latestSubmission = await this.submissionRepository.findOne({
    where: { initiative: { id } }, // or { initiativeId: id } depending on your model
    order: { created_at: 'DESC' }, // or whatever date column you use
    // select: ['id', 'title', 'created_at'], // limit columns if needed
  });

  // 3) Attach it manually
  return { ...initiative, latest_submission: latestSubmission };
}


  async updateRoles(initiative_id, id, initiativeRoles: InitiativeRoles, user) {
    const currentRole = await this.iniRolesRepository.findOne({
      where: { id: initiativeRoles.id },
    });

    let errorMsg = null;
    const found_roles = await this.iniRolesRepository.findOne({
      where: { initiative_id, id },
    });
    if (!found_roles) throw new NotFoundException();

    if (found_roles.user_id != initiativeRoles.user_id) {
      let userRole = await this.iniRolesRepository.findOne({
        where: {
          initiative_id: initiative_id,
          user_id: initiativeRoles.user_id,
        },
      });
      if (userRole) {
        throw new BadRequestException(
          'User already exists as a team member for this initiative.',
        );
      }
    }
    if (user.role != 'admin' && initiativeRoles.role == INITIATIVE_ROLES.LEAD)
      errorMsg = 'Only Admin Can Add Leader';

    if (user.role != 'admin' && currentRole.role == INITIATIVE_ROLES.LEAD)
      errorMsg = 'Admin Only Can edit Leader';

    if (!errorMsg) {
      return await this.iniRolesRepository.save(initiativeRoles);
    } else {
      throw new BadRequestException(errorMsg);
    }
  }

  async getInitHistory(initiative_id: number) {
    return await this.historyRepository.find({
      where: {
        initiative_id: initiative_id,
      },
      relations: [
        'user',
        'initiative',
        'organization',
        'work_package',
        'period',
      ],
      order: {
        id: 'DESC',
      },
    });
  }

  async deleteRole(initiative_id, id, user) {
    const roles = await this.iniRolesRepository.findOne({
      where: { initiative_id, id },
    });

    let errorMsg = null;
    if (roles.role == INITIATIVE_ROLES.LEAD && user.role != 'admin')
      errorMsg = 'Only admin can delete leader';

    if (roles && !errorMsg) return await this.iniRolesRepository.remove(roles);
    else throw new NotFoundException();
  }

  async setRole(initiative_id, role: InitiativeRoles, user) {
    let errorMsg = null;
    let init = await this.initiativeRepository.findOne({
      where: { id: initiative_id },
      relations: ['roles'],
    });

    let userRole = await this.iniRolesRepository.findOne({
      where: { initiative_id: initiative_id, user_id: role.user_id },
    });
    if (userRole) {
      throw new BadRequestException(
        'User already exists as a team member for this initiative.',
      );
    }

    if (!init) throw new NotFoundException();
    const newRole = {
      initiative_id: initiative_id,
      user_id: +role?.user_id ? role?.user_id : null,
      email: role.email.toLowerCase(),
      role: role.role,
      organizations: role.organizations,
    };
    //To the user that was added by the Admin or Leader/Coordinator

    if (user.role != 'admin' && role.role == INITIATIVE_ROLES.LEAD)
      errorMsg = 'Only Admin Can Add Leader';

    if (!errorMsg) {
      return await this.iniRolesRepository.save(newRole, { reload: true }).then(
        async (data) => {
          const user = await this.userRepository.findOne({
            where: { id: data.user_id },
          });
          const init = await this.initiativeRepository.findOne({
            where: { id: data.initiative_id },
          });

          if (
            data.role == INITIATIVE_ROLES.COORDINATOR ||
            data.role == INITIATIVE_ROLES.CONTRIBUTOR ||
            data.role == INITIATIVE_ROLES.CO_LEADER   ||
            data.role == INITIATIVE_ROLES.FINANCIAL_FOCAL_POINT
          ) {
            this.emailService.sendEmailTobyVarabel(
              user,
              1,
              init,
              data.role,
              null,
              null,
              null,
              null,
              null,
            );
          } else {
            this.emailService.sendEmailTobyVarabel(
              user,
              2,
              init,
              data.role,
              null,
              null,
              null,
              null,
              null,
            );
          }
        },
        (error) => {
          console.error('error ==>>', error);
        },
      );
    } else {
      throw new BadRequestException(errorMsg);
    }
  }

  async idUserHavePermissionToJoinChatGroup(initiative_id: number, user: User) {
    try {
      if (user.role === userRole.ADMIN) return true;
      const result = await this.iniRolesRepository.findOne({
        where: {
          user_id: user.id,
          initiative_id,
        },
      });
      return [INITIATIVE_ROLES.CONTRIBUTOR, INITIATIVE_ROLES.LEAD].includes(result?.role as INITIATIVE_ROLES);
    } catch (error) {
      return false;
    }
  }

  async idUserHavePermissionSeeChat(initiative_id: number, user: User) {
    try {
      if (user.role === userRole.ADMIN) return true;
      const result = await this.iniRolesRepository.findOne({
        where: {
          user_id: user.id,
          initiative_id,
        },
      });
      return [INITIATIVE_ROLES.CONTRIBUTOR, INITIATIVE_ROLES.LEAD].includes(result?.role as INITIATIVE_ROLES);
    } catch (error) {
      return false;
    }
  }

  async idUserHavePermissionToAdd(initiative_id: number, user: User) {
    if (user.role == userRole.ADMIN) return true;

    const isMember = await this.iniRolesRepository
      .findOne({
        where: {
          user_id: user.id,
          initiative_id,
        },
      })
      .then((r) => [INITIATIVE_ROLES.CONTRIBUTOR, INITIATIVE_ROLES.LEAD].includes(r.role as INITIATIVE_ROLES))
      .catch(() => false);

    return isMember;
  }

  async idUserHavePermissionToEdit(message_id: number, user: User) {
    if (user.role == userRole.ADMIN) return true;
    const messageRecord = await this.chatGroupRepositoryService.getMessagesById(
      message_id,
    );

    const isMember = await this.iniRolesRepository
      .findOne({
        where: {
          user_id: user.id,
          initiative_id: messageRecord.initiative_id,
        },
      })
      .then((r) => [INITIATIVE_ROLES.CONTRIBUTOR, INITIATIVE_ROLES.LEAD].includes(r.role as INITIATIVE_ROLES))
      .catch(() => false);

    const message = await this.chatGroupRepositoryService.getMessagesById(
      message_id,
    );

    return isMember && message.user_id === user.id;
  }

  async idUserHavePermissionToDelete(message_id: number, user: User) {
    return this.idUserHavePermissionToEdit(message_id, user);
  }

  async getInitPartnersBudget(query: any) {
    // Build a map of organization code -> org entity for name/acronym lookup
    const allOrgs = await this.organizationRepository.find();
    const orgMap = new Map<string, Organization>();
    allOrgs.forEach((o) => orgMap.set(String(o.code), o));

    // Find the latest approved submission per initiative that has porb_data
    const qb = this.submissionRepository
      .createQueryBuilder('sub')
      .innerJoinAndSelect('sub.initiative', 'init')
      .where('sub.status = :status', { status: SubmissionStatus.APPROVED })
      .andWhere('sub.porb_data IS NOT NULL')
      .andWhere("sub.porb_data != ''")
      .orderBy('sub.id', 'DESC');

    if (query.initiatives) {
      const ids = Array.isArray(query.initiatives)
        ? query.initiatives
        : [query.initiatives];
      qb.andWhere('init.id IN (:...ids)', { ids });
    }

    const approvedSubs = await qb.getMany();

    // Keep only the latest per initiative
    const seenInit = new Set<number>();
    const latestSubs: Submission[] = [];
    for (const sub of approvedSubs) {
      if (seenInit.has(sub.initiative_id)) continue;
      seenInit.add(sub.initiative_id);
      latestSubs.push(sub);
    }

    // Parse porb_data and build the same shape the frontend expects
    const partnerFilter = query.partners
      ? new Set(
          (Array.isArray(query.partners) ? query.partners : [query.partners]).map(String),
        )
      : null;

    const result: any[] = [];

    for (const sub of latestSubs) {
      let porbData: any;
      try {
        porbData = typeof sub.porb_data === 'string'
          ? JSON.parse(sub.porb_data)
          : sub.porb_data;
      } catch {
        continue;
      }

      // Aggregate budget per center from porb_data
      const centerBudgets = new Map<string, number>();

      for (const aow of porbData.aows || []) {
        for (const center of aow.centers || []) {
          const code = String(center.center_code);
          if (partnerFilter && !partnerFilter.has(code)) continue;

          let budget = 0;
          for (const h of center.hlos || []) budget += Number(h.hlo_budget) || 0;
          for (const p of center.partners || []) budget += Number(p.partner_budget) || 0;
          for (const m of center.melias || []) budget += Number(m.melia_budget) || 0;
          for (const a of center.anaplan || []) budget += Number(a.porb_budget) || 0;
          for (const c of center.cross_cutting || []) budget += Number(c.budget) || 0;

          centerBudgets.set(code, (centerBudgets.get(code) || 0) + budget);
        }
      }

      // Add bilateral budgets (center-level)
      for (const b of porbData.bilaterals || []) {
        const code = String(b.center_id);
        if (partnerFilter && !partnerFilter.has(code)) continue;
        centerBudgets.set(code, (centerBudgets.get(code) || 0) + (Number(b.bilateral_budget) || 0));
      }

      // Build wp_budget-compatible array
      const wpBudget = Array.from(centerBudgets.entries()).map(
        ([orgCode, total]) => {
          const org = orgMap.get(orgCode);
          return {
            organization_code: orgCode,
            total,
            organization: org
              ? { code: org.code, acronym: org.acronym, name: org.name }
              : { code: orgCode, acronym: orgCode, name: orgCode },
          };
        },
      );

      result.push({
        official_code: sub.initiative?.official_code,
        name: sub.initiative?.name,
        submissions: [{ id: sub.id, wp_budget: wpBudget }],
      });
    }

    // Fall back to old wp_budget query for initiatives without porb_data
    const porbInitIds = new Set(result.map((r) => r.official_code));
    const oldData = await this.getInitPartnersBudgetLegacy(query);
    for (const item of oldData) {
      if (!porbInitIds.has(item.official_code)) {
        result.push(item);
      }
    }

    // Sort by official_code
    result.sort((a, b) => (a.official_code || '').localeCompare(b.official_code || ''));

    return result;
  }

  /**
   * Legacy budget summary query using wp_budget from old submissions (no porb_data).
   */
  private async getInitPartnersBudgetLegacy(query: any) {
    const initiative = await this.initiativeRepository
      .createQueryBuilder('init')
      .leftJoinAndSelect('init.submissions', 'submissions')
      .where(
        'submissions.id = (' +
          this.submissionRepository
            .createQueryBuilder('submissions')
            .select('MAX(id)')
            .where('submissions.initiative_id = init.id')
            .getQuery() +
          ')',
      )
      .andWhere('submissions.status = :status', {
        status: SubmissionStatus.APPROVED,
      })
      .andWhere('(submissions.porb_data IS NULL OR submissions.porb_data = :empty)', { empty: '' })
      .select([
        'init.official_code',
        'init.name',
        'submissions.id',
        'wp_budget.*',
      ])
      .addSelect('SUM(wp_budget.budget)', 'wp_budget_total')
      .leftJoinAndSelect('submissions.wp_budget', 'wp_budget')
       .leftJoinAndSelect('wp_budget.workPackage', 'wp_budget_wp')
      .leftJoinAndSelect('wp_budget.phase', 'phase')
      .andWhere('phase.id = :phase_id', { phase_id: query.phase_id })
      .leftJoinAndSelect('wp_budget.organization', 'organization')
      .andWhere(`LOWER(wp_budget_wp.name) NOT LIKE '%project%'`)
      .andWhere(
        new Brackets((qb) => {
          if (query.initiatives) {
            qb.andWhere('init.id IN (:initiatives)', {
              initiatives: query.initiatives,
            });
          }
          if (query.partners) {
            qb.andWhere('organization.code IN (:partners)', {
              partners: query.partners,
            });
          }
        }),
      )

      .groupBy('init.id , wp_budget.organization_code')
      .getMany();

    return initiative;
  }
  async getInitExport(
    phase_id: number,
    statusFilter?: string | string[],
  ) {
    const allowedStatuses = Object.values(SubmissionStatus);
    const normalizedStatuses = Array.isArray(statusFilter)
      ? statusFilter
      : statusFilter
      ? statusFilter.split(',').map((status) => status.trim())
      : [];

    const statuses = normalizedStatuses.filter((status): status is SubmissionStatus =>
      allowedStatuses.includes(status as SubmissionStatus),
    );

    const fallbackStatuses =
      statuses.length > 0 ? statuses : [SubmissionStatus.APPROVED];

    const data = await this.initiativeRepository
      .createQueryBuilder('init')
      .leftJoinAndSelect('init.latest_submission', 'submission')
      .where('submission.phase_id = :phase_id', { phase_id })
      .andWhere('submission.status IN (:...statuses)', {
        statuses: fallbackStatuses,
      })
      .andWhere('init.archived = :archived', { archived: false })
      .getMany();

    return data;
  }

  async exportBudgetSummary(query: any) {
    const data = await this.getInitPartnersBudget(query);

    const { finaldata, merges } = await this.prepareUserTemplate(
      data,
      query.partners,
    );

    const file_name = 'Total-Summary.xlsx';
    var wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(finaldata);

    merges.push({
      s: { c: 0, r: finaldata.length + 1 },
      e: { c: 1, r: finaldata.length + 1 },
    });

    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, 'Total Summary');

    XLSX.utils.sheet_add_aoa(ws, [['Total, USD']], { origin: -1 });

    this.getPartnerTotalBudget(ws);

    this.getInitiativeTotalBudget(ws);

    this.appendStyleForXlsx(ws);

    this.autofitColumnsXlsx(finaldata, ws);
    // ensure Workbook exists
     wb.Workbook = wb.Workbook || {} as any;
    (wb.Workbook as any).CalcPr = { fullCalcOnLoad: 1 };
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
  }

  async getTemplateBudgetSummary(partnersFiltered: any[]) {
    let header = {
      'Official Code': null,
      'Program title': null,
      'Total budget, USD': null,
    };

    let partners: Organization[] = [];

    if (partnersFiltered)
      partners = await this.organizationRepository.find({
        where: {
          code: In([partnersFiltered]),
        },
        order: {
          acronym: 'ASC',
        },
      });
    else
      partners = await this.organizationRepository.find({
        order: {
          acronym: 'ASC',
        },
      });

    partners.forEach((d) => (header[d.acronym] = null));
    return header;
  }

  async mapTemplateBudgetSummary(template, element, partnersFiltered: any[]) {
    template['Official Code'] = element?.official_code;
    template['Program title'] = element?.name;
    template['Total budget, USD'] = null;

    let partners: Organization[] = [];

    if (partnersFiltered)
      partners = await this.organizationRepository.find({
        where: {
          code: In([partnersFiltered]),
        },
        order: {
          acronym: 'ASC',
        },
      });
    else
      partners = await this.organizationRepository.find({
        order: {
          acronym: 'ASC',
        },
      });

    for (let partner of partners) {
      element.submissions[0].wp_budget.some((d) => {
        if (d.organization_code === partner.code) {
          return (template[partner.acronym] = d.total);
        } else {
          return (template[partner.acronym] = 0);
        }
      });
    }
  }

  async prepareUserTemplate(data: any, partnersFiltered: any[]) {
    let finaldata = [await this.getTemplateBudgetSummary(partnersFiltered)];

    let partners: Organization[] = [];

    if (partnersFiltered)
      partners = await this.organizationRepository.find({
        where: {
          code: In([partnersFiltered]),
        },
        order: {
          acronym: 'ASC',
        },
      });
    else
      partners = await this.organizationRepository.find({
        order: {
          acronym: 'ASC',
        },
      });
    let merges = [];

    for (let index = 0; index < partners.length + 3; index++) {
      merges.push({
        s: { c: index, r: 0 },
        e: { c: index, r: 1 },
      });
    }

    for (let element of data) {
      const template: any = await this.getTemplateBudgetSummary(
        partnersFiltered,
      );
      await this.mapTemplateBudgetSummary(template, element, partnersFiltered);
      finaldata.push(template);
    }

    return { finaldata, merges };
  }

  getInitiativeTotalBudget(ws: any) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? '');
    const rowCount = range.e.r;
    const startCol = 2;
    const startRow = 2;

    for (let row = startRow; row <= rowCount; row++) {
      let cellRef = XLSX.utils.encode_cell({ r: row, c: startCol });
      let formula = this.getFormulaInitiativeTotalBudget(ws, row);
      ws[cellRef] = {
        t: 'n',
        f: '=' + `${formula}`,
        z: '#,##0',
        s: {
          font: {
            bold: true,
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
          },
        },
      };
    }
  }

  getFormulaInitiativeTotalBudget(ws: any, currentRow: number) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? '');

    const columnCount = range.e.c;
    const startCol = 3;

    let arrData = [];

    for (let col = startCol; col <= columnCount; col++) {
      let cellRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
      arrData.push(cellRef);
    }
    return arrData
      .map((d) => d + '+')
      .join('')
      .slice(0, -1);
  }

  getPartnerTotalBudget(ws: any) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? '');
    const rowCount = range.e.r;
    const columnCount = range.e.c;
    const startCount = 3;

    for (let col = startCount; col <= columnCount; col++) {
      let cellRef = XLSX.utils.encode_cell({ r: rowCount, c: col });
      let formula = this.getFormulaPartnerTotalBudget(ws, col);
      ws[cellRef] = {
        t: 'n',
        f: '=' + `${formula}`,
        z: '#,##0',
        s: {
          font: {
            bold: true,
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
          },
        },
      };
    }
  }

  getFormulaPartnerTotalBudget(ws: any, currentCol: number) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? '');

    const rowCount = range.e.r;
    const startRow = 2;

    let arrData = [];

    for (let row = startRow; row <= rowCount - 1; row++) {
      let cellRef = XLSX.utils.encode_cell({ r: row, c: currentCol });
      arrData.push(cellRef);
    }
    return arrData
      .map((d) => d + '+')
      .join('')
      .slice(0, -1);
  }
  async archiveInit(data: any) {
    for (let id of data.ids) {
      const init = await this.initiativeRepository.findOne({
        where: { id: id },
        relations: ['roles', 'latest_submission'],
      });

      const roles = await this.iniRolesRepository.find({
        where: { initiative_id: id },
        relations: ['user', 'organizations'],
      });

      const archived = this.archiveRepository.create();
      archived.data = JSON.stringify(roles);
      archived.initiative = init;

      await this.archiveRepository.save(archived).then(
        async () => {
          await this.initiativeRepository.update(id, {
            archived: true,
          });
        },
        (error) => {
          console.log('error => ', error);
          throw new BadRequestException(`something wrong`);
        },
      );
    }
  }
}

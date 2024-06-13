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
    } else return { 'init.id': 'ASC' };
  }
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Initiative)
    public initiativeRepository: Repository<Initiative>,
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
    private emailService: EmailService,
    private chatGroupRepositoryService: ChatMessageRepositoryService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async importInitiatives() {
    const initiativesData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/initiatives')
        .pipe(
          map((d: any) => d.data),
          catchError((error: AxiosError) => {
            throw new InternalServerErrorException();
          }),
        ),
    );

    initiativesData.forEach(async (element) => {
      const { id, stages, ...parameters } = element;
      const entity = await this.initiativeRepository.findOneBy({ id });
      if (entity != null) {
        this.update(id, { ...parameters });
      } else {
        this.create({ id, ...parameters });
      }
    });
  }

  async importWorkPackages() {
    const workPackagesData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/workpackages')
        .pipe(
          map((d: any) => d.data),
          catchError((error: AxiosError) => {
            throw new InternalServerErrorException();
          }),
        ),
    );

    workPackagesData.forEach(async (element) => {
      const entity = await this.workPackageRepository.findOneBy({
        wp_id: element.wp_id,
      });
      delete element.is_global;
      delete element.status;
      delete element.countries;
      delete element.regions;
      if (entity != null) {
        this.updateWorkPackage(element.wp_id, { ...element });
      } else {
        this.createWorkPackage({ ...element });
      }
    });
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
      order: { id: 'asc' },
    });
  }

  async findAllFull(query: any, req: any) {
    try {
      const take = query.limit || 10;
      const skip = (Number(query.page || 1) - 1) * take;
      const [finalResult, total] = await this.initiativeRepository
        .createQueryBuilder('init')
        .where(
          new Brackets((qb) => {
            qb.where('init.name like :name', { name: `%${query.name || ''}%` });
            if (query.initiative_id != undefined) {
              qb.andWhere('init.official_code IN (:...initiative_id)', {
                initiative_id: [
                  `INIT-0${query.initiative_id}`,
                  `INIT-${query.initiative_id}`,
                  `PLAT-${query.initiative_id}`,
                  `PLAT-0${query.initiative_id}`,
                  `SGP-${query.initiative_id}`,
                  `SGP-0${query.initiative_id}`,
                ],
              });
            }
            if (query?.my_role) {
              if (Array.isArray(query?.my_role)) {
                qb.andWhere('roles.role IN (:...my_role)', {
                  my_role: query.my_role,
                });
                qb.andWhere(`roles.user_id = ${req.user.id}`);
              } else {
                qb.andWhere('roles.role = :my_role', { my_role: query.my_role });
                qb.andWhere(`roles.user_id = ${req.user.id}`);
              }
            } else if (query?.my_ini == 'true') {
              qb.andWhere(`roles.user_id = ${req.user.id}`);
            }
          }),
        )
        .andWhere(
          new Brackets((qb) => {
            if (query.status) {
              if (query.status != 'Draft') {
                qb.andWhere('latest_submission.status = :status', {
                  status: query.status,
                });
                qb.andWhere('init.last_update_at = init.last_submitted_at');
              } else if (query.status == 'Draft') {
                qb.andWhere('init.last_submitted_at is null');
                qb.orWhere('init.last_update_at != init.last_submitted_at');
              }
            }
          }),
        )
        .orderBy(this.sort(query))
        .leftJoinAndSelect('init.roles', 'roles')
        .leftJoinAndSelect('init.latest_submission', 'latest_submission')
        .leftJoinAndSelect('init.center_status', 'center_status')
        .leftJoinAndSelect('init.history', 'history')
        .leftJoinAndSelect('history.user', 'user')
        .take(take)
        .skip(skip)
        .getManyAndCount();

      return {
        result: finalResult,
        count: total,
      };
    } catch (error) {
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

        data.forEach(d => {
          d.history = d.history.reduce((prevValue: any, currValue: any) => {
            return (prevValue.id > currValue.id ? prevValue.user.full_name : currValue.user.full_name);
          }, '-');
        })
        
      const { finaldata, merges } = this.prepareTemplate(data);
      const file_name = 'Initiative.xlsx';
      var wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(finaldata);
      ws['!merges'] = merges;
  

      this.appendStyleForXlsx(ws);

      this.autofitColumnsXlsx(finaldata,ws);

      XLSX.utils.book_append_sheet(wb, ws, 'Initiative');
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
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const rowCount = range.e.r;
    const columnCount = range.e.c;

    for (let row = 0; row <= rowCount; row++) {
      for (let col = 0; col <= columnCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });

        ws[cellRef].s = {
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
          },
        };


        if (row === 0 || row === 1) {
           // Format headers and names
          ws[cellRef].s = {
            ...ws[cellRef].s,
            fill: { fgColor: { rgb: '436280' } },
            font: { color: { rgb: 'ffffff' } ,  bold: true },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          };
        }
      }
    }
  }


  autofitColumnsXlsx(json: any[], worksheet: XLSX.WorkSheet, header?: string[]) {

    const jsonKeys = header ? header : Object.keys(json[0]);

    let objectMaxLength = []; 
    for (let i = 0; i < json.length; i++) {
      let objValue = json[i];
      for (let j = 0; j < jsonKeys.length; j++) {
        if (typeof objValue[jsonKeys[j]] == "number") {
          objectMaxLength[j] = 10;
        } else {
          const l = objValue[jsonKeys[j]] ? objValue[jsonKeys[j]].length + 5 : 0;

          objectMaxLength[j] = objectMaxLength[j] >= l ? objectMaxLength[j]: l;
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

    const wscols = objectMaxLength.map(w => { return { width: w} });

    //row height
    worksheet['!rows'] = [];
    worksheet['!rows'].push({ //for header
      hpt: 20
     })
     worksheet['!rows'].push({ //for header
      hpt: 20
     })

    worksheet["!cols"] = wscols;
  }

  prepareTemplate(data: any) {
    let finaldata = [this.getTemplate()];

    let merges = [
      {
        s: { c: 3, r: 0 },
        e: { c: 3, r: 0 },
      },
    ];

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
      'Initiative ID': null,
      'Initiative Title': null,
      'Updated by': null,
      'Current status': null,
    };
  }
  
  mapTemplate(template, element) {
    template['Initiative ID'] = element?.id;
    template['Initiative Title'] = element?.name;
    template['Updated by'] = element?.history;
    template['Current status'] = 
    new Date(element.last_submitted_at).getTime() != null &&
    new Date(element.last_update_at).getTime() == new Date(element.last_submitted_at).getTime()
      ? element?.latest_submission
       ? element?.latest_submission?.status
        : "Draft"
      : "Draft";
  }

  async getAllFull() {
    const finalResult = await this.initiativeRepository
      .createQueryBuilder('init')
      .leftJoinAndSelect('init.roles', 'roles')
      .leftJoinAndSelect('init.latest_submission', 'latest_submission')
      .leftJoinAndSelect('init.center_status', 'center_status')
      .getMany();

    return {
      result: finalResult,
    };
  }

  findOne(id: number) {
    return this.initiativeRepository.findOne({
      where: { id },
      relations: [
        'organizations',
        'roles',
        'roles.organizations',
        'center_status',
        'latest_submission',
      ],
      order: { id: 'desc' },
    });
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
    if (user.role != 'admin' && initiativeRoles.role == 'Leader')
      errorMsg = 'Only Admin Can Add Leader';

    if (user.role != 'admin' && currentRole.role == 'Leader')
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
        initiative_id: initiative_id
      },
      relations: ['user', 'initiative', 'organization', 'work_package', 'period'],
      order: {
        id: "DESC",
    },
    })
  } 

  async deleteRole(initiative_id, id) {
    const roles = await this.iniRolesRepository.findOne({
      where: { initiative_id, id },
    });
    if (roles) return await this.iniRolesRepository.remove(roles);
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

    if (user.role != 'admin' && role.role == 'Leader')
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
            data.role == 'Coordinator' ||
            data.role == 'Contributor' ||
            data.role == 'Co-leader'
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
      return ['Contributor', 'Leader', 'Contributor'].includes(result?.role);
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
      return ['Contributor', 'Leader', 'Contributor'].includes(result?.role);
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
      .then((r) => ['Contributor', 'Leader', 'Contributor'].includes(r.role))
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
      .then((r) => ['Contributor', 'Leader'].includes(r.role))
      .catch(() => false);

    const message = await this.chatGroupRepositoryService.getMessagesById(
      message_id,
    );

    return isMember && message.user_id === user.id;
  }

  async idUserHavePermissionToDelete(message_id: number, user: User) {
    return this.idUserHavePermissionToEdit(message_id, user);
  }
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
    private initiativeRepository: Repository<Initiative>,
    @InjectRepository(WorkPackage)
    private workPackageRepository: Repository<WorkPackage>,
    @InjectRepository(InitiativeRoles)
    public iniRolesRepository: Repository<InitiativeRoles>,
    @InjectRepository(History)
    public historyRepository: Repository<History>,
    @InjectRepository(User)
    public userRepository: Repository<User>,
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

  async getAllFull(query: any, req: any) {
    // const take = query.limit || 10;
    // const skip = (Number(query.page || 1) - 1) * take;
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

      .getManyAndCount();

    return {
      result: finalResult,
      count: total,
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

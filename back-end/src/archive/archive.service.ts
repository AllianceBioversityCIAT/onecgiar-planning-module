import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Archive } from 'src/entities/archive.entity';
import { Brackets, Repository } from 'typeorm';

@Injectable()
export class ArchiveService {

    constructor(
        @InjectRepository(Archive)
        public archiveRepository: Repository<Archive>
      ) {}
      sort(query): any {
        if (query?.sort) {
          let obj = {};
          const sorts = query.sort.split(',');
          obj['initiative.' + sorts[0]] = sorts[1];
          return obj;
        } else return { 'initiative.official_code': 'ASC' };
      }
    
    async findAll(query: any, req: any) {
        try {

          const take = query.limit || 10;
          const skip = (Number(query.page || 1) - 1) * take;
          const [finalResult, total] = await this.archiveRepository
            .createQueryBuilder('archive')
            .leftJoinAndSelect('archive.initiative', 'initiative')
            .leftJoinAndSelect('initiative.roles', 'roles')
            .leftJoinAndSelect('initiative.latest_submission', 'latest_submission')
            .leftJoinAndSelect('initiative.center_status', 'center_status')
            .leftJoinAndSelect('initiative.latest_history', 'latest_history')

            
            .where(
              new Brackets((qb) => {
                qb.where('initiative.name like :name', { name: `%${query.name || ''}%` });
                qb.andWhere('initiative.archived = :archived', { archived: true });
                if (query.initiative_id != undefined) {
                  qb.andWhere('initiative.official_code IN (:...initiative_id)', {
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
                    qb.andWhere('initiative.last_update_at = last_submitted_at');
                  } else if (query.status == 'Draft') {
                    qb.andWhere('initiative.last_submitted_at is null');
                    qb.orWhere('initiative.last_update_at != initiative.last_submitted_at');
                    qb.orWhere('latest_submission.status = :status', {
                      status: 'Draft',
                    });
                  }
                }
              }),
            )
            .orderBy(this.sort(query))
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
}

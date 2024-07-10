import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { Brackets } from 'typeorm';

@Controller('email')
export class EmailController {
    constructor(private emailService: EmailService) {}
    sort(query) {
        if (query?.sort) {
          let obj = {};
          const sorts = query.sort.split(',');
          obj[sorts[0]] = sorts[1];
          return obj;
        } else return { id: 'DESC' };
      }
    @Get('')
    async getEmailLogs(@Query() query: any) {
        const take = query.limit || 10;
        const skip = (Number(query.page || 1) - 1) * take;
        const result = await this.emailService.repo.createQueryBuilder('email')
        if(query.status) {
          result.where('email.status = :status', { status: Boolean(query.status == 'true' ? true : false) })
        } else if(!query.status) {
          result.where('email.id IS NOT NULL')
        }
        result.andWhere(
          new Brackets((qb) => {
            qb.andWhere('email LIKE :email', {email: `%${query?.search || ''}%`,})
            .orWhere('name LIKE :name', { name: `%${query?.search || ''}%` })
            .orWhere('subject LIKE :subject', { subject: `%${query?.search || ''}%` })
          }),
        )
        .orderBy(this.sort(query))
        .skip(skip || 0)
        .take(take || 10);
    
        const finalResult = await result.getManyAndCount();
        return {
          result: finalResult[0],
          count: finalResult[1],
        };
      }
}

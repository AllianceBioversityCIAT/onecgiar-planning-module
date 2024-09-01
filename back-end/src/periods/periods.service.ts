import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Period } from 'src/entities/period.entity';
import { Repository } from 'typeorm';
import { Phase } from 'src/entities/phase.entity';
import { ResultPeriodValues } from 'src/entities/resultPeriodValues.entity';
@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(Period) private periodRepository: Repository<Period>,
    @InjectRepository(ResultPeriodValues) private resultPeriodValuesRepo: Repository<ResultPeriodValues>,

  ) {}

  create(createPeriodDto: any) {
    const newPeriod = this.periodRepository.create({ ...createPeriodDto });
    return this.periodRepository.save(newPeriod);
  }




  async findAll(query: any) {
    if(query.page == 0 && query.limit == 0){
      return await this.periodRepository.find({
        relations: ['phase']
        

      });
    }
    else{
      const take = query?.limit;
      const skip = (Number(query.page || 1) - 1) * take;
      const [finalResult,total] = await this.periodRepository.findAndCount({
        where: {
          phase: {
            id: query.phase
          }
        },
        take: take,
        skip: skip,
        relations: ['phase'],
        order: {
          id: 'ASC'
        }
      });
      return {
        result: finalResult,
        count: total,
      };
    }
  }







  findOne(id: number) {
    return this.periodRepository.findOne({
      where: { id },
      relations: ['phase'],
    });
  }
  findByPhaseId(phase_id){
    return this.periodRepository.find({
      where: { phase:{id:phase_id} },
      order:{
        year:'ASC',
        quarter:'ASC'
      }
    });
  }

  update(id: number, updatePeriodDto: any) {
    return this.periodRepository.update({ id }, { ...updatePeriodDto });
  }

  async remove(id: number) {
    //related to submited phase
    let period1: any[] = await this.resultPeriodValuesRepo.find({
      where: {
        period: {
          id: id
        }
      }
    });

    //related to an active phase.
    let period2: any = await this.periodRepository.findOne({
      where: {
        id: id
      },
      relations: ['phase']
    });

    let isActive = period2?.phase?.active;

    if(isActive || period1.length) {
      if(isActive) 
        throw new BadRequestException('The period cannot be deleted as it’s related to an active phase.');
      throw new BadRequestException('The period cannot be deleted as it’s related to submited phase.');
    } else {
      return this.periodRepository.delete({ id });
    }
  }
}

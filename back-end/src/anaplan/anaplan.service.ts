import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { Anaplan } from 'src/entities/anaplan.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnaplanService {
  constructor(
    @InjectRepository(Anaplan)
    private repo: Repository<Anaplan>,
    @InjectRepository(AnaplanValues)
    private anaplanValuesRepo: Repository<AnaplanValues>,
    @InjectRepository(WorkPackage)
    private workPackageRepo: Repository<WorkPackage>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findAllValues(id: number) {
    return this.anaplanValuesRepo.find({
      where: {
        initiative: {
          id: id
        }
      },
      relations: ['workPackage', 'anaplan', 'organization']
    });
  }

  async createOrUpdate(data: any) {
    console.log(data)
    let workPackageObject = await this.workPackageRepo.findOneBy({
      wp_official_code: data.wp_id,
    });

    let record = await this.anaplanValuesRepo.findOne({
      where: {
        initiative_id: data.initiative_id,
        organization_code: data.organization_code,
        anaplan_id: data.anaplan_id,
        workPackage: workPackageObject,
      },
    });

    if (record) {
      record.value = data.value;
      return await this.anaplanValuesRepo.save(record);
    } else {
      const newRecord = this.anaplanValuesRepo.create({
        initiative_id: data.initiative_id,
        organization_code: data.organization_code,
        anaplan_id: data.anaplan_id,
        wp_id: workPackageObject.wp_id,
        value: data.value,
      });
      return await this.anaplanValuesRepo.save(newRecord);
    }
  }
}

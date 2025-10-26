import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { Anaplan } from 'src/entities/anaplan.entity';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';
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
    @InjectRepository(History)
    private historyRepo: Repository<History>,
    @InjectRepository(Initiative)
    private initiativeRepository: Repository<Initiative>,
  ) {}

  findAll() {
    return this.repo.find({
      order: {
        label: 'ASC',
      },
    });
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

  async createOrUpdate(data: any, user: any) { 
    let workPackageObject = await this.workPackageRepo.findOneBy({
      wp_official_code: data.wp_id,
    });
    const initiativeObject = await this.initiativeRepository.findOneBy({
      id: data.initiative_id,
    });
    if(!workPackageObject){
      workPackageObject = this.workPackageRepo.create();
      workPackageObject.name = data.wp_id;
      workPackageObject.initiative_id = data.initiative_id;
      workPackageObject.wp_official_code = data.wp_id;
      workPackageObject.initiative_status = initiativeObject.status;
      workPackageObject.initiative_offical_code = initiativeObject.official_code;
      await this.workPackageRepo.save(workPackageObject);
    }
    let anaplan = await this.repo.findOne({
      where: {
        id: data.anaplan_id
      }
    });
    // old value
    let record = await this.anaplanValuesRepo.findOne({
      where: {
        initiative_id: data.initiative_id,
        organization_code: data.organization.code,
        phase_id: data.phase_id,
        anaplan_id: data.anaplan_id,
        workPackage: workPackageObject,
      },
    });
    let old_value = record?.value

    if (record) {
      record.value = data.value;
      return await this.anaplanValuesRepo.save(record).then(
        async (res) => {
          const history = this.historyRepo.create();
          history.item_name = "Anaplan-" + anaplan.label;
          history.user_id = user.id;
          history.initiative_id = data.initiative_id;
          history.organization_id = data.organization.code;
          history.resource_property = 'Edit budget';
          history.old_value = String(old_value);
          history.new_value = String(res.value);
          history.work_package = workPackageObject;
          await this.historyRepo.save(history);
        }
      );
    } else {
      const newRecord = this.anaplanValuesRepo.create({
        initiative_id: data.initiative_id,
        organization_code: data.organization.code,
        phase_id: data.phase_id,
        anaplan_id: data.anaplan_id,
        wp_id: workPackageObject.wp_id,
        value: data.value,
      });
      return await this.anaplanValuesRepo.save(newRecord).then(
        async (res) => {
          const history = this.historyRepo.create();
          history.item_name = "Anaplan-" + anaplan.label;
          history.user_id = user.id;
          history.initiative_id = data.initiative_id;
          history.organization_id = data.organization.code;
          history.resource_property = 'Add budget';
          history.old_value = null;
          history.new_value = String(res.value);
          history.work_package = workPackageObject;
          await this.historyRepo.save(history);

        }
      );
    }
  } 
}

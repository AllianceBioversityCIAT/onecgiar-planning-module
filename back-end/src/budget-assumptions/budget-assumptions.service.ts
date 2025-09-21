import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';
import { Repository } from 'typeorm';
@Injectable()
export class BudgetAssumptionsService {
    constructor(
        @InjectRepository(BudgetAssumptions)
        private repo: Repository<BudgetAssumptions>
      ) {}

      findOne(data: any) {
        return this.repo.findOne({
          where: {
            organization_code: data.organization_code,
            item_id: data.item_id,
            wp_id: data.wp_id,
            type: data.type
          },
        });
      }

      find(id: string) {
        return this.repo.find({
          where: { item_id: id },
          relations: ['organization']
        });
      }

      findAll() {
        return this.repo.find();
      }



      async createOrUpdate(data: any) {
        let budgetAssumptions: any = await this.repo.findOne({
          where: {
            organization_code: data.organization_code,
            item_id: data.item_id,
            wp_id: data.wp_id,
            type: data.type
          },
        });
      
        if (!budgetAssumptions) {
          budgetAssumptions = this.repo.create(data);
        } else {
          this.repo.merge(budgetAssumptions, data);
        }
      
        return this.repo.save(budgetAssumptions);
      }
      
    
}

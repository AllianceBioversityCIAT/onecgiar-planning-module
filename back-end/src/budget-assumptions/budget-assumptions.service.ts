import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';
import { PhasesService } from 'src/phases/phases.service';
import { Repository } from 'typeorm';
@Injectable()
export class BudgetAssumptionsService {
  constructor(
    @InjectRepository(BudgetAssumptions)
    private repo: Repository<BudgetAssumptions>,
    private phaseService: PhasesService,
  ) {}

  findOne(data: any) {
    return this.repo.findOne({
      where: {
        organization_code: data.organization_code,
        item_id: data.item_id,
        initiative_id: data.initiative_id,
        wp_id: data.wp_id,
        type: data.type,
        phase_id: data.phase_id,
      },
    });
  }

  async delete(id: number) {
    return await this.repo.delete(id);
  }
  async deleteW(item_id, wp_id, phase_id, initiative_id, organization_code) {
    return await this.repo.delete({
      item_id,
      wp_id,
      phase_id,
      initiative_id,
      organization_code,
    });
  }

  async find(id: string, initiative_id: number) {
    let activePhase = await this.phaseService.findActivePhase();

    return await this.repo.find({
      where: { item_id: id, phase_id: activePhase.id, initiative_id },
      relations: ['organization'],
    });
  }

  findAll(id: number, initiative_id) {
    return this.repo.find({
      where: {
        initiative_id,
        phase: {
          id: id,
        },
      },
    });
  }

  async createOrUpdate(data: any) {
    let activePhase = await this.phaseService.findActivePhase();
    let budgetAssumption: any = await this.repo.findOne({
      where: {
        organization_code: data.organization_code,
        item_id: data.item_id,
        wp_id: data.wp_id,
        initiative_id: data?.initiative_id,
        type: data.type,
        phase: { id: activePhase.id },
      },
    });

    if (!budgetAssumption) {
      budgetAssumption = this.repo.create({
        ...data,
        phase: activePhase,
        phase_id: activePhase.id,
      });
    } else {
      this.repo.merge(budgetAssumption, data);
    }

    return this.repo.save(budgetAssumption);
  }
}

import { Module } from '@nestjs/common';
import { BudgetAssumptionsController } from './budget-assumptions.controller';
import { BudgetAssumptionsService } from './budget-assumptions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';
import { PhasesModule } from 'src/phases/phases.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BudgetAssumptions]),
    PhasesModule
  ],
  controllers: [BudgetAssumptionsController],
  providers: [BudgetAssumptionsService]
})
export class BudgetAssumptionsModule {}
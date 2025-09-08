import { Module } from '@nestjs/common';
import { BudgetAssumptionsController } from './budget-assumptions.controller';
import { BudgetAssumptionsService } from './budget-assumptions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BudgetAssumptions]),
  ],
  controllers: [BudgetAssumptionsController],
  providers: [BudgetAssumptionsService]
})
export class BudgetAssumptionsModule {}
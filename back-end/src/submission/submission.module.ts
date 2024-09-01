import { Module } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from 'src/entities/submission.entity';
import { Result } from 'src/entities/result.entity';
import { ResultPeriodValues } from 'src/entities/resultPeriodValues.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { Organization } from 'src/entities/organization.entity';
import { Period } from 'src/entities/period.entity';
import { User } from 'src/entities/user.entity';
import { Phase } from 'src/entities/phase.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { HttpModule } from '@nestjs/axios';

import { CacheModule } from '@nestjs/cache-manager';
import { CenterStatus } from 'src/entities/center-status.entity';
import { WpBudget } from 'src/entities/wp-budget.entity';
import { CrossCuttingModule } from 'src/cross-cutting/cross-cutting.module';
import { IpsrValueModule } from 'src/ipsr-value/ipsr-value.module';
import { PhasesModule } from 'src/phases/phases.module';
import { InitiativesModule } from 'src/initiatives/initiatives.module';
import { PeriodsModule } from 'src/periods/periods.module';
// import { Melia } from 'src/entities/melia.entity';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
// import { InitiativeMelia } from 'src/entities/initiative-melia.entity';
import { EmailModule } from 'src/email/email.module';
import { Email } from 'src/entities/email.entity';
import { Variable } from 'src/entities/variable.entity';
import { EmailService } from 'src/email/email.service';
import { History } from 'src/entities/history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      User,
      Phase,
      Initiative,
      Organization,
      WorkPackage,
      Result,
      Period,
      ResultPeriodValues,
      CenterStatus,
      WpBudget,
      // Melia,
      CrossCutting,
      IpsrValue,
      // InitiativeMelia,
      Email,
      Variable,
      History
    ]),
    HttpModule,
    CacheModule.register(),
    CrossCuttingModule,
    IpsrValueModule,
    PhasesModule,
    InitiativesModule,
    PeriodsModule
  ],
  controllers: [SubmissionController],
  providers: [SubmissionService, EmailService],
})
export class SubmissionModule {}

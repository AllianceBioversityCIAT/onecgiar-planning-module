import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PorbController } from './porb.controller';
import { PorbService } from './porb.service';
import { PorbAow } from 'src/entities/porb-aow.entity';
import { PorbHlo } from 'src/entities/porb-hlo.entity';
import { PorbPartner } from 'src/entities/porb-partner.entity';
import { PorbBilateral } from 'src/entities/porb-bilateral.entity';
import { PorbMelia } from 'src/entities/porb-melia.entity';
import { PorbContractedPartner } from 'src/entities/porb-contracted-partner.entity';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PorbAnaplan } from 'src/entities/porb-anaplan.entity';
import { Anaplan } from 'src/entities/anaplan.entity';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { PorbCross } from 'src/entities/porb-cross.entity';
import { PorbCountryPercentage } from 'src/entities/porb-country-percentage.entity';
import { CenterStatus } from 'src/entities/center-status.entity';
import { Organization } from 'src/entities/organization.entity';
import { Submission } from 'src/entities/submission.entity';
import { User } from 'src/entities/user.entity';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { Result } from 'src/entities/result.entity';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { StanderdCrossCutting } from 'src/entities/standerd-cross-cutting.entity';
import { Partner } from 'src/entities/partner.entity';
import { Constants } from 'src/entities/constants.entity';
import { PorbSynergy } from 'src/entities/porb-synergy.entity';
import { PorbOutcome } from 'src/entities/porb-outcome.entity';
import { PorbLocationBenefit } from 'src/entities/porb-location-benefit.entity';
import { Region } from 'src/entities/region.entity';
import { SubmissionModule } from 'src/submission/submission.module';
import { InitiativesModule } from 'src/initiatives/initiatives.module';
import { PhasesModule } from 'src/phases/phases.module';
import { EmailModule } from 'src/email/email.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PorbAow,
      PorbHlo,
      PorbPartner,
      PorbBilateral,
      PorbMelia,
      PorbContractedPartner,
      ClarisaCountry,
      PorbAnaplan,
      Anaplan,
      AnaplanValues,
      WorkPackage,
      CrossCutting,
      PorbCross,
      PorbCountryPercentage,
      CenterStatus,
      Organization,
      Submission,
      User,
      History,
      Initiative,
      Result,
      BudgetAssumptions,
      PartnerCountry,
      StanderdCrossCutting,
      Partner,
      Constants,
      PorbSynergy,
      PorbOutcome,
      PorbLocationBenefit,
      Region,
    ]),
    HttpModule,
    SubmissionModule,
    InitiativesModule,
    PhasesModule,
    EmailModule,
    EventsModule,
  ],
  controllers: [PorbController],
  providers: [PorbService],
  exports: [PorbService],
})
export class PorbModule {}

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
import { SubmissionModule } from 'src/submission/submission.module';
import { InitiativesModule } from 'src/initiatives/initiatives.module';
import { PhasesModule } from 'src/phases/phases.module';

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
    ]),
    HttpModule,
    SubmissionModule,
    InitiativesModule,
    PhasesModule,
  ],
  controllers: [PorbController],
  providers: [PorbService],
  exports: [PorbService],
})
export class PorbModule {}

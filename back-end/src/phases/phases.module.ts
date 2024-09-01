import { Module } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { PhasesController } from './phases.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Phase } from 'src/entities/phase.entity';
import { PhaseInitiativeOrganization } from 'src/entities/phase-initiative-organization.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { Organization } from 'src/entities/organization.entity';
import { InitiativeRoles } from 'src/entities/initiative-roles.entity';
import { Period } from 'src/entities/period.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Phase,
      Initiative,
      Organization,
      PhaseInitiativeOrganization,
      InitiativeRoles,
      Period
    ]),
    HttpModule,
  ],
  controllers: [PhasesController],
  providers: [PhasesService],
  exports: [PhasesService]
})
export class PhasesModule {}

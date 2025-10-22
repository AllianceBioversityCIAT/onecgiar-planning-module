import { Module } from '@nestjs/common';
import { AnaplanController } from './anaplan.controller';
import { AnaplanService } from './anaplan.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anaplan } from 'src/entities/anaplan.entity';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { Organization } from 'src/entities/organization.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Anaplan, Initiative, AnaplanValues, WorkPackage, History]),
  ],
  controllers: [AnaplanController],
  providers: [AnaplanService],
  exports: [AnaplanService]
})
export class AnaplanModule {}

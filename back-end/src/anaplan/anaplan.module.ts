import { Module } from '@nestjs/common';
import { AnaplanController } from './anaplan.controller';
import { AnaplanService } from './anaplan.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anaplan } from 'src/entities/anaplan.entity';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { Organization } from 'src/entities/organization.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Anaplan, AnaplanValues, WorkPackage]),
  ],
  controllers: [AnaplanController],
  providers: [AnaplanService]
})
export class AnaplanModule {}

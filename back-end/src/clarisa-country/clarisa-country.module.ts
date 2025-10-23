import { Module } from '@nestjs/common';
import { ClarisaCountryController } from './clarisa-country.controller';
import { ClarisaCountryService } from './clarisa-country.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { PhasesModule } from 'src/phases/phases.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClarisaCountry, PartnerCountry, WorkPackage]),
    PhasesModule
  ],
  controllers: [ClarisaCountryController],
  providers: [ClarisaCountryService]
})
export class ClarisaCountryModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StanderdCrossCutting } from 'src/entities/standerd-cross-cutting.entity';
import { StanderdCrossCuttingService } from './standerd-cross-cutting.service';
import { StanderdCrossCuttingController } from './standerd-cross-cutting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StanderdCrossCutting])],
  controllers: [StanderdCrossCuttingController],
  providers: [StanderdCrossCuttingService],
  exports: [StanderdCrossCuttingService],
})
export class StanderdCrossCuttingModule {}

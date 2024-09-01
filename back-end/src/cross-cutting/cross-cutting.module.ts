import { Module } from '@nestjs/common';
import { CrossCuttingController } from './cross-cutting.controller';
import { CrossCuttingService } from './cross-cutting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([CrossCutting , History, Initiative])
  ],
  controllers: [CrossCuttingController],
  providers: [CrossCuttingService],
  exports: [CrossCuttingService]
})
export class CrossCuttingModule {}

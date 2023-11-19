import { Module } from '@nestjs/common';
import { MeliaTypeController } from './melia-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeliaTypes } from 'src/entities/melia-types.entity';
import { Melia } from 'src/entities/melia.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([MeliaTypes, Melia])
  ],
  controllers: [MeliaTypeController]
})
export class MeliaTypeModule {}

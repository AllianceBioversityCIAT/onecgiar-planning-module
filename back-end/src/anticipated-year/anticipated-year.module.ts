import { Module } from '@nestjs/common';
import { AnticipatedYearController } from './anticipated-year.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { AnticipatedYear } from 'src/entities/anticipated-year.entity';

@Module({
  imports:[
    // TypeOrmModule.forFeature([AnticipatedYear])
  ],
  controllers: [AnticipatedYearController]
})
export class AnticipatedYearModule {}

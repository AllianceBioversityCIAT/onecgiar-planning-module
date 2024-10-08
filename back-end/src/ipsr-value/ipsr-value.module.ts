import { Module } from '@nestjs/common';
import { IpsrValueController } from './ipsr-value.controller';
import { IpsrValueService } from './ipsr-value.service';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpsrModule } from 'src/ipsr/ipsr.module';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IpsrValue, History, Initiative]),IpsrModule],
  controllers: [IpsrValueController],
  providers: [IpsrValueService],
  exports: [IpsrValueService]
})
export class IpsrValueModule {}


import { Module } from '@nestjs/common';
import { UnderMaintenanceController } from './under-maintenance.controller';
import { UnderMaintenanceService } from './under-maintenance.service';
import { underMaintenance } from 'src/entities/underMaintenance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [UnderMaintenanceController],
  imports: [TypeOrmModule.forFeature([underMaintenance])],
  providers: [UnderMaintenanceService],
  exports: [UnderMaintenanceService],
})
export class UnderMaintenanceModule {}

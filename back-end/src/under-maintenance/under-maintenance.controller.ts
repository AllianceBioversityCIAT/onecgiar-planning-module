import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { UnderMaintenanceService } from './under-maintenance.service';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Roles } from 'src/role/roles.decorator';

@Controller('under-maintenance')
export class UnderMaintenanceController {
  constructor(private underMaintenanceService: UnderMaintenanceService) {}

  @Get('')
  getConstants() {
    return this.underMaintenanceService.getUnderMaintenance();
  }

  @ApiBearerAuth()
  // @Roles()
  @Get('status')
  system_publish() {
    return this.underMaintenanceService.getStatus();
  }

  @ApiBearerAuth()
  @Roles()
  @Patch('update-status')
  updatePublishValue(@Body() status: string) {
    return this.underMaintenanceService.changeStatus(status);
  }

  @Put()
  editConstant(@Body() data: any) {
    return this.underMaintenanceService.editUnderMaintenance(data);
  }
}

import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { UnderMaintenanceService } from './under-maintenance.service';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Roles } from 'src/role/roles.decorator';

@Controller('under-maintenance')
export class UnderMaintenanceController {
  constructor(private underMaintenanceService: UnderMaintenanceService) {}

  @Get('')
  getMessage() {
    return this.underMaintenanceService.getUnderMaintenance();
  }

  @ApiBearerAuth()
  // @Roles()
  @Get('status')
  getStatus() {
    return this.underMaintenanceService.getStatus();
  }

  @ApiBearerAuth()
  @Roles()
  @Patch('update-status')
  updateStatus(@Body() status: string) {
    return this.underMaintenanceService.changeStatus(status);
  }

  @Put()
  editMessage(@Body() data: any) {
    return this.underMaintenanceService.editUnderMaintenance(data);
  }
}

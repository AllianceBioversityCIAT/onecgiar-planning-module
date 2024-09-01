import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { UnderMaintenanceService } from './under-maintenance.service';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/role/roles.decorator';
import { underMaintenance } from 'src/entities/underMaintenance.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@ApiTags('Under-Maintenance')
@Controller('under-maintenance')
export class UnderMaintenanceController {
  constructor(private underMaintenanceService: UnderMaintenanceService) {}

  @ApiCreatedResponse({
    description: '',
    type: [underMaintenance],
  })
  @Get('')
  getMessage() {
    return this.underMaintenanceService.getUnderMaintenance();
  }


  @Get('status')
  getStatus() {
    return this.underMaintenanceService.getStatus();
  }
  
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Roles()
  @Patch('update-status')
  updateStatus(@Body() status: boolean) {
    return this.underMaintenanceService.changeStatus(status);
  }
  
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put()
  editMessage(@Body() data: any) {
    return this.underMaintenanceService.editUnderMaintenance(data);
  }
}

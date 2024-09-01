import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/role/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';
import { createPeriodReq, createPeriodRes, deletePeriodReq, findAll, findByPhaseId } from 'src/DTO/period.dto';
import { Period } from 'src/entities/period.entity';

@UseGuards(JwtAuthGuard)
@ApiTags('Periods')
@Controller('periods')
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: createPeriodRes,
  })
  @ApiBody({ type: createPeriodReq})
  @Post()
  create(@Body() createPeriodDto: CreatePeriodDto) {
    return this.periodsService.create(createPeriodDto);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [findAll],
  })
  @Get()
  findAll(@Query() query: any) {
    return this.periodsService.findAll(query);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [findByPhaseId],
  })
  @Get('phase/:phase_id')
  findByPhaseId(@Param('phase_id') phase_id: number) {
    return this.periodsService.findByPhaseId(phase_id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: findAll,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.periodsService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: createPeriodReq })
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePeriodDto: UpdatePeriodDto) {
    return this.periodsService.update(+id, updatePeriodDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: deletePeriodReq })
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.periodsService.remove(+id);
  }
}

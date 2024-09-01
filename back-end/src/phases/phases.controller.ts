import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PhasesService } from './phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';
import { RolesGuard } from 'src/role/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { activateAndDeactivateAndDeleteReq, assignOrganizationsReq, createPhaseReq, createPhaseRes, getAssignedOrganizations, getInitiativesPhase, getPhases, getTocPhases, updatePhaseReq } from 'src/DTO/phase.dto';
import { Phase } from 'src/entities/phase.entity';

@UseGuards(JwtAuthGuard)
@ApiTags('Phases')
@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: createPhaseRes,
  })
  @ApiBody({ type: createPhaseReq})
  @Post()
  create(@Body() createPhaseDto: CreatePhaseDto) {
    return this.phasesService.create(createPhaseDto);
  }

  @ApiBody({ type: assignOrganizationsReq })
  @ApiBearerAuth()
  @Post('assign-orgs')
  assignOrganizations(@Body() data: any) {
    return this.phasesService.assignOrganizations(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getTocPhases],
  })
  @Get('toc-phases')
  getTocPhases() {
    try {
      return this.phasesService.getTocPhases();
    } catch (error) {
      console.log(error)
    }
  }
  
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getPhases],
  })
  @Get()
  findAll(@Query() query) {
    return this.phasesService.findAll(query);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getPhases,
  })
  @Get('active')
  findActiveOne() {
    return this.phasesService.findActivePhase();
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: getPhases,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.phasesService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: activateAndDeactivateAndDeleteReq })
  @ApiBearerAuth()
  @Get('activate/:id')
  activate(@Param('id') id: string) {
    return this.phasesService.activate(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: activateAndDeactivateAndDeleteReq })
  @ApiBearerAuth()
  @Get('deactivate/:id')
  deactivate(@Param('id') id: string) {
    return this.phasesService.deactivate(+id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getInitiativesPhase],
  })
  @Get(':id/initiatives')
  getInitiatives(@Param('id') id: string) {
    return this.phasesService.fetchPhaseInitiativesData(+id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getAssignedOrganizations],
  })
  @Get('assigned-orgs/:phase_id/:initiative_id')
  getAssignedOrganizations(
    @Param('phase_id') phase_id: string,
    @Param('initiative_id') initiative_id: string,
  ) {
    return this.phasesService.fetchAssignedOrganizations(
      +phase_id,
      +initiative_id,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: updatePhaseReq })
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePhaseDto: UpdatePhaseDto) {
    return this.phasesService.update(+id, updatePhaseDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: activateAndDeactivateAndDeleteReq })
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.phasesService.remove(+id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StanderdCrossCuttingService } from './standerd-cross-cutting.service';
import { CreateStanderdCrossCuttingDto } from './dto/create-standerd-cross-cutting.dto';
import { UpdateStanderdCrossCuttingDto } from './dto/update-standerd-cross-cutting.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/role/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';

@UseGuards(JwtAuthGuard)
@ApiTags('StanderdCrossCutting')
@ApiBearerAuth()
@Controller('standerd-cross-cutting')
export class StanderdCrossCuttingController {
  constructor(
    private readonly standerdCrossCuttingService: StanderdCrossCuttingService,
  ) {}

  @Get()
  findAll() {
    return this.standerdCrossCuttingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.standerdCrossCuttingService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() createDto: CreateStanderdCrossCuttingDto) {
    return this.standerdCrossCuttingService.create(createDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStanderdCrossCuttingDto,
  ) {
    return this.standerdCrossCuttingService.update(+id, updateDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.standerdCrossCuttingService.remove(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('seed')
  seed() {
    return this.standerdCrossCuttingService.seed();
  }
}

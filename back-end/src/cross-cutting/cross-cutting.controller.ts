
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { CrossCuttingService } from './cross-cutting.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { updateCrossCuttingReq } from 'src/DTO/cross-cutting.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('cross-cutting')
@Controller('cross-cutting')
export class CrossCuttingController {
  constructor(private readonly CrossCuttingService: CrossCuttingService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [CrossCutting],
  })
  @Get()
  findAll() {
    return this.CrossCuttingService.findAll();
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [CrossCutting],
  })
  @Get('initiative/:initiative_id')
  findInitiative_id(@Param('initiative_id') initiative_id) {
    return this.CrossCuttingService.findByInitiativeID(initiative_id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [CrossCutting],
  })
  @Get('submission/:submission_id')
  getSubmissionCross(@Param('submission_id') submission_id: string) {
    return this.CrossCuttingService.findBySubmissionID(+submission_id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: CrossCutting,
  })
  @Get(':id')
  findOne(@Param('id') id) {
    return this.CrossCuttingService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBody({ type: updateCrossCuttingReq })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body, @Request() req) {
    return this.CrossCuttingService.update(id, body, req.user);
  }
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.CrossCuttingService.remove(id, req.user);
  }

  @ApiBearerAuth()
  @ApiBody({ type: updateCrossCuttingReq })
  @Post()
  create(@Body() body, @Request() req) {
    return this.CrossCuttingService.create(body, req.user);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request
} from '@nestjs/common';
import { IpsrValueService } from './ipsr-value.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
import { createIpsrValue, findInitiative_id } from 'src/DTO/ipsr-value.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('ipsr-value')
@Controller('ipsr-value')
export class IpsrValueController {
  constructor(private readonly ipsrValueService: IpsrValueService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [IpsrValue],
  })
  @Get()
  findAll() {
    return this.ipsrValueService.findAll();
  }
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [findInitiative_id],
  })
  @Get('initiative/:initiative_id')
  findInitiative_id(@Param('initiative_id') initiative_id) {
    return this.ipsrValueService.findByInitiativeID(initiative_id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [findInitiative_id],
  })
  @Get('submission/:submission_id')
  getSubmissionIpsrValues(@Param('submission_id') submission_id: string) {
    return this.ipsrValueService.findBySubmissionId(+submission_id);
  }

  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: IpsrValue,
  })
  @Get(':id')
  findOne(@Param('id') id) {
    return this.ipsrValueService.findOne(id);
  }
  @ApiBody({ type: createIpsrValue })
  @Post()
  create(@Body() body, @Request() req) {
    return this.ipsrValueService.save(body, req.user);
  }
}

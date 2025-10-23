import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BudgetAssumptionsService } from './budget-assumptions.service';

@UseGuards(JwtAuthGuard)
@ApiTags('budget-assumptions')
@Controller('budget-assumptions')
export class BudgetAssumptionsController {
    constructor(private service: BudgetAssumptionsService) {}

    @ApiBearerAuth()
    @Get()
    findOne(@Query() body: any) {
      return this.service.findOne(body);
    }

    @ApiBearerAuth()
    @Get('all/:phase_id')
    findAll(@Param('phase_id') id: number) {
      return this.service.findAll(id);
    }
  

    @ApiBearerAuth()
    @Get(':item_id')
    findByItemId(@Param('item_id') id: string) {
      return this.service.find(id);
    }

    @ApiBearerAuth()
    @Post()
    create(@Body() body) {
      return this.service.createOrUpdate(body);
    }
}

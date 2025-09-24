import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnaplanService } from './anaplan.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('anaplan')
export class AnaplanController {
    constructor(private service: AnaplanService) {}

    @ApiBearerAuth()
    @Get('all')
    findAll() {
      return this.service.findAll();
    }
  

    @ApiBearerAuth()
    @Get('all-values/:initiative_id')
    findAllValues(@Param('initiative_id') id: number) {
      return this.service.findAllValues(id);
    }

    @ApiBearerAuth()
    @Post()
    create(@Body() body) {
      return this.service.createOrUpdate(body);
    }
}

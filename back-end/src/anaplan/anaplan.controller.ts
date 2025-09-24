import { Body, Controller, Get, Post } from '@nestjs/common';
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
    @Get('all-values')
    findAllValues() {
      return this.service.findAllValues();
    }

    @ApiBearerAuth()
    @Post()
    create(@Body() body) {
      return this.service.createOrUpdate(body);
    }
}

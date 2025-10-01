import { Body, Controller, Get, Post } from '@nestjs/common';
import { ClarisaCountryService } from './clarisa-country.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('clarisa-country')
export class ClarisaCountryController {
    constructor(private service: ClarisaCountryService) {}

    @ApiBearerAuth()
    @Get('all')
    findAll() {
      return this.service.findAll();
    }

    @ApiBearerAuth()
    @Get('values')
    findAllValues() {
      return this.service.findAllValues();
    }


    @ApiBearerAuth()
    @Post()
    create(@Body() body) {
      return this.service.createOrUpdate(body);
    }
}

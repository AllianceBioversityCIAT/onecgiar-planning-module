import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
    @Get('values/:phase_id')
    findAllValues(@Param('phase_id') id: number) {
      return this.service.findAllValues(id);
    }


    @ApiBearerAuth()
    @Post()
    create(@Body() body) {
      return this.service.createOrUpdate(body);
    }
}

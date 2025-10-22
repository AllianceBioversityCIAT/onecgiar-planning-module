import { Body, Controller, Get, Param, Post , Request, UseGuards} from '@nestjs/common';
import { AnaplanService } from './anaplan.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
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
    create(@Body() body, @Request() req) {
      return this.service.createOrUpdate(body, req.user);
    }
}

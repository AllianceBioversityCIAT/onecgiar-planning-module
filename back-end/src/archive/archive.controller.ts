import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('archive')
export class ArchiveController {

    constructor(private archiveService: ArchiveService) { }

    
    @Get('')
    async findAllFull(@Query() query: any, @Req() req) {
        return this.archiveService.findAll(query, req);
    }

    @Get(':id')
    async findOneById(@Param('id') id: number) {
        return this.archiveService.findOne(id);
    }
}

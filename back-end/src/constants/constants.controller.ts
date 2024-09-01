import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Constants } from 'src/entities/constants.entity';
import { Repository } from 'typeorm';

@UseGuards(JwtAuthGuard)
@ApiTags('constants')
@Controller('constants')
export class ConstantsController {
    constructor(
        @InjectRepository(Constants) private phaseRepository: Repository<Constants>
      ) {}
    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Get('system-submit')
    async getSubmitStatus() {
        return await this.phaseRepository.findOne({where: { id: 1 }})
    }
    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Patch('update-system-submit')
    async changeSubmitStatus(@Body() value: any) {
        const publish =  await this.phaseRepository.findOne({ where: { id: 1 } });
        publish.value =  value.status;
        return await this.phaseRepository.save(publish);
    }
}

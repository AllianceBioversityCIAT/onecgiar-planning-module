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
        @InjectRepository(Constants) private constantsRepository: Repository<Constants>
      ) {}
    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Get('system-submit')
    async getSubmitStatus() {
        return await this.constantsRepository.findOne({where: { id: 1 }})
    }
    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Patch('update-system-submit')
    async changeSubmitStatus(@Body() value: any) {
        const publish =  await this.constantsRepository.findOne({ where: { id: 1 } });
        publish.value =  value.status;
        return await this.constantsRepository.save(publish);
    }

    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Get('indicator-values')
    async getShowIndicatorValues() {
        return await this.constantsRepository.findOne({where: { id: 3 }})
    }
    @ApiBearerAuth()
    @ApiCreatedResponse({
        description: '',
        type: Constants,
    })
    @Patch('update-indicator-values')
    async updateShowIndicatorValues(@Body() value: any) {
        const constant =  await this.constantsRepository.findOne({ where: { id: 3 } });
        constant.value =  value.status;
        return await this.constantsRepository.save(constant);
    }
}

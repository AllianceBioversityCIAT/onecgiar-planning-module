import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { createMeliaTypeReq } from 'src/DTO/melia-type.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { InitiativeMelia } from 'src/entities/initiative-melia.entity';
import { MeliaTypes } from 'src/entities/melia-types.entity';
// import { Melia } from 'src/entities/melia.entity';
import { Role } from 'src/role/role.enum';
import { Roles } from 'src/role/roles.decorator';
import { RolesGuard } from 'src/role/roles.guard';
import { ILike, Repository } from 'typeorm';

@UseGuards(JwtAuthGuard)
@ApiTags('melia-type')
@Controller('melia-type')
export class MeliaTypeController {
    // constructor(
    //     @InjectRepository(MeliaTypes)
    //     private meliaTypesRepository: Repository<MeliaTypes>,
    //     @InjectRepository(InitiativeMelia)
    //     private initiativeMeliaRepository: Repository<InitiativeMelia>,
    //   ) {}

    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: [MeliaTypes],
    // })
    // @Get('')
    // getMeliaTypes(@Query() query) {
    // console.log(query)
    // return this.meliaTypesRepository.find({
    //     where: {
    //         name:  query?.name ? ILike(`%${query?.name}%`) : null, 
    //     }
    //   });
    // }
    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: MeliaTypes,
    // })
    // @Get(':id')
    // findOne(@Param('id') id: any) {
    //   return this.meliaTypesRepository.findOne({where: { id: id }});
    // }

    // @UseGuards(RolesGuard)
    // @Roles(Role.Admin)
    // @ApiBearerAuth()
    // @Delete(':id')
    // async remove(@Param('id') id: number) {
    //   const initiativeMelia = await this.initiativeMeliaRepository.find({
    //     where: {
    //       melia_type_id: id
    //     }
    //   });
    //   if(initiativeMelia.length)
    //     throw new BadRequestException('MELIA type cannot be deleted, This MELIA type is assigned for an initiative(s)')
    //   return this.meliaTypesRepository.delete(id);
    // }

    // @UseGuards(RolesGuard)
    // @Roles(Role.Admin)
    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: MeliaTypes,
    // })
    // @ApiBody({ type: createMeliaTypeReq })
    // @Post()
    // async create(@Body() body: any) {
    //   return await this.meliaTypesRepository.save(this.meliaTypesRepository.create({ ...body }));
    // }

    // @UseGuards(RolesGuard)
    // @Roles(Role.Admin)
    // @ApiBearerAuth()
    // @ApiBody({ type: createMeliaTypeReq })
    // @Put(':id')
    // async update(@Param('id') id: any, @Body() body) {
    //   return await this.meliaTypesRepository.update({ id }, { ...body });
    // }
}

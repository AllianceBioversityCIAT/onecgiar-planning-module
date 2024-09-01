import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { createAnticipatedYearReq, createAnticipatedYearRes, getAnticipatedYear } from 'src/DTO/anticipated-year.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { AnticipatedYear } from 'src/entities/anticipated-year.entity';
import { Brackets, Repository } from 'typeorm';

@UseGuards(JwtAuthGuard)
// @ApiTags('anticipated-year')
@ApiTags('')

@Controller('anticipated-year')
export class AnticipatedYearController {
    // constructor(
    //     @InjectRepository(AnticipatedYear)
    //     private AnticipatedYearRepository: Repository<AnticipatedYear>,
    // ) {}
    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: [getAnticipatedYear],
    // })
    // @Get('')
    // async getMeliaTypes(@Query() query) {
    // const result = this.AnticipatedYearRepository.createQueryBuilder('AnticipatedYear');
    // result.where(
    //   new Brackets((qb) => {
    //     qb.where('month LIKE :month', {
    //         month: `%${query?.search || ''}%`,
    //     })
    //     .orWhere('year LIKE :year', { year: `%${query?.search || ''}%` })

    //   }),
    // );
    // result.leftJoinAndSelect('AnticipatedYear.phase', 'phase')
    // .orWhere('name LIKE :name', { name: `%${query?.search || ''}%` })
    // const finalResult = await result.getMany();
    // return finalResult
    // }
    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: getAnticipatedYear,
    // })
    // @Get(':id')
    // findOne(@Param('id') id: any) {
    //     return this.AnticipatedYearRepository.findOne({
    //         where: { id: id },
    //         relations: ['phase']
    //     });
    // }
    // @ApiBearerAuth()
    // @Delete(':id')
    // async remove(@Param('id') id: number) {
    //   const AnticipatedYear = await this.AnticipatedYearRepository.findOne({
    //     where: {
    //       id: id
    //     },
    //     relations: ['phase']
    //   });
    //   if(AnticipatedYear.phase.active)
    //     throw new BadRequestException('The Anticipated Year cannot be deleted as it’s related to an active phase.');
    //   return this.AnticipatedYearRepository.delete(id);
    // }
    // @ApiBearerAuth()
    // @ApiCreatedResponse({
    //   description: '',
    //   type: createAnticipatedYearRes,
    // })
    // @ApiBody({ type: createAnticipatedYearReq })
    // @Post()
    // async create(@Body() body: any) {
    //   return await this.AnticipatedYearRepository.save(this.AnticipatedYearRepository.create({ ...body }));
    // }
    // @ApiBearerAuth()
    // @ApiBody({ type: createAnticipatedYearReq })
    // @Put(':id')
    // async update(@Param('id') id: any, @Body() body) {
    //   return await this.AnticipatedYearRepository.update({ id }, { ...body });
    // }
}

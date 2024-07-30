import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InitiativesService } from './initiatives.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InitiativeRoles } from 'src/entities/initiative-roles.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  initiativeFull,
  createRoleReq,
  createRoleResponse,
  getInitiatives,
  importInitiatives,
  importInitiativeswp,
  updateRoleReq,
  updateRoleResponse,
  allowedToAccessChat,
  getInitHistoryResponse,
} from 'src/DTO/initiatives.dto';
import { Initiative } from 'src/entities/initiative.entity';
import { User } from 'src/entities/user.entity';
import { SignedInUser } from 'src/user.decorator';
import { firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@UseGuards(JwtAuthGuard)
@ApiTags('Initiatives')
@Controller('initiatives')
export class InitiativesController {
  constructor(private readonly initiativesService: InitiativesService,
    private readonly httpService: HttpService) {}

  @Get('import')
  @ApiCreatedResponse({
    description: '',
    type: [importInitiatives],
  })
  async import() {
    await this.initiativesService.importInitiatives();
    return 'Initiatives imported successfully';
  }

  @Get('data-import/:init_id/:uuid')
  @ApiBearerAuth()
  async importDatada(@Param('init_id') init_id,@Param('uuid') uuid) {

      let Tocdata = await firstValueFrom(
        this.httpService
          .get(process.env.TOC_API + '/toc/' + uuid)
          .pipe(
            map((dd: any) =>
            dd.data.data.filter(
                (d) =>
                  ((d.category == 'WP' && !d.group) ||
                    d.category == 'OUTPUT' ||
                    d.category == 'EOI' ||
                    d.category == 'OUTCOME') &&
                    d?.flow_id == dd?.data?.version_id,
              )
            )
          ),
      );
  
  
        let resultValues: any[] = await this.initiativesService.resultRepository.find({
          where: {
            initiative_id: init_id
          }
        });
  
  // console.log(resultValues.length,Tocdata.length)
  let data=[]
        for(let res of resultValues) {
          for(let toc of Tocdata) {
            if(res.result_uuid == toc.id) {
              data.push(res.id,toc.related_node_id)
              await this.initiativesService.resultRepository.update(res.id, {
                result_uuid: toc.related_node_id
              })
           } 
          }
        }
        
    
    return { msg: 'imported',data }
  }


  @Get('data-import')
  @ApiBearerAuth()
  async importData() {
    const allInit = await this.initiativesService.initiativeRepository.find();
    
    for(let init of allInit) {
      console.log(init.id)
      let Tocdata = await firstValueFrom(
        this.httpService
          .get(process.env.TOC_API + '/toc/' + init.id)
          .pipe(
            map((dd: any) =>
            dd.data.data.filter(
                (d) =>
                  ((d.category == 'WP' && !d.group) ||
                    d.category == 'OUTPUT' ||
                    d.category == 'EOI' ||
                    d.category == 'OUTCOME') &&
                    d?.flow_id == dd?.data?.version_id,
              )
            )
          ),
      );
  
  
        let resultValues: any[] = await this.initiativesService.resultRepository.find({
          where: {
            initiative_id: init.id
          }
        });
  
  
        for(let res of resultValues) {
          for(let toc of Tocdata) {
            if(res.result_uuid == toc.id) {
              await this.initiativesService.resultRepository.update(res.id, {
                result_uuid: toc.related_node_id
              })
           } 
          }
        }
        
    }
    return { msg: 'imported' }
  }

  @Get('import/wp')
  @ApiCreatedResponse({
    description: '',
    type: [importInitiativeswp],
  })
  async importWP() {
    await this.initiativesService.importWorkPackages();
    return 'wp imported successfully';
  }

  @Get()
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getInitiatives],
  })
  async findAll() {
    return this.initiativesService.findAll();
  }

  @Get('full')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [initiativeFull],
  })
  async findAllFull(@Query() query: any, @Req() req) {
    return this.initiativesService.findAllFull(query, req);
  }

  @Get('track')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [initiativeFull],
  })
  async exportInitPORB() {
    return this.initiativesService.exportInitForTrack();
  }

  ///edit by me
  @Get('getAll')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [initiativeFull],
  })
  async getAllFull() {
    return this.initiativesService.getAllFull();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: initiativeFull,
  })
  findOne(@Param('id') id: string) {
    return this.initiativesService.findOne(+id);
  }

  @Get(':id/roles')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [InitiativeRoles],
  })
  getRoles(@Param('id') id: number): Promise<InitiativeRoles[]> {
    return this.initiativesService.iniRolesRepository.find({
      where: { initiative_id: id },
      relations: ['user', 'organizations'],
    });
  }

  @Get(':id/history')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [getInitHistoryResponse],
  })
  getInitHistory(@Param('id') id: number) {
    return this.initiativesService.getInitHistory(id);
  }

  @Post(':initiative_id/roles')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [createRoleResponse],
  })
  @ApiBody({ type: createRoleReq })
  setRoles(
    @Param('initiative_id') initiative_id: number,
    @Body() initiativeRoles: InitiativeRoles,
    @Request() req,
  ) {
    return this.initiativesService.setRole(
      initiative_id,
      initiativeRoles,
      req.user,
    );
  }

  @Put(':initiative_id/roles/:initiative_roles_id')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [updateRoleResponse],
  })
  @ApiBody({ type: updateRoleReq })
  updateRoles(
    @Body() roles: InitiativeRoles,
    @Param('initiative_id') initiative_id: number,
    @Param('initiative_roles_id') initiative_roles_id: number,
    @Request() req,
  ) {
    return this.initiativesService.updateRoles(
      initiative_id,
      initiative_roles_id,
      roles,
      req.user,
    );
  }

  @Delete(':initiative_id/roles/:initiative_roles_id')
  @ApiBearerAuth()
  deleteRoles(
    @Param('initiative_id') initiative_id: number,
    @Param('initiative_roles_id') initiative_roles_id: number,
    @Request() req,
  ) {
    return this.initiativesService.deleteRole(
      initiative_id,
      initiative_roles_id,
      req.user,
    );
  }

  @Get(':initiative_id/is-allowed-to-access-chat')
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: allowedToAccessChat,
  })
  isAllowedToAccessChat(
    @Param('initiative_id') initiative_id: number,
    @SignedInUser() user: User,
  ) {
    return this.initiativesService.idUserHavePermissionSeeChat(
      initiative_id,
      user,
    );
  }
}

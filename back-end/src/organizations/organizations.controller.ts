import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/role/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';
import { Organization } from 'src/entities/organization.entity';
import { getCountries, getCountriesRegions, getPartners, getPartnersreq, getRegions } from 'src/DTO/organizations.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: Organization,
  })
  @ApiBody({ type: Organization})
  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @ApiCreatedResponse({
    description: '',
    type: [Organization],
  })
  @ApiBearerAuth()
  @Get()
  findAll(@Query() query) {
    return this.organizationsService.findAll(query);
  }

  @ApiCreatedResponse({
    description: '',
    type: Organization,
  })
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @Get('import/regions')
  async importRegions() {
    await this.organizationsService.importRegions();
    return 'Regions imported successfully';
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @Get('import/countries')
  async importCountries() {
    await this.organizationsService.importCountries();
    return 'Countries imported successfully';
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @Get('import/partners')
  async importPartners() {
    await this.organizationsService.importPartners();
    return 'Partners imported successfully';
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiCreatedResponse({
    description: '',
    type: Organization,
  })
  @ApiBody({ type: Organization})
  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(+id, updateOrganizationDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: getCountriesRegions})
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(+id);
  }
}

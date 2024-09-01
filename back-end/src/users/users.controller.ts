import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../entities/user.entity'
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/role/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';
import { createUserReq, createUserRes, deleteUserReq, exportUsers } from 'src/DTO/user.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCreatedResponse({
  description: '',
  type: [User],
})
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getUsers(@Query() query) {
    return this.usersService.getUsers(query)
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: createUserRes,
  })
  @ApiBody({ type: createUserReq})
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('all')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search/:term')
  async searchUsers(@Param('term') term: string) {
    return this.usersService.searchUsers(term);
  }

  @ApiCreatedResponse({
    description: '',
    type: User,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiBody({ type: createUserReq})
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiCreatedResponse({
    description: '',
    type: '',
  })
  @ApiBody({ type: deleteUserReq})
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @ApiCreatedResponse({
    description: '',
    type: [exportUsers],
  })
  @Get('export/all')
  exportUsers(@Query() query) {
    return this.usersService.exportExcel(query);
  }
}
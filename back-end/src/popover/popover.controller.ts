import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PopoverService } from './popover.service';
import { CreatePopoverDto } from './dto/create-popover.dto';
import { UpdatePopoverDto } from './dto/update-popover.dto';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Popover } from 'src/entities/popover.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@ApiTags('popover')
@Controller('popover')
export class PopoverController {
  constructor(private readonly popoverService: PopoverService) {
  }

  @Post()
  create(@Body() createPopoverDto: CreatePopoverDto) {
    return this.popoverService.create(createPopoverDto);
  }
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: [Popover],
  })
  @Get()
  findAll() {
    return this.popoverService.findAll();
  }
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: Popover,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.popoverService.findOne(+id);
  }
  @ApiBody({ type: Popover })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePopoverDto: UpdatePopoverDto) {
    return this.popoverService.update(+id, updatePopoverDto);
  }

}

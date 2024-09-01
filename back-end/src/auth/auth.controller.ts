import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiCreatedResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/entities/user.entity';
class AuthCode {
  @ApiProperty()
  code: string;
}
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('AWS'))
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: '',
    type: User,
  })
  @Post('aws')
  awsAuth(@Request() req, @Body() authCode: AuthCode) {
    return req.user;
  }
}

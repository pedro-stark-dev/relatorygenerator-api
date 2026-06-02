import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';

import { Public } from './decorators/public.decorator';

import { User } from './decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(
      body.username,
      body.password,
    );
  }

  @Get('me')
  async me(@User() user: any) {
    return user;
  }
}
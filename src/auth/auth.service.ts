import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { UsersService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ) {
    const user = await this.usersService.findByUsername(
      username,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos',
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos',
      );
    }

    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(
      username,
      password,
    );

    const payload = {
      sub: user.id,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
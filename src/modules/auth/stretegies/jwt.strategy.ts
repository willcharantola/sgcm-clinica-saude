// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../../../common/types/user-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // getOrThrow lança erro na inicialização se a variável não existir,
      // garantindo que secretOrKey nunca será undefined em runtime
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token inválido.');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
    };
  }
}
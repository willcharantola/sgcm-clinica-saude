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
      // Extrai o token do cabeçalho Authorization: Bearer {token}
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Rejeita tokens expirados — o guard vai capturar o erro
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Chamado pelo Passport após verificar assinatura e expiração.
   * O retorno deste método é o que ficará em request.user.
   * Optamos por NÃO consultar o banco aqui para manter a verificação
   * em memória (performance). A limitação é que um usuário inativado
   * após o login ainda terá acesso até o token expirar.
   */
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
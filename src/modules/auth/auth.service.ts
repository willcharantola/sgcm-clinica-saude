import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserPayload } from '../../common/types/user-payload.type';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Mensagem genérica: não revela se o e-mail existe ou se a senha
    // está errada — protege contra enumeração de usuários
    const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.type);

    // Salva o refreshToken no banco ANTES de retornar ao cliente
    // para garantir consistência: se o save falhar, o cliente não
    // recebe tokens que não podem ser renovados
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refresh(refreshToken: string) {
    const user = await this.usersService.findByRefreshToken(refreshToken);

    if (!user) {
      // Refresh token não encontrado: pode ter sido usado antes
      // (refresh token rotation) ou simplesmente inválido
      throw new UnauthorizedException(
        'O refresh token fornecido é inválido ou já foi utilizado.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    // Refresh Token Rotation: invalida o token atual e emite um novo par
    // Isso garante que cada refresh token seja de uso único
    const tokens = await this.generateTokens(user.id, user.email, user.type);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    // Idempotente: mesmo que o refreshToken já seja null, não lança erro
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logout realizado com sucesso.' };
  }

  async getProfile(userId: number) {
    // Busca dados atualizados do banco — não apenas o payload do token,
    // que pode estar desatualizado se o usuário atualizou seus dados
    return this.usersService.findOne(userId);
  }

private async generateTokens(userId: number, email: string, type: string) {
  const payload: UserPayload = { sub: userId, email, type };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRES_IN') as StringValue,
    }),
    this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as StringValue,
    }),
  ]);

  return { accessToken, refreshToken };
}
}
// src/common/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Padrão opt-out: protege tudo por padrão.
    // Endpoints marcados com @Public() são liberados sem verificação de token.
    // Isso é mais seguro do que opt-in: o pior caso de um erro é um
    // endpoint legítimo bloqueado, não um endpoint sensível exposto.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }

  // Converte erros específicos do Passport/JWT em UnauthorizedException
  // com mensagens descritivas, antes de chegarem ao Exception Filter
  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException(
        'O token de acesso expirou. Utilize POST /auth/refresh para renová-lo.',
      );
    }
    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException(
        'O token fornecido é inválido ou foi adulterado.',
      );
    }
    if (err || !user) {
      throw new UnauthorizedException(
        'Nenhum token de autenticação foi fornecido.',
      );
    }
    return user; 
  }
}  
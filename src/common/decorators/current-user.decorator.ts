import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../types/user-payload.type';

/**
 * Extrai o usuário autenticado do contexto da requisição.
 * O objeto request.user é populado pelo JwtAuthGuard após
 * verificar o token. Uso: @CurrentUser() user: UserPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
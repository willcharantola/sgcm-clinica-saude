import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se @Roles() não está declarado no endpoint, qualquer usuário
    // autenticado pode acessar (o JwtAuthGuard já garantiu a autenticação)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!requiredRoles.includes(user?.type)) {
      throw new ForbiddenException(
        'Seu perfil não tem permissão para realizar esta operação.',
      );
    }
    return true;
  }
}
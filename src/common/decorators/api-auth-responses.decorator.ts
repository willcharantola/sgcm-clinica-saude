
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

// Reutilizável em todos os endpoints protegidos para evitar repetição
export const ApiAuthResponses = () =>
  applyDecorators(
    ApiBearerAuth('access-token'),
    ApiResponse({
      status: 401,
      description: 'Token ausente, expirado ou inválido.',
      schema: {
        example: {
          type: 'https://sgcm.example.com/problems/unauthorized',
          title: 'Não autenticado',
          status: 401,
          detail: 'O token de acesso expirou. Utilize POST /auth/refresh para renová-lo.',
          instance: '/schedules',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Perfil sem permissão para este endpoint.',
      schema: {
        example: {
          type: 'https://sgcm.example.com/problems/forbidden',
          title: 'Acesso negado',
          status: 403,
          detail: 'Seu perfil não tem permissão para realizar esta operação.',
          instance: '/schedules',
        },
      },
    }),
  );
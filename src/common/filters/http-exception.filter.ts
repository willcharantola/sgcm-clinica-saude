import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Erro interno do servidor';
    let detail = 'Ocorreu um erro inesperado.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      title = this.titleFromStatus(status);

      // ValidationPipe retorna objeto com array de mensagens
      if (typeof body === 'object' && (body as any).message) {
        const msg = (body as any).message;
        detail = Array.isArray(msg) ? msg.join('; ') : msg;
      } else if (typeof body === 'string') {
        detail = body;
      }
    } else if (this.isSqliteUniqueError(exception)) {
      // erro de UNIQUE constraint do SQLite
      status = HttpStatus.CONFLICT;
      title = 'Conflito de recurso';
      detail = 'Violação de unicidade: já existe um registro com esses dados.';
    }  else {
      // Erro não previsto: sempre loga internamente
      this.logger.error(exception);
    
    }

    response.status(status).json({
      type: `https://sgcm.example.com/problems/${this.slugFromStatus(status)}`,
      title,
      status,
      detail,
      instance: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }

  private isSqliteUniqueError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as any).code === 'SQLITE_CONSTRAINT_UNIQUE'
    );
  }

  private titleFromStatus(status: number): string {
    const titles: Record<number, string> = {
      400: 'Requisição inválida',
      401: 'Não autenticado',
      403: 'Acesso negado',
      404: 'Recurso não encontrado',
      409: 'Conflito de recurso',
      500: 'Erro interno do servidor',
    };
    return titles[status] ?? 'Erro';
  }

  private slugFromStatus(status: number): string {
    const slugs: Record<number, string> = {
      400: 'bad-request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not-found',
      409: 'conflict',
      500: 'internal-server-error',
    };
    return slugs[status] ?? 'error';
  }
}
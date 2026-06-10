import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => {
        // Não transforma respostas vazias (ex: DELETE retorna 204 No Content)
        if (data === null || data === undefined) return data;

       
        if (this.isPaginatedResponse(data)) {
          return {
            data: data.data,
            meta: {
              ...data.meta,    // mantém totalItems, page, limit, totalPages
              timestamp,       // adiciona metadados de contexto
              path,
            },
          };
        }

    
        return {
          data,
          meta: { timestamp, path },
        };
      }),
    );
  }

  // Identifica respostas de listagem pelo formato { data: array, meta: object }
  private isPaginatedResponse(data: any): boolean {
    return (
      data !== null &&
      typeof data === 'object' &&
      'data' in data &&
      'meta' in data &&
      Array.isArray(data.data)
    );
  }
}
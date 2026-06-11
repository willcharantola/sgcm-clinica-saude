import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) return data;
        if (skip || data instanceof Buffer || data instanceof StreamableFile) return data;

        if (this.isPaginatedResponse(data)) {
          return {
            data: data.data,
            meta: {
              ...data.meta,
              timestamp,
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
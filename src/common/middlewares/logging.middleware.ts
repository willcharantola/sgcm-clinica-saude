import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const startTime = Date.now();

    // Ouvimos o evento 'finish' da resposta para capturar status e
    // tempo total de processamento sem bloquear o pipeline da requisição.
    // Esta é a abordagem correta para um middleware de logging completo,
    // pois o middleware é executado ANTES dos guards e interceptors —
    // portanto, o status e duração finais só estão disponíveis
    // quando a resposta é encerrada.
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      this.logger.log(
        `${method} ${originalUrl} | ${statusCode} | ${duration}ms | IP: ${ip}`,
      );
    });

    next();
  }
}
// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import helmet from 'helmet';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Swagger — antes de tudo
// src/main.ts — atualizar o DocumentBuilder
const config = new DocumentBuilder()
  .setTitle('SGCM — Sistema de Gestão de Clínica Médica')
  .setDescription(
    `API REST para gerenciamento de clínica médica.\n\n` +
    `## Como autenticar\n` +
    `1. Faça login em **POST /auth/login** com e-mail e senha\n` +
    `2. Copie o \`accessToken\` retornado\n` +
    `3. Clique em **Authorize** (🔓) no topo desta página\n` +
    `4. Cole o token no campo e clique em **Authorize**\n\n` +
    `## Formato das respostas\n` +
    `Todas as respostas de sucesso seguem o envelope:\n` +
    `\`\`\`json\n{ "data": { ... }, "meta": { "timestamp": "...", "path": "..." } }\n\`\`\`\n\n` +
    `## Endpoints públicos\n` +
    `**POST /auth/login** e **POST /auth/refresh** não exigem token.`,
  )
  .setVersion('2.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Insira o token JWT obtido em POST /auth/login',
    },
    'access-token',
  )
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // rejeita requisições com campos desconhecidos
      transform: true,           // converte tipos automaticamente
    }),
  );

  const reflector = app.get(Reflector);

  // Serialização global — garante @Exclude/@Expose nos DTOs de resposta
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
     new TransformInterceptor()
  );

  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  // Filtro de exceção global — formato RFC 7807
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
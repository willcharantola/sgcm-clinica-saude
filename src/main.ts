// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger — antes de tudo
  const config = new DocumentBuilder()
    .setTitle('SGCM — Sistema de Gestão de Clínica Médica')
    .setDescription('API para gerenciamento de usuários, especialidades e agendamentos.')
    .setVersion('1.0')
    .addBearerAuth() // preparação para JWT na Etapa 2
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

  // Serialização global — garante @Exclude/@Expose nos DTOs de resposta
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Filtro de exceção global — formato RFC 7807
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
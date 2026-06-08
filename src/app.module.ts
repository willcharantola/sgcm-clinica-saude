import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Valida variáveis de ambiente na inicialização — falha com mensagem
    // clara se alguma obrigatória estiver ausente
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_PATH: Joi.string().default('./database.db'),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? './database.db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    SpecialtiesModule,
    SchedulesModule,
    AuthModule,
  ],
})
export class AppModule {}
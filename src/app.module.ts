import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { LoggingMiddleware } from './common/middlewares/logging.middleware';

@Module({
  imports: [
   
    ConfigModule.forRoot({
      isGlobal: true,
        envFilePath: '.env',
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
    AppointmentsModule,
    ProceduresModule,
    MedicalRecordsModule,
  ],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica a todas as rotas — nenhuma requisição passa sem ser registrada
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
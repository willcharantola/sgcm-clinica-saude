// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/users/entities/user.entity';
import { Admin } from './modules/users/entities/admin.entity';
import { Doctor } from './modules/users/entities/doctor.entity';
import { Patient } from './modules/users/entities/patient.entity';
import { Specialty } from './modules/specialties/entities/specialty.entity';
import { DoctorSpecialty } from './modules/specialties/entities/doctor-specialty.entity';
import { Schedule } from './modules/schedules/entities/schedule.entity';
import { InPersonSchedule } from './modules/schedules/entities/in-person-schedule.entity';
import { OnlineSchedule } from './modules/schedules/entities/online-schedule.entity';
import { HomeSchedule } from './modules/schedules/entities/home-schedule.entity';
import { UsersModule } from './modules/users/users.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { SchedulesModule } from './modules/schedules/schedules.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? './database.db',
      entities: [
        User, Admin, Doctor, Patient,
        Specialty, DoctorSpecialty,
        Schedule, InPersonSchedule, OnlineSchedule, HomeSchedule,
      ],
      synchronize: true, // OK para dev — anotar decisão no relatório
    }),
    UsersModule,
    SpecialtiesModule,
    SchedulesModule,
  ],
})
export class AppModule {}
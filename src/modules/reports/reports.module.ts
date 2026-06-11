import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Report } from './entities/report.entity';
import { PdfService } from './pdf.service';
import { ReportsService } from './reports.service';
import {
  AppointmentReportsController,
  DoctorReportsController,
  PatientReportsController,
  ReportsController,
} from './reports.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    AppointmentsModule,
    UsersModule,
  ],
  controllers: [
    AppointmentReportsController,
    ReportsController,
    PatientReportsController,
    DoctorReportsController,
  ],
  providers: [ReportsService, PdfService],
  exports: [ReportsService],
})
export class ReportsModule {}

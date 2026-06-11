import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import {
  AppointmentRecordsController,
  DoctorRecordsController,
  MedicalRecordsController,
  PatientRecordsController,
} from './medical-records.controller';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecord]),
    AppointmentsModule,
  ],
  controllers: [
    AppointmentRecordsController,
    MedicalRecordsController,
    PatientRecordsController,
    DoctorRecordsController,
  ],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}

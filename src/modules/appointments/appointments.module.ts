import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from './entities/appointment.entity';
import { Consultation } from './entities/consultation.entity';
import { Exam } from './entities/exam.entity';
import { FollowUp } from './entities/follow-up.entity';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsController,
  DoctorAppointmentsController,
  PatientAppointmentsController,
} from './appointments.controller';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Consultation, Exam, FollowUp]),
    SchedulesModule,
  ],
  controllers: [
    AppointmentsController,
    DoctorAppointmentsController,
    PatientAppointmentsController,
  ],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

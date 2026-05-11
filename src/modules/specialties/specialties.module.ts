import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Specialty } from './entities/specialty.entity';
import { DoctorSpecialty } from './entities/doctor-specialty.entity';
import { Doctor } from '../users/entities/doctor.entity';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Specialty, DoctorSpecialty, Doctor])],
  controllers: [SpecialtiesController],
  providers: [SpecialtiesService],
  exports: [SpecialtiesService],
})
export class SpecialtiesModule {}
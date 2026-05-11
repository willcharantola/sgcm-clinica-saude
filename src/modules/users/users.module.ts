import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Admin } from './entities/admin.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DoctorsController } from './doctors.controller';
import { PatientsController } from './patients.controller';
import { SpecialtiesModule } from '../specialties/specialties.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Admin, Doctor, Patient]),
    SpecialtiesModule,
    forwardRef(() => SchedulesModule), // evita dependência circular
  ],
  controllers: [UsersController, DoctorsController, PatientsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
// src/modules/users/entities/doctor.entity.ts
import { ChildEntity, Column, OneToMany } from 'typeorm';
import { User, UserType } from './user.entity';
import { DoctorSpecialty } from '../../specialties/entities/doctor-specialty.entity';

@ChildEntity(UserType.DOCTOR)
export class Doctor extends User {
  @Column({ unique: true })
  crm: string;

  @OneToMany(() => DoctorSpecialty, (ds) => ds.doctor)
  doctorSpecialties: DoctorSpecialty[];
}
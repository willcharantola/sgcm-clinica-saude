// src/modules/specialties/entities/doctor-specialty.entity.ts
import {
    Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Doctor } from '../../users/entities/doctor.entity';
import { Specialty } from './specialty.entity';

@Entity('doctor_specialties')
export class DoctorSpecialty {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.doctorSpecialties, {
    onDelete: 'CASCADE',
  })
  doctor: Doctor;

  @Column()
  doctorId: number;

  @ManyToOne(() => Specialty, (specialty) => specialty.doctorSpecialties)
  specialty: Specialty;

  @Column()
  specialtyId: number;

  @CreateDateColumn()
  assignedAt: Date;
}
// src/modules/schedules/entities/schedule.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../../users/entities/patient.entity';
import { Doctor } from '../../users/entities/doctor.entity';
import { User } from '../../users/entities/user.entity';

export enum ScheduleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ScheduleType {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
  HOME = 'HOME',
}

@Entity('schedules')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime' })
  scheduledAt: Date;

  @Column({ type: 'varchar', default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Column({ type: 'varchar' })
  type: ScheduleType;

  @ManyToOne(() => Doctor)
  doctor: Doctor;

  @Column()
  doctorId: number;

  @ManyToOne(() => Patient)
  patient: Patient;

  @Column()
  patientId: number;

  // Preenchido no cancelamento
  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancellationReason: string;

  // Preenchido na Etapa 2 com autenticação
  @ManyToOne(() => User, { nullable: true })
  cancelledBy: User;

  @Column({ nullable: true })
  cancelledById: number;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
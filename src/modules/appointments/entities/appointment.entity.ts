import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';
import { Schedule } from '../../schedules/entities/schedule.entity';

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  EXAM = 'EXAM',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum AppointmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

@Entity('appointments')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, type: 'datetime' })
  startedAt: Date;

  @Column({ nullable: true, type: 'datetime' })
  endedAt: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ type: 'varchar' })
  type: AppointmentType;

  @Column({ type: 'varchar', default: AppointmentStatus.IN_PROGRESS })
  status: AppointmentStatus;

  @Column()
  scheduleId: number;

  @ManyToOne(() => Schedule)
  schedule: Schedule;

  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

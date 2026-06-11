import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum ProcedureType {
  SIMPLE = 'SIMPLE',
  SPECIALIZED = 'SPECIALIZED',
}

export enum ComplexityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AuthorizationStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED',
}

@Entity('procedures')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Procedure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  type: ProcedureType;

  @Column()
  appointmentId: number;

  @ManyToOne(() => Appointment)
  appointment: Appointment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

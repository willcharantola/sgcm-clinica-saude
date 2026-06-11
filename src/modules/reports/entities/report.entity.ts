import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum ReportStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  validationCode: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: ReportStatus.ACTIVE })
  status: ReportStatus;

  @Column()
  appointmentId: number;

  @ManyToOne(() => Appointment)
  appointment: Appointment;

  @Column()
  issuedById: number;

  @Column({ nullable: true, type: 'datetime' })
  revokedAt: Date;

  @Column({ nullable: true, type: 'text' })
  revokedReason: string;

  @Column({ nullable: true })
  revokedById: number;

  @CreateDateColumn()
  issuedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

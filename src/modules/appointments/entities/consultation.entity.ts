import { ChildEntity, Column } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.CONSULTATION)
export class Consultation extends Appointment {
  @Column({ type: 'text' })
  reason: string;

  @Column({ nullable: true, type: 'text' })
  diagnosticHypothesis: string;
}

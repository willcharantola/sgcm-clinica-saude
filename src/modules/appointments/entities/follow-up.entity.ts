import { ChildEntity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.FOLLOW_UP)
export class FollowUp extends Appointment {
  @Column()
  originAppointmentId: number;

  @ManyToOne(() => Appointment)
  @JoinColumn({ name: 'originAppointmentId' })
  originAppointment: Appointment;

  @Column({ nullable: true, type: 'text' })
  clinicalEvolution: string;
}

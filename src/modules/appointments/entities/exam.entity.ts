import { ChildEntity, Column } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.EXAM)
export class Exam extends Appointment {
  @Column({ type: 'varchar' })
  examType: string;

  @Column({ nullable: true, type: 'text' })
  result: string;
}

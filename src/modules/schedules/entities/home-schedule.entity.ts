// src/modules/schedules/entities/home-schedule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.HOME)
export class HomeSchedule extends Schedule {
  @Column()
  fullAddress: string;

  @Column({ nullable: true })
  accessNotes: string;
}
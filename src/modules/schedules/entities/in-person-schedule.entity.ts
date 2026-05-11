// src/modules/schedules/entities/in-person-schedule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.IN_PERSON)
export class InPersonSchedule extends Schedule {
  @Column()
  room: string;

  @Column()
  unit: string;
}
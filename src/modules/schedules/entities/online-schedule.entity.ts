// src/modules/schedules/entities/online-schedule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { Schedule, ScheduleType } from './schedule.entity';

@ChildEntity(ScheduleType.ONLINE)
export class OnlineSchedule extends Schedule {
  @Column()
  accessLink: string;

  @Column()
  platform: string;
}
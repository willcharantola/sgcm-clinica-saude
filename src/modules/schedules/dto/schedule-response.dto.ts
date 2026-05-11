// src/modules/schedules/dto/schedule-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { ScheduleStatus, ScheduleType } from '../entities/schedule.entity';

@Exclude()
export class ScheduleResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: '2026-06-10T09:00:00.000Z' })
  scheduledAt: Date;

  @Expose()
  @ApiProperty({ enum: ScheduleStatus })
  status: ScheduleStatus;

  @Expose()
  @ApiProperty({ enum: ScheduleType })
  type: ScheduleType;

  @Expose()
  @ApiProperty({ example: 1 })
  doctorId: number;

  @Expose()
  @ApiProperty({ example: 2 })
  patientId: number;

  // IN_PERSON
  @Expose()
  @ApiPropertyOptional({ example: '102' })
  room?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Unidade Central' })
  unit?: string;

  // ONLINE
  @Expose()
  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-def' })
  accessLink?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Google Meet' })
  platform?: string;

  // HOME
  @Expose()
  @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
  fullAddress?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Portão azul, tocar campainha.' })
  accessNotes?: string;

  // cancelamento
  @Expose()
  @ApiPropertyOptional({ example: '2026-06-09T10:00:00.000Z' })
  cancelledAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 'Paciente não pôde comparecer.' })
  cancellationReason?: string;

  @Expose()
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  updatedAt: Date;
}
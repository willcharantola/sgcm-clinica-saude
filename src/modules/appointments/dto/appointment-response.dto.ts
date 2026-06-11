import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { AppointmentStatus, AppointmentType } from '../entities/appointment.entity';

@Exclude()
export class AppointmentResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ enum: AppointmentType })
  type: AppointmentType;

  @Expose()
  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @Expose()
  @ApiProperty({ example: 1 })
  scheduleId: number;

  @Expose()
  @ApiProperty({ example: 1 })
  doctorId: number;

  @Expose()
  @ApiProperty({ example: 2 })
  patientId: number;

  @Expose()
  @ApiPropertyOptional({ example: '2026-06-11T08:00:00.000Z' })
  startedAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: '2026-06-11T09:00:00.000Z' })
  endedAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 'Observações gerais.' })
  notes?: string;

  // CONSULTATION
  @Expose()
  @ApiPropertyOptional({ example: 'Dor de cabeça persistente' })
  reason?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Enxaqueca tensional' })
  diagnosticHypothesis?: string;

  // EXAM
  @Expose()
  @ApiPropertyOptional({ example: 'Hemograma completo' })
  examType?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Resultado dentro da normalidade.' })
  result?: string;

  // FOLLOW_UP
  @Expose()
  @ApiPropertyOptional({ example: 1 })
  originAppointmentId?: number;

  @Expose()
  @ApiPropertyOptional({ example: 'Evolução satisfatória.' })
  clinicalEvolution?: string;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  updatedAt: Date;
}

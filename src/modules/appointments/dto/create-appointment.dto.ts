import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppointmentType } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  scheduleId: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiPropertyOptional({ example: '2026-06-11T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-06-11T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({ example: 'Paciente relatou melhora.' })
  @IsOptional()
  @IsString()
  notes?: string;

  // CONSULTATION
  @ApiPropertyOptional({ example: 'Dor de cabeça persistente' })
  @ValidateIf((o) => o.type === AppointmentType.CONSULTATION)
  @IsNotEmpty()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Enxaqueca tensional' })
  @ValidateIf((o) => o.type === AppointmentType.CONSULTATION)
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // EXAM
  @ApiPropertyOptional({ example: 'Hemograma completo' })
  @ValidateIf((o) => o.type === AppointmentType.EXAM)
  @IsNotEmpty()
  @IsString()
  examType?: string;

  @ApiPropertyOptional({ example: 'Resultado dentro da normalidade.' })
  @ValidateIf((o) => o.type === AppointmentType.EXAM)
  @IsOptional()
  @IsString()
  result?: string;

  // FOLLOW_UP
  @ApiPropertyOptional({ example: 1 })
  @ValidateIf((o) => o.type === AppointmentType.FOLLOW_UP)
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originAppointmentId?: number;

  @ApiPropertyOptional({ example: 'Paciente apresentou evolução satisfatória.' })
  @ValidateIf((o) => o.type === AppointmentType.FOLLOW_UP)
  @IsOptional()
  @IsString()
  clinicalEvolution?: string;
}

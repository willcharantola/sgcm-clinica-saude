import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: '2026-06-11T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-06-11T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({ example: 'Observações adicionais.' })
  @IsOptional()
  @IsString()
  notes?: string;

  // CONSULTATION
  @ApiPropertyOptional({ example: 'Dor de cabeça' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Enxaqueca' })
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // EXAM
  @ApiPropertyOptional({ example: 'Hemograma completo' })
  @IsOptional()
  @IsString()
  examType?: string;

  @ApiPropertyOptional({ example: 'Resultado normal' })
  @IsOptional()
  @IsString()
  result?: string;

  // FOLLOW_UP
  @ApiPropertyOptional({ example: 'Evolução satisfatória.' })
  @IsOptional()
  @IsString()
  clinicalEvolution?: string;
}

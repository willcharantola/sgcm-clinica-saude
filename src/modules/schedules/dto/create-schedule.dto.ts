// src/modules/schedules/dto/create-schedule.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ScheduleType } from '../entities/schedule.entity';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Data e hora do agendamento em formato ISO 8601 — deve ser uma data futura.',
    example: '2026-06-10T09:00:00.000Z',
  })
  @IsDateString({}, { message: 'scheduledAt deve ser uma data válida no formato ISO 8601.' })
  scheduledAt: string;

  @ApiProperty({ description: 'ID do médico responsável', example: 1 })
  @IsInt()
  @IsPositive()
  doctorId: number;

  @ApiProperty({ description: 'ID do paciente', example: 2 })
  @IsInt()
  @IsPositive()
  patientId: number;

  @ApiProperty({ enum: ScheduleType, description: 'Modalidade do agendamento' })
  @IsEnum(ScheduleType, { message: 'O tipo deve ser IN_PERSON, ONLINE ou HOME.' })
  type: ScheduleType;

  // ─── IN_PERSON ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Sala (obrigatório para IN_PERSON)', example: '102' })
  @ValidateIf((o) => o.type === ScheduleType.IN_PERSON)
  @IsNotEmpty({ message: 'A sala é obrigatória para agendamentos presenciais.' })
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Unidade (obrigatório para IN_PERSON)', example: 'Unidade Central' })
  @ValidateIf((o) => o.type === ScheduleType.IN_PERSON)
  @IsNotEmpty({ message: 'A unidade é obrigatória para agendamentos presenciais.' })
  @IsString()
  unit?: string;

  // ─── ONLINE ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Link de acesso (obrigatório para ONLINE)', example: 'https://meet.google.com/abc-def' })
  @ValidateIf((o) => o.type === ScheduleType.ONLINE)
  @IsNotEmpty({ message: 'O link de acesso é obrigatório para agendamentos online.' })
  @IsUrl({}, { message: 'accessLink deve ser uma URL válida.' })
  accessLink?: string;

  @ApiPropertyOptional({ description: 'Plataforma (obrigatório para ONLINE)', example: 'Google Meet' })
  @ValidateIf((o) => o.type === ScheduleType.ONLINE)
  @IsNotEmpty({ message: 'A plataforma é obrigatória para agendamentos online.' })
  @IsString()
  platform?: string;

  // ─── HOME ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Endereço completo (obrigatório para HOME)', example: 'Rua das Flores, 123, Campo Grande - MS' })
  @ValidateIf((o) => o.type === ScheduleType.HOME)
  @IsNotEmpty({ message: 'O endereço completo é obrigatório para agendamentos domiciliares.' })
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({ description: 'Observações de acesso (opcional para HOME)', example: 'Portão azul, tocar campainha.' })
  @IsOptional()
  @IsString()
  accessNotes?: string;
}
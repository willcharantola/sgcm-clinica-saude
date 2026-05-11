// src/modules/schedules/dto/update-schedule-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

// COMPLETED não é aceito via API — ocorre internamente na Etapa 3
export enum AllowedStatusTransition {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class UpdateScheduleStatusDto {
  @ApiProperty({
    enum: AllowedStatusTransition,
    description: 'Novo status. Apenas CONFIRMED e CANCELLED são aceitos via API.',
    example: 'CONFIRMED',
  })
  @IsEnum(AllowedStatusTransition, {
    message: 'O status deve ser CONFIRMED ou CANCELLED. COMPLETED não pode ser definido diretamente.',
  })
  status: AllowedStatusTransition;

  @ApiProperty({
    description: 'Motivo do cancelamento (obrigatório quando status = CANCELLED)',
    example: 'Paciente não pôde comparecer.',
    required: false,
  })
  cancellationReason?: string;
}
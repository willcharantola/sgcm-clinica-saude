// src/modules/schedules/dto/update-schedule.dto.ts
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateScheduleDto } from './create-schedule.dto';

// não permite alterar tipo, médico ou paciente após criação
export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ['type', 'doctorId', 'patientId'] as const),
) {}
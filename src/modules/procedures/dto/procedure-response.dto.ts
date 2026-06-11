import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  AuthorizationStatus,
  ComplexityLevel,
  ProcedureType,
} from '../entities/procedure.entity';

@Exclude()
export class ProcedureResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Eletrocardiograma' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Avaliação da atividade elétrica do coração.' })
  description?: string;

  @Expose()
  @ApiProperty({ enum: ProcedureType })
  type: ProcedureType;

  @Expose()
  @ApiProperty({ example: 1 })
  appointmentId: number;

  // SIMPLE
  @Expose()
  @ApiPropertyOptional({ example: 30 })
  estimatedDuration?: number;

  // SPECIALIZED
  @Expose()
  @ApiPropertyOptional({ example: 'Monitor cardíaco' })
  requiredEquipment?: string;

  @Expose()
  @ApiPropertyOptional({ enum: ComplexityLevel })
  complexityLevel?: ComplexityLevel;

  @Expose()
  @ApiPropertyOptional({ example: false })
  requiresAuthorization?: boolean;

  @Expose()
  @ApiPropertyOptional({ enum: AuthorizationStatus })
  authorizationStatus?: AuthorizationStatus;

  @Expose()
  @ApiPropertyOptional({ example: '2026-06-11T10:00:00.000Z' })
  authorizedAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 1 })
  authorizedById?: number;

  @Expose()
  @ApiPropertyOptional({ example: 'Equipamento indisponível.' })
  denialReason?: string;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  updatedAt: Date;
}

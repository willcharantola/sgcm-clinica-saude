import {
  IsBoolean,
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
import { ComplexityLevel, ProcedureType } from '../entities/procedure.entity';

export class CreateProcedureDto {
  @ApiProperty({ example: 'Eletrocardiograma' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Avaliação da atividade elétrica do coração.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProcedureType })
  @IsEnum(ProcedureType)
  type: ProcedureType;

  // SIMPLE
  @ApiPropertyOptional({ example: 30, description: 'Duração estimada em minutos' })
  @ValidateIf((o) => o.type === ProcedureType.SIMPLE)
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDuration?: number;

  // SPECIALIZED
  @ApiPropertyOptional({ example: 'Monitor cardíaco, eletrodos' })
  @ValidateIf((o) => o.type === ProcedureType.SPECIALIZED)
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: ComplexityLevel, default: ComplexityLevel.LOW })
  @ValidateIf((o) => o.type === ProcedureType.SPECIALIZED)
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;

  @ApiPropertyOptional({ example: false })
  @ValidateIf((o) => o.type === ProcedureType.SPECIALIZED)
  @IsNotEmpty()
  @IsBoolean()
  requiresAuthorization?: boolean;
}

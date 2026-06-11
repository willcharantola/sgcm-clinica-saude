import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ComplexityLevel } from '../entities/procedure.entity';

export class UpdateProcedureDto {
  @ApiPropertyOptional({ example: 'Eletrocardiograma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada.' })
  @IsOptional()
  @IsString()
  description?: string;

  // SIMPLE
  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDuration?: number;

  // SPECIALIZED
  @ApiPropertyOptional({ example: 'Monitor cardíaco' })
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: ComplexityLevel })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;
}

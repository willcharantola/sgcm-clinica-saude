import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ example: 'Hipertensão arterial sistêmica estágio 2.' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Losartana 100mg, 1x ao dia.' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiPropertyOptional({ example: 'Paciente com acompanhamento mensal.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

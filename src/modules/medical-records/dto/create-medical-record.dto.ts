import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'Hipertensão arterial sistêmica estágio 1.' })
  @IsNotEmpty()
  @IsString()
  diagnosis: string;

  @ApiPropertyOptional({ example: 'Losartana 50mg, 1x ao dia.' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiPropertyOptional({ example: 'Paciente orientado sobre dieta e exercícios.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

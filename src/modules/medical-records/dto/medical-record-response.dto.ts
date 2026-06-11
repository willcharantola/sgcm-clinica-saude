import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class MedicalRecordResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Hipertensão arterial sistêmica estágio 1.' })
  diagnosis: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Losartana 50mg, 1x ao dia.' })
  prescription?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Paciente orientado sobre dieta e exercícios.' })
  notes?: string;

  @Expose()
  @ApiProperty({ example: 1 })
  appointmentId: number;

  @Expose()
  @ApiPropertyOptional({ example: 1 })
  lastUpdatedById?: number;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  updatedAt: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { ReportStatus } from '../entities/report.entity';

@Exclude()
export class ReportResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  validationCode: string;

  @Expose()
  @ApiProperty({ example: 'LAUDO DE EXAME MÉDICO\nPaciente: João Silva...' })
  content: string;

  @Expose()
  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @Expose()
  @ApiProperty({ example: 1 })
  appointmentId: number;

  @Expose()
  @ApiProperty({ example: 1 })
  issuedById: number;

  @Expose()
  @ApiPropertyOptional({ example: '2026-06-11T10:00:00.000Z' })
  revokedAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 'Resultado incorreto.' })
  revokedReason?: string;

  @Expose()
  @ApiPropertyOptional({ example: 1 })
  revokedById?: number;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  issuedAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  updatedAt: Date;
}

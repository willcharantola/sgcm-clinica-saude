import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

// resposta simples de especialidade (sem médicos)
@Exclude()
export class SpecialtyResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Cardiologia' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'Especialidade voltada ao coração.' })
  description: string;

  @Expose()
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  updatedAt: Date;
}
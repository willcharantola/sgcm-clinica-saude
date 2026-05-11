import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AssociateSpecialtyDto {
  @ApiProperty({ description: 'ID da especialidade a associar', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  specialtyId: number;
}
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from './date-range-query.dto';

export class AppointmentReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctorId?: number;
}

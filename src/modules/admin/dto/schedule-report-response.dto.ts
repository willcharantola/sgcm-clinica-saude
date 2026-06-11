import { ApiProperty } from '@nestjs/swagger';

class CountByKey {
  @ApiProperty()
  key: string;

  @ApiProperty()
  count: number;
}

export class ScheduleReportResponseDto {
  @ApiProperty({ type: [CountByKey], description: 'Total por status (PENDING, CONFIRMED, CANCELLED, COMPLETED)' })
  byStatus: CountByKey[];

  @ApiProperty({ type: [CountByKey], description: 'Total por tipo (IN_PERSON, ONLINE, HOME)' })
  byType: CountByKey[];

  @ApiProperty({ description: 'Total de agendamentos no período' })
  total: number;
}

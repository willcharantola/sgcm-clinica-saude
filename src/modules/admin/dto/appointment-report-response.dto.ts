import { ApiProperty } from '@nestjs/swagger';

class CountByKey {
  @ApiProperty()
  key: string;

  @ApiProperty()
  count: number;
}

export class AppointmentReportResponseDto {
  @ApiProperty({ type: [CountByKey], description: 'Total por tipo (CONSULTATION, EXAM, FOLLOW_UP)' })
  byType: CountByKey[];

  @ApiProperty({ type: [CountByKey], description: 'Total por status (IN_PROGRESS, FINISHED)' })
  byStatus: CountByKey[];
}

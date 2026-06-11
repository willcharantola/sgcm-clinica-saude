import { ApiProperty } from '@nestjs/swagger';

class CountByKey {
  @ApiProperty()
  key: string;

  @ApiProperty()
  count: number;
}

export class OccupationReportResponseDto {
  @ApiProperty({ example: 1 })
  doctorId: number;

  @ApiProperty({ description: 'Total de agendamentos no período' })
  totalSchedules: number;

  @ApiProperty({ type: [CountByKey], description: 'Total por status' })
  byStatus: CountByKey[];

  @ApiProperty({
    example: 75.0,
    description:
      'Taxa de ocupação (%) — fórmula: (CONFIRMED + COMPLETED) / total × 100. ' +
      'Retorna 0 quando não há agendamentos no período.',
  })
  occupationRate: number;
}

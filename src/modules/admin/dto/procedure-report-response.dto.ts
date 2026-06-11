import { ApiProperty } from '@nestjs/swagger';

class CountByKey {
  @ApiProperty()
  key: string;

  @ApiProperty()
  count: number;
}

export class ProcedureReportResponseDto {
  @ApiProperty({ type: [CountByKey], description: 'Total por tipo (SIMPLE, SPECIALIZED)' })
  byType: CountByKey[];

  @ApiProperty({ type: [CountByKey], description: 'Especializados por authorizationStatus (PENDING, AUTHORIZED, DENIED)' })
  specializedByAuthorizationStatus: CountByKey[];

  @ApiProperty({ type: [CountByKey], description: 'Especializados por complexityLevel (LOW, MEDIUM, HIGH)' })
  specializedByComplexityLevel: CountByKey[];
}

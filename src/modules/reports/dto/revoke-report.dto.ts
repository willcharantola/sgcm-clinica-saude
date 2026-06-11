import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeReportDto {
  @ApiProperty({ example: 'Resultado incorreto. Novo laudo será emitido.' })
  @IsNotEmpty()
  @IsString()
  revokedReason: string;
}

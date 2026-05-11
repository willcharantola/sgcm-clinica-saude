import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSpecialtyDto {
  @ApiProperty({ description: 'Nome da especialidade', example: 'Cardiologia' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descrição da especialidade',
    example: 'Especialidade voltada ao diagnóstico e tratamento de doenças do coração.',
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  @IsString()
  description: string;
}
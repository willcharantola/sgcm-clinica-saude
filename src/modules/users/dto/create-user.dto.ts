// src/modules/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome completo do usuário', example: 'Rafael Mendes' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'E-mail do usuário', example: 'rafael@clinica.com' })
  @IsEmail({}, { message: 'O e-mail deve ter formato válido.' })
  email: string;

  @ApiProperty({ description: 'Senha com mínimo de 8 caracteres', example: 'senha@123' })
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @ApiProperty({ enum: UserType, description: 'Perfil do usuário' })
  @IsEnum(UserType, { message: 'O tipo deve ser ADMIN, DOCTOR ou PATIENT.' })
  type: UserType;

  // --- campos de Doctor ---
  @ApiPropertyOptional({ description: 'CRM do médico (obrigatório para DOCTOR)', example: '12345-SP' })
  @IsOptional()
  @IsString()
  crm?: string;

  // --- campos de Patient ---
  @ApiPropertyOptional({ description: 'CPF do paciente (obrigatório para PATIENT)', example: '123.456.789-09' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ description: 'Data de nascimento (obrigatório para PATIENT)', example: '1990-05-20' })
  @IsOptional()
  @IsDateString({}, { message: 'A data de nascimento deve ser uma data válida.' })
  birthDate?: string;
}
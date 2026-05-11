// src/modules/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserType } from '../entities/user.entity';

@Exclude() // exclui TUDO por padrão — só expõe com @Expose()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Rafael Mendes' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'rafael@clinica.com' })
  email: string;

  @Expose()
  @ApiProperty({ enum: UserType })
  type: UserType;

  @Expose()
  @ApiProperty({ example: true })
  isActive: boolean;

  // Doctor
  @Expose()
  @ApiPropertyOptional({ example: '12345-SP' })
  crm?: string;

  // Patient
  @Expose()
  @ApiPropertyOptional({ example: '123.456.789-09' })
  cpf?: string;

  @Expose()
  @ApiPropertyOptional({ example: '1990-05-20' })
  birthDate?: Date;

  @Expose()
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  createdAt: Date;

  // password e refreshToken NÃO têm @Expose() — nunca aparecem
}
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@sgcm.com' })
  @IsEmail({}, { message: 'O campo email deve ter um formato válido.' })
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password: string;
}
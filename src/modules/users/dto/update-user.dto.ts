// src/modules/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Remove 'type' e 'password' do update — tipo é imutável, senha tem endpoint próprio
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['type', 'password'] as const),
) {}
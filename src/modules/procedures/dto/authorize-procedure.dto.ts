import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuthorizeAction {
  AUTHORIZE = 'AUTHORIZE',
  DENY = 'DENY',
}

export class AuthorizeProcedureDto {
  @ApiProperty({ enum: AuthorizeAction })
  @IsEnum(AuthorizeAction)
  action: AuthorizeAction;

  @ApiPropertyOptional({ example: 'Equipamento indisponível no momento.' })
  @ValidateIf((o) => o.action === AuthorizeAction.DENY)
  @IsNotEmpty()
  @IsString()
  denialReason?: string;
}

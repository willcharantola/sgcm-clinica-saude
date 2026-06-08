// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Autenticar usuário',
    description:
      'Autentica com e-mail e senha. Retorna accessToken (curta duração) ' +
      'e refreshToken (longa duração). Use o accessToken no botão Authorize acima.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Renovar token de acesso',
    description:
      'Renova o accessToken usando um refreshToken válido. ' +
      'O refreshToken utilizado é invalidado imediatamente (uso único). ' +
      'Um novo par de tokens é retornado.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({
    summary: 'Dados do usuário autenticado',
    description: 'Retorna os dados completos do perfil autenticado, ' +
      'incluindo atributos específicos do subtipo (crm, cpf, etc).',
  })
  getMe(@CurrentUser() user: UserPayload) {
    return this.authService.getProfile(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Encerrar sessão',
    description:
      'Invalida o refreshToken no banco. O accessToken continua válido ' +
      'até sua expiração natural — limitação inerente ao JWT stateless.',
  })
  logout(@CurrentUser() user: UserPayload) {
    return this.authService.logout(user.sub);
  }
}
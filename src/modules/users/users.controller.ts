import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar usuário',
    description:
      'Cria um novo usuário informando o perfil (ADMIN, DOCTOR ou PATIENT) e os atributos específicos do subtipo. Médicos exigem CRM único; pacientes exigem CPF válido e data de nascimento.',
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou campos obrigatórios ausentes.' })
  @ApiResponse({ status: 409, description: 'E-mail ou CRM já cadastrado.' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return plainToInstance(UserResponseDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuários',
    description: 'Lista usuários ativos com filtro por perfil e paginação.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuários.' })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAll(query);
    return {
      data: result.data.map((u) => plainToInstance(UserResponseDto, u)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return plainToInstance(UserResponseDto, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto);
    return plainToInstance(UserResponseDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Inativar usuário',
    description: 'Realiza inativação lógica. Usuários com agendamentos ativos (PENDING ou CONFIRMED) não podem ser removidos.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Usuário inativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 409, description: 'Usuário possui agendamentos ativos.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.remove(id);
  }
}
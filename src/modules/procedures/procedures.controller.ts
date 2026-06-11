import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { AuthorizeProcedureDto } from './dto/authorize-procedure.dto';
import { FindProceduresQueryDto } from './dto/find-procedures-query.dto';
import { ProcedureResponseDto } from './dto/procedure-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorators';
import { UserPayload } from '../../common/types/user-payload.type';
import { ApiAuthResponses } from '../../common/decorators/api-auth-responses.decorator';

// ─── Rotas aninhadas: /appointments/:id/procedures ───────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Procedures')
@Controller('appointments')
export class AppointmentProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post(':id/procedures')
  @Roles('ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar procedimento a um atendimento IN_PROGRESS' })
  @ApiParam({ name: 'id', description: 'ID do atendimento', example: 1 })
  @ApiResponse({ status: 201, type: ProcedureResponseDto })
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.' })
  async create(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const procedure = await this.proceduresService.create(appointmentId, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, procedure);
  }

  @Get(':id/procedures')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Listar procedimentos de um atendimento' })
  @ApiParam({ name: 'id', description: 'ID do atendimento', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de procedimentos.' })
  async findAll(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Query() query: FindProceduresQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.findAllByAppointment(
      appointmentId,
      query,
      currentUser,
    );
    return {
      data: result.data.map((p) => plainToInstance(ProcedureResponseDto, p)),
      meta: result.meta,
    };
  }
}

// ─── Rotas diretas: /procedures/:id ──────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Buscar procedimento por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ProcedureResponseDto })
  @ApiResponse({ status: 404, description: 'Procedimento não encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const procedure = await this.proceduresService.findOne(id, currentUser);
    return plainToInstance(ProcedureResponseDto, procedure);
  }

  @Put(':id')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Atualizar procedimento' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ProcedureResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const procedure = await this.proceduresService.update(id, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, procedure);
  }

  @Patch(':id/authorization')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Autorizar ou negar um procedimento especializado (Admin apenas)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ProcedureResponseDto })
  @ApiResponse({ status: 400, description: 'Procedimento não é do tipo SPECIALIZED.' })
  async authorize(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AuthorizeProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const procedure = await this.proceduresService.authorize(id, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, procedure);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover procedimento (bloqueado se atendimento FINISHED)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Removido com sucesso.' })
  @ApiResponse({ status: 409, description: 'Atendimento FINISHED — procedimento não pode ser removido.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ): Promise<void> {
    await this.proceduresService.remove(id, currentUser);
  }
}

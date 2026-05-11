// src/modules/schedules/schedules.controller.ts
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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';

@ApiTags('Schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar agendamento',
    description:
      'Cria agendamento nas modalidades IN_PERSON, ONLINE ou HOME. Cada modalidade exige atributos específicos. A data deve ser futura e o médico não pode ter conflito de horário.',
  })
  @ApiResponse({ status: 201, type: ScheduleResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou data no passado.' })
  @ApiResponse({ status: 404, description: 'Médico ou paciente não encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflito de horário para o médico.' })
  async create(@Body() dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.create(dto);
    return plainToInstance(ScheduleResponseDto, schedule);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar agendamentos',
    description: 'Lista com filtros por doctorId, patientId, status, type e intervalo de datas.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de agendamentos.' })
  async findAll(@Query() query: FindSchedulesQueryDto) {
    const result = await this.schedulesService.findAll(query);
    return {
      data: result.data.map((s) => plainToInstance(ScheduleResponseDto, s)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.findOne(id);
    return plainToInstance(ScheduleResponseDto, schedule);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar agendamento',
    description: 'Atualiza dados do agendamento. Tipo, médico e paciente não podem ser alterados.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou agendamento em status final.' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.update(id, dto);
    return plainToInstance(ScheduleResponseDto, schedule);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Atualizar status do agendamento',
    description:
      'Aceita apenas CONFIRMED e CANCELLED. COMPLETED não é aceito via API — ocorre internamente ao criar um atendimento na Etapa 3.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida.' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleStatusDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.updateStatus(id, dto);
    return plainToInstance(ScheduleResponseDto, schedule);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir agendamento',
    description: 'Agendamentos com status COMPLETED não podem ser excluídos.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Agendamento excluído.' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  @ApiResponse({ status: 409, description: 'Agendamento COMPLETED não pode ser excluído.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.schedulesService.remove(id);
  }
}
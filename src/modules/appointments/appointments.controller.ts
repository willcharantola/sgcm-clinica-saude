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

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FindAppointmentsQueryDto } from './dto/find-appointments-query.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorators';
import { UserPayload } from '../../common/types/user-payload.type';
import { ApiAuthResponses } from '../../common/decorators/api-auth-responses.decorator';

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar atendimento a partir de um agendamento CONFIRMED' })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Agendamento não está CONFIRMED.' })
  @ApiResponse({ status: 409, description: 'Já existe atendimento para este agendamento.' })
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.create(dto, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar atendimentos (Admin apenas)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de atendimentos.' })
  async findAll(@Query() query: FindAppointmentsQueryDto) {
    const result = await this.appointmentsService.findAll(query);
    return {
      data: result.data.map((a) => plainToInstance(AppointmentResponseDto, a)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Buscar atendimento por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.findOne(id, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment);
  }

  @Put(':id')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Atualizar atendimento (apenas IN_PROGRESS)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.update(id, dto, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment);
  }

  @Patch(':id/finish')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Finalizar atendimento (IN_PROGRESS → FINISHED)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.' })
  async finish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.finish(id, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Atendimentos não podem ser excluídos — sempre retorna 405' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 405, description: 'Method Not Allowed.' })
  remove() {
    this.appointmentsService.remove();
  }
}

// ─── Sub-controller: GET /doctors/:id/appointments ───────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Doctors')
@Controller('doctors')
export class DoctorAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':id/appointments')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Listar atendimentos de um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de atendimentos.' })
  async findByDoctor(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.appointmentsService.findByDoctor(doctorId, query, currentUser);
    return {
      data: result.data.map((a) => plainToInstance(AppointmentResponseDto, a)),
      meta: result.meta,
    };
  }
}

// ─── Sub-controller: GET /patients/:id/appointments ──────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Patients')
@Controller('patients')
export class PatientAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':id/appointments')
  @Roles('ADMIN', 'PATIENT')
  @ApiOperation({ summary: 'Listar atendimentos de um paciente' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de atendimentos.' })
  async findByPatient(
    @Param('id', ParseIntPipe) patientId: number,
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.appointmentsService.findByPatient(patientId, query, currentUser);
    return {
      data: result.data.map((a) => plainToInstance(AppointmentResponseDto, a)),
      meta: result.meta,
    };
  }
}

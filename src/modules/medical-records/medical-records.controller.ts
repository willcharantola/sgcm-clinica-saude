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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { FindMedicalRecordsQueryDto } from './dto/find-medical-records-query.dto';
import { MedicalRecordResponseDto } from './dto/medical-record-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorators';
import { UserPayload } from '../../common/types/user-payload.type';
import { ApiAuthResponses } from '../../common/decorators/api-auth-responses.decorator';

// ─── Rotas aninhadas: /appointments/:id/records ───────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Medical Records')
@Controller('appointments')
export class AppointmentRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post(':id/records')
  @Roles('ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar prontuário para atendimento FINISHED' })
  @ApiParam({ name: 'id', description: 'ID do atendimento', example: 1 })
  @ApiResponse({ status: 201, type: MedicalRecordResponseDto })
  @ApiResponse({ status: 409, description: 'Atendimento não FINISHED ou prontuário já existe.' })
  async create(
    @Param('id', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const record = await this.medicalRecordsService.create(appointmentId, dto, currentUser);
    return plainToInstance(MedicalRecordResponseDto, record);
  }

  @Get(':id/records')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Buscar prontuário de um atendimento' })
  @ApiParam({ name: 'id', description: 'ID do atendimento', example: 1 })
  @ApiResponse({ status: 200, type: MedicalRecordResponseDto })
  @ApiResponse({ status: 404, description: 'Prontuário não encontrado.' })
  async findByAppointment(
    @Param('id', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const record = await this.medicalRecordsService.findByAppointment(
      appointmentId,
      currentUser,
    );
    return plainToInstance(MedicalRecordResponseDto, record);
  }
}

// ─── Rotas diretas: /records/:id ──────────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Medical Records')
@Controller('records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Put(':id')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Atualizar prontuário' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: MedicalRecordResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const record = await this.medicalRecordsService.update(id, dto, currentUser);
    return plainToInstance(MedicalRecordResponseDto, record);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Prontuários não podem ser excluídos — sempre retorna 405' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 405, description: 'Method Not Allowed.' })
  remove() {
    this.medicalRecordsService.remove();
  }
}

// ─── GET /patients/:id/records ────────────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Patients')
@Controller('patients')
export class PatientRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get(':id/records')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Listar prontuários de um paciente' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiResponse({ status: 200, description: 'Lista paginada de prontuários.' })
  async findByPatient(
    @Param('id', ParseIntPipe) patientId: number,
    @Query() query: FindMedicalRecordsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByPatient(
      patientId,
      query,
      currentUser,
    );
    return {
      data: result.data.map((r) => plainToInstance(MedicalRecordResponseDto, r)),
      meta: result.meta,
    };
  }
}

// ─── GET /doctors/:id/records ────────────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Doctors')
@Controller('doctors')
export class DoctorRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get(':id/records')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Listar prontuários dos atendimentos de um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de prontuários.' })
  async findByDoctor(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: FindMedicalRecordsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByDoctor(
      doctorId,
      query,
      currentUser,
    );
    return {
      data: result.data.map((r) => plainToInstance(MedicalRecordResponseDto, r)),
      meta: result.meta,
    };
  }
}

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import type { Response } from 'express';
import { Body } from '@nestjs/common';

import { ReportsService } from './reports.service';
import { RevokeReportDto } from './dto/revoke-report.dto';
import { FindReportsQueryDto } from './dto/find-reports-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorators';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { ApiAuthResponses } from '../../common/decorators/api-auth-responses.decorator';

// ─── POST /appointments/:id/report ───────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Reports')
@Controller('appointments')
export class AppointmentReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':id/report')
  @Roles('ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emitir laudo para um exame FINISHED com resultado preenchido' })
  @ApiParam({ name: 'id', description: 'ID do atendimento (Exam)', example: 1 })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  @ApiResponse({ status: 400, description: 'Não é um Exam, não está FINISHED ou sem resultado.' })
  @ApiResponse({ status: 409, description: 'Já existe um laudo ACTIVE para este exame.' })
  async create(
    @Param('id', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const report = await this.reportsService.create(appointmentId, currentUser);
    return plainToInstance(ReportResponseDto, report);
  }
}

// ─── Rotas diretas: /reports/* ────────────────────────────────────────────────
// IMPORTANTE: validate/:code deve ser declarado ANTES de :id/pdf

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Rota pública — sem @ApiBearerAuth
  @Get('validate/:code')
  @Public()
  @ApiOperation({ summary: 'Validar laudo pelo código de validação (público)' })
  @ApiParam({ name: 'code', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, type: ReportResponseDto })
  @ApiResponse({ status: 404, description: 'Laudo não encontrado.' })
  async validateByCode(@Param('code') code: string) {
    const report = await this.reportsService.validateByCode(code);
    return plainToInstance(ReportResponseDto, report);
  }

  // Download de PDF — declarado APÓS validate/:code para evitar conflito de rota
  @Get(':id/pdf')
  @ApiBearerAuth('access-token')
  @ApiAuthResponses()
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @SkipTransform()
  @ApiOperation({ summary: 'Baixar laudo em PDF' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Arquivo PDF do laudo.' })
  async getPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @CurrentUser() currentUser: UserPayload,
  ): Promise<void> {
    const { buffer, validationCode } = await this.reportsService.generatePdf(id, currentUser);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laudo-${validationCode}.pdf"`,
    });
    res.send(buffer);
  }

  @Patch(':id/revoke')
  @ApiBearerAuth('access-token')
  @ApiAuthResponses()
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Revogar laudo (ACTIVE → REVOKED, irreversível)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: ReportResponseDto })
  @ApiResponse({ status: 409, description: 'Laudo já revogado.' })
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevokeReportDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const report = await this.reportsService.revoke(id, dto, currentUser);
    return plainToInstance(ReportResponseDto, report);
  }
}

// ─── GET /patients/:id/reports ────────────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Patients')
@Controller('patients')
export class PatientReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id/reports')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Listar laudos de um paciente' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiResponse({ status: 200, description: 'Lista paginada de laudos.' })
  async findByPatient(
    @Param('id', ParseIntPipe) patientId: number,
    @Query() query: FindReportsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findByPatient(patientId, query, currentUser);
    return {
      data: result.data.map((r) => plainToInstance(ReportResponseDto, r)),
      meta: result.meta,
    };
  }
}

// ─── GET /doctors/:id/reports ────────────────────────────────────────────────

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Doctors')
@Controller('doctors')
export class DoctorReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id/reports')
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Listar laudos emitidos pelos atendimentos de um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de laudos.' })
  async findByDoctor(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: FindReportsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findByDoctor(doctorId, query, currentUser);
    return {
      data: result.data.map((r) => plainToInstance(ReportResponseDto, r)),
      meta: result.meta,
    };
  }
}

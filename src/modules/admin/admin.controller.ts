import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { AppointmentReportQueryDto } from './dto/appointment-report-query.dto';
import { ScheduleReportResponseDto } from './dto/schedule-report-response.dto';
import { AppointmentReportResponseDto } from './dto/appointment-report-response.dto';
import { ProcedureReportResponseDto } from './dto/procedure-report-response.dto';
import { OccupationReportResponseDto } from './dto/occupation-report-response.dto';
import { Roles } from '../../common/decorators/roles.decorators';
import { ApiAuthResponses } from '../../common/decorators/api-auth-responses.decorator';

@ApiBearerAuth('access-token')
@ApiAuthResponses()
@ApiTags('Admin Reports')
@Roles('ADMIN')
@Controller('admin/reports')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('schedules')
  @ApiOperation({ summary: 'Relatório de agendamentos por status e tipo' })
  @ApiResponse({ status: 200, type: ScheduleReportResponseDto })
  async getScheduleReport(
    @Query() query: DateRangeQueryDto,
  ): Promise<ScheduleReportResponseDto> {
    return this.adminService.getScheduleReport(query);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Relatório de atendimentos por tipo e status' })
  @ApiResponse({ status: 200, type: AppointmentReportResponseDto })
  async getAppointmentReport(
    @Query() query: AppointmentReportQueryDto,
  ): Promise<AppointmentReportResponseDto> {
    return this.adminService.getAppointmentReport(query);
  }

  @Get('procedures')
  @ApiOperation({ summary: 'Relatório de procedimentos por tipo e nível de autorização' })
  @ApiResponse({ status: 200, type: ProcedureReportResponseDto })
  async getProcedureReport(
    @Query() query: DateRangeQueryDto,
  ): Promise<ProcedureReportResponseDto> {
    return this.adminService.getProcedureReport(query);
  }

  @Get('doctors/:id/occupation')
  @ApiOperation({
    summary: 'Relatório de ocupação de um médico',
    description:
      'Retorna o total de agendamentos e a taxa de ocupação no período.\n\n' +
      '**Fórmula da taxa de ocupação:**\n' +
      '```\n(CONFIRMED + COMPLETED) / total × 100\n```\n' +
      'Retorna `0` quando não há agendamentos no período.',
  })
  @ApiParam({ name: 'id', description: 'ID do médico', example: 1 })
  @ApiResponse({ status: 200, type: OccupationReportResponseDto })
  async getOccupationReport(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: DateRangeQueryDto,
  ): Promise<OccupationReportResponseDto> {
    return this.adminService.getOccupationReport(doctorId, query);
  }
}

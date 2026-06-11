import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Schedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Procedure, ProcedureType } from '../procedures/entities/procedure.entity';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { AppointmentReportQueryDto } from './dto/appointment-report-query.dto';
import { ScheduleReportResponseDto } from './dto/schedule-report-response.dto';
import { AppointmentReportResponseDto } from './dto/appointment-report-response.dto';
import { ProcedureReportResponseDto } from './dto/procedure-report-response.dto';
import { OccupationReportResponseDto } from './dto/occupation-report-response.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─── relatório de agendamentos ────────────────────────────────────────────

  async getScheduleReport(query: DateRangeQueryDto): Promise<ScheduleReportResponseDto> {
    this.assertValidDateRange(query);

    const scheduleRepo = this.dataSource.getRepository(Schedule);

    const byStatusRaw = await scheduleRepo
      .createQueryBuilder('s')
      .select('s.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .where(this.dateCondition('s.scheduledAt', query))
      .groupBy('s.status')
      .getRawMany();

    const byTypeRaw = await scheduleRepo
      .createQueryBuilder('s')
      .select('s.type', 'key')
      .addSelect('COUNT(*)', 'count')
      .where(this.dateCondition('s.scheduledAt', query))
      .groupBy('s.type')
      .getRawMany();

    const totalRaw = await scheduleRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'total')
      .where(this.dateCondition('s.scheduledAt', query))
      .getRawOne();

    return {
      byStatus: this.toCountList(byStatusRaw),
      byType: this.toCountList(byTypeRaw),
      total: Number(totalRaw?.total ?? 0),
    };
  }

  // ─── relatório de atendimentos ────────────────────────────────────────────

  async getAppointmentReport(
    query: AppointmentReportQueryDto,
  ): Promise<AppointmentReportResponseDto> {
    this.assertValidDateRange(query);

    const apptRepo = this.dataSource.getRepository(Appointment);

    const base = (alias: string) => {
      const qb = apptRepo
        .createQueryBuilder(alias)
        .where(this.dateCondition(`${alias}.createdAt`, query));
      if (query.doctorId) {
        qb.andWhere(`${alias}.doctorId = :doctorId`, { doctorId: query.doctorId });
      }
      return qb;
    };

    const byTypeRaw = await base('a')
      .select('a.type', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.type')
      .getRawMany();

    const byStatusRaw = await base('a')
      .select('a.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    return {
      byType: this.toCountList(byTypeRaw),
      byStatus: this.toCountList(byStatusRaw),
    };
  }

  // ─── relatório de procedimentos ───────────────────────────────────────────

  async getProcedureReport(query: DateRangeQueryDto): Promise<ProcedureReportResponseDto> {
    this.assertValidDateRange(query);

    const procRepo = this.dataSource.getRepository(Procedure);

    const byTypeRaw = await procRepo
      .createQueryBuilder('p')
      .select('p.type', 'key')
      .addSelect('COUNT(*)', 'count')
      .where(this.dateCondition('p.createdAt', query))
      .groupBy('p.type')
      .getRawMany();

    const byAuthRaw = await procRepo
      .createQueryBuilder('p')
      .select('p.authorizationStatus', 'key')
      .addSelect('COUNT(*)', 'count')
      .where(`p.type = :type`, { type: ProcedureType.SPECIALIZED })
      .andWhere(this.dateCondition('p.createdAt', query))
      .groupBy('p.authorizationStatus')
      .getRawMany();

    const byComplexityRaw = await procRepo
      .createQueryBuilder('p')
      .select('p.complexityLevel', 'key')
      .addSelect('COUNT(*)', 'count')
      .where(`p.type = :type`, { type: ProcedureType.SPECIALIZED })
      .andWhere(this.dateCondition('p.createdAt', query))
      .groupBy('p.complexityLevel')
      .getRawMany();

    return {
      byType: this.toCountList(byTypeRaw),
      specializedByAuthorizationStatus: this.toCountList(byAuthRaw),
      specializedByComplexityLevel: this.toCountList(byComplexityRaw),
    };
  }

  // ─── relatório de ocupação de médico ─────────────────────────────────────

  async getOccupationReport(
    doctorId: number,
    query: DateRangeQueryDto,
  ): Promise<OccupationReportResponseDto> {
    this.assertValidDateRange(query);

    const scheduleRepo = this.dataSource.getRepository(Schedule);

    const byStatusRaw = await scheduleRepo
      .createQueryBuilder('s')
      .select('s.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('s.doctorId = :doctorId', { doctorId })
      .andWhere(this.dateCondition('s.scheduledAt', query))
      .groupBy('s.status')
      .getRawMany();

    const byStatus = this.toCountList(byStatusRaw);
    const totalSchedules = byStatus.reduce((sum, r) => sum + r.count, 0);

    const confirmedCount =
      (byStatus.find((r) => r.key === ScheduleStatus.CONFIRMED)?.count ?? 0) +
      (byStatus.find((r) => r.key === ScheduleStatus.COMPLETED)?.count ?? 0);

    const occupationRate =
      totalSchedules > 0
        ? Math.round((confirmedCount / totalSchedules) * 10000) / 100
        : 0;

    return { doctorId, totalSchedules, byStatus, occupationRate };
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private assertValidDateRange(query: DateRangeQueryDto): void {
    if (
      query.startDate &&
      query.endDate &&
      new Date(query.startDate) > new Date(query.endDate)
    ) {
      throw new BadRequestException('startDate não pode ser posterior a endDate.');
    }
  }

  private dateCondition(
    column: string,
    { startDate, endDate }: DateRangeQueryDto,
  ): string {
    if (startDate && endDate) {
      return `${column} BETWEEN '${startDate}' AND '${endDate}'`;
    }
    if (startDate) return `${column} >= '${startDate}'`;
    if (endDate) return `${column} <= '${endDate}'`;
    return '1=1';
  }

  private toCountList(rows: { key: string; count: string | number }[]) {
    return rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  }
}

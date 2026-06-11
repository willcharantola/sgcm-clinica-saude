import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Report, ReportStatus } from './entities/report.entity';
import { PdfService } from './pdf.service';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { RevokeReportDto } from './dto/revoke-report.dto';
import { FindReportsQueryDto } from './dto/find-reports-query.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus, AppointmentType } from '../appointments/entities/appointment.entity';
import { Exam } from '../appointments/entities/exam.entity';
import { UsersService } from '../users/users.service';
import { Doctor } from '../users/entities/doctor.entity';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,

    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
    private readonly pdfService: PdfService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─── emitir laudo ────────────────────────────────────────────────────────

  async create(appointmentId: number, currentUser: UserPayload): Promise<Report> {
    const appointment = await this.appointmentsService.findOne(appointmentId, currentUser);

    if (appointment.type !== AppointmentType.EXAM) {
      throw new BadRequestException('Laudos só podem ser emitidos para atendimentos do tipo EXAM.');
    }

    if (appointment.status !== AppointmentStatus.FINISHED) {
      throw new BadRequestException(
        `Laudos só podem ser emitidos para atendimentos FINISHED. Status atual: ${appointment.status}.`,
      );
    }

    const exam = appointment as Exam;
    if (!exam.result) {
      throw new BadRequestException(
        'O exame deve ter resultado preenchido antes de emitir um laudo.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const existingActive = await manager.findOneBy(Report, {
        appointmentId,
        status: ReportStatus.ACTIVE,
      });
      if (existingActive) {
        throw new ConflictException(
          `Já existe um laudo ACTIVE para o exame com id ${appointmentId}.`,
        );
      }

      const validationCode = randomUUID();
      const content = this.buildContent({
        examType: exam.examType,
        result: exam.result,
        validationCode,
      });

      const report = manager.create(Report, {
        validationCode,
        content,
        status: ReportStatus.ACTIVE,
        appointmentId,
        issuedById: currentUser.sub,
      });

      return manager.save(Report, report);
    });
  }

  // ─── validar por código (público) ────────────────────────────────────────

  async validateByCode(code: string): Promise<Report> {
    const report = await this.reportRepository.findOneBy({ validationCode: code });
    if (!report) {
      throw new NotFoundException(`Nenhum laudo encontrado com o código de validação informado.`);
    }
    return report;
  }

  // ─── buscar por id ────────────────────────────────────────────────────────

  async findOne(id: number, currentUser?: UserPayload): Promise<Report> {
    const report = await this.reportRepository.findOneBy({ id });
    if (!report) {
      throw new NotFoundException(`Laudo com id ${id} não foi encontrado.`);
    }

    if (currentUser) {
      await this.appointmentsService.findOne(report.appointmentId, currentUser);
    }

    return report;
  }

  // ─── gerar PDF ────────────────────────────────────────────────────────────

  async generatePdf(
    id: number,
    currentUser: UserPayload,
  ): Promise<{ buffer: Buffer; validationCode: string }> {
    const report = await this.findOne(id, currentUser);
    const appointment = await this.appointmentsService.findOneOrFail(report.appointmentId);
    const exam = appointment as Exam;

    const doctor = (await this.usersService.findDoctor(appointment.doctorId)) as unknown as Doctor;
    const patient = await this.usersService.findOneOrFail(appointment.patientId);

    const dto: GeneratePdfDto = {
      patientName: patient.name,
      doctorName: doctor.name,
      doctorCrm: doctor.crm,
      examType: exam.examType,
      result: exam.result ?? '',
      examDate: appointment.startedAt ?? appointment.createdAt,
      issuedAt: report.issuedAt,
      validationCode: report.validationCode,
    };

    const buffer = await this.pdfService.generate(dto);
    return { buffer, validationCode: report.validationCode };
  }

  // ─── revogar laudo ────────────────────────────────────────────────────────

  async revoke(id: number, dto: RevokeReportDto, currentUser: UserPayload): Promise<Report> {
    const report = await this.findOne(id, currentUser);

    if (report.status === ReportStatus.REVOKED) {
      throw new ConflictException('Este laudo já foi revogado. A transição REVOKED → ACTIVE não é permitida.');
    }

    report.status = ReportStatus.REVOKED;
    report.revokedAt = new Date();
    report.revokedById = currentUser.sub;
    report.revokedReason = dto.revokedReason;

    return this.reportRepository.save(report);
  }

  // ─── listar por paciente ──────────────────────────────────────────────────

  async findByPatient(
    patientId: number,
    query: FindReportsQueryDto,
    currentUser: UserPayload,
  ) {
    if (currentUser.type === 'PATIENT' && currentUser.sub !== patientId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar laudos de outro paciente.',
      );
    }

    const { page = 1, limit = 20, sort } = query;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .innerJoin('appointments', 'appointment', 'appointment.id = report.appointmentId')
      .where('appointment.patientId = :patientId', { patientId });

    if (currentUser.type === 'DOCTOR') {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: currentUser.sub });
    }

    const [sortField, sortDir] = this.parseSortParam(sort, 'report.issuedAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return { data, meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) } };
  }

  // ─── listar por médico ────────────────────────────────────────────────────

  async findByDoctor(
    doctorId: number,
    query: FindReportsQueryDto,
    currentUser: UserPayload,
  ) {
    if (currentUser.type === 'DOCTOR' && currentUser.sub !== doctorId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar laudos de outro médico.',
      );
    }

    const { page = 1, limit = 20, sort } = query;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .innerJoin('appointments', 'appointment', 'appointment.id = report.appointmentId')
      .where('appointment.doctorId = :doctorId', { doctorId });

    const [sortField, sortDir] = this.parseSortParam(sort, 'report.issuedAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return { data, meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) } };
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private buildContent(data: {
    examType: string;
    result: string;
    validationCode: string;
  }): string {
    return [
      'LAUDO DE EXAME MÉDICO',
      `Tipo de Exame: ${data.examType}`,
      `Resultado: ${data.result}`,
      `Código de Validação: ${data.validationCode}`,
    ].join('\n');
  }

  private parseSortParam(
    sort: string | undefined,
    defaultField: string,
  ): [string, 'ASC' | 'DESC'] {
    if (!sort) return [defaultField, 'ASC'];
    const [field, dir] = sort.split(':');
    return [
      `report.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}

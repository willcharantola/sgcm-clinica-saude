import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Appointment, AppointmentStatus, AppointmentType } from './entities/appointment.entity';
import { Consultation } from './entities/consultation.entity';
import { Exam } from './entities/exam.entity';
import { FollowUp } from './entities/follow-up.entity';
import { Schedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FindAppointmentsQueryDto } from './dto/find-appointments-query.dto';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,

    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(FollowUp)
    private readonly followUpRepository: Repository<FollowUp>,

    private readonly schedulesService: SchedulesService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─── criar ────────────────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto, currentUser: UserPayload): Promise<Appointment> {
    const schedule = await this.schedulesService.findOneOrFail(dto.scheduleId);

    if (schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException(
        `Apenas agendamentos CONFIRMED podem gerar atendimentos. Status atual: ${schedule.status}.`,
      );
    }

    const existing = await this.appointmentRepository.findOneBy({ scheduleId: dto.scheduleId });
    if (existing) {
      throw new ConflictException(
        `Já existe um atendimento para o agendamento com id ${dto.scheduleId}.`,
      );
    }

    if (dto.type === AppointmentType.FOLLOW_UP) {
      await this.ensureFollowUpIsValid(dto.originAppointmentId!, schedule.patientId);
    }

    return this.dataSource.transaction(async (manager) => {
      const base = {
        scheduleId: dto.scheduleId,
        doctorId: schedule.doctorId,
        patientId: schedule.patientId,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        notes: dto.notes,
        status: AppointmentStatus.IN_PROGRESS,
      };

      let appointment: Appointment;

      if (dto.type === AppointmentType.CONSULTATION) {
        const entity = manager.create(Consultation, {
          ...base,
          reason: dto.reason!,
          diagnosticHypothesis: dto.diagnosticHypothesis,
        });
        appointment = await manager.save(Consultation, entity);
      } else if (dto.type === AppointmentType.EXAM) {
        const entity = manager.create(Exam, {
          ...base,
          examType: dto.examType!,
          result: dto.result,
        });
        appointment = await manager.save(Exam, entity);
      } else {
        const entity = manager.create(FollowUp, {
          ...base,
          originAppointmentId: dto.originAppointmentId!,
          clinicalEvolution: dto.clinicalEvolution,
        });
        appointment = await manager.save(FollowUp, entity);
      }

      await manager.update(Schedule, { id: dto.scheduleId }, { status: ScheduleStatus.COMPLETED });

      return appointment;
    });
  }

  // ─── listar ───────────────────────────────────────────────────────────────

  async findAll(query: FindAppointmentsQueryDto) {
    const {
      page = 1, limit = 20, sort,
      doctorId, patientId, type, status, startDate, endDate,
    } = query;

    const qb = this.appointmentRepository.createQueryBuilder('appointment');

    if (doctorId) qb.andWhere('appointment.doctorId = :doctorId', { doctorId });
    if (patientId) qb.andWhere('appointment.patientId = :patientId', { patientId });
    if (type) qb.andWhere('appointment.type = :type', { type });
    if (status) qb.andWhere('appointment.status = :status', { status });
    if (startDate) qb.andWhere('appointment.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('appointment.createdAt <= :endDate', { endDate });

    const [sortField, sortDir] = this.parseSortParam(sort, 'appointment.createdAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // ─── buscar por id ────────────────────────────────────────────────────────

  async findOne(id: number, currentUser?: UserPayload): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOneBy({ id });
    if (!appointment) {
      throw new NotFoundException(`Atendimento com id ${id} não foi encontrado.`);
    }

    if (currentUser) {
      if (currentUser.type === 'DOCTOR' && appointment.doctorId !== currentUser.sub) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este atendimento.',
        );
      }
      if (currentUser.type === 'PATIENT' && appointment.patientId !== currentUser.sub) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este atendimento.',
        );
      }
    }

    return appointment;
  }

  // exposto para uso interno (ProceduresModule, MedicalRecordsModule, ReportsModule)
  async findOneOrFail(id: number): Promise<Appointment> {
    return this.findOne(id);
  }

  // ─── atualizar ────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateAppointmentDto, currentUser: UserPayload): Promise<Appointment> {
    const appointment = await this.findOne(id, currentUser);

    this.ensureAppointmentIsInProgress(appointment);

    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    Object.assign(appointment, updateData);

    return this.appointmentRepository.save(appointment);
  }

  // ─── finalizar ────────────────────────────────────────────────────────────

  async finish(id: number, currentUser: UserPayload): Promise<Appointment> {
    const appointment = await this.findOne(id, currentUser);

    this.ensureAppointmentIsInProgress(appointment);

    appointment.status = AppointmentStatus.FINISHED;
    if (!appointment.endedAt) {
      appointment.endedAt = new Date();
    }

    return this.appointmentRepository.save(appointment);
  }

  // ─── remover (sempre 405) ────────────────────────────────────────────────

  remove(): never {
    throw new MethodNotAllowedException('Atendimentos não podem ser excluídos.');
  }

  // ─── listar por médico ────────────────────────────────────────────────────

  async findByDoctor(doctorId: number, query: FindAppointmentsQueryDto, currentUser: UserPayload) {
    if (currentUser.type === 'DOCTOR' && currentUser.sub !== doctorId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar atendimentos de outro médico.',
      );
    }
    return this.findAll({ ...query, doctorId });
  }

  // ─── listar por paciente ──────────────────────────────────────────────────

  async findByPatient(patientId: number, query: FindAppointmentsQueryDto, currentUser: UserPayload) {
    if (currentUser.type === 'PATIENT' && currentUser.sub !== patientId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar atendimentos de outro paciente.',
      );
    }
    return this.findAll({ ...query, patientId });
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private ensureAppointmentIsInProgress(appointment: Appointment): void {
    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Apenas atendimentos IN_PROGRESS podem ser modificados. Status atual: ${appointment.status}.`,
      );
    }
  }

  private async ensureFollowUpIsValid(originId: number, patientId: number): Promise<void> {
    const origin = await this.appointmentRepository.findOneBy({ id: originId });
    if (!origin) {
      throw new NotFoundException(
        `Atendimento de origem com id ${originId} não foi encontrado.`,
      );
    }
    if (origin.patientId !== patientId) {
      throw new BadRequestException(
        'O atendimento de origem deve pertencer ao mesmo paciente do agendamento.',
      );
    }
  }

  private parseSortParam(
    sort: string | undefined,
    defaultField: string,
  ): [string, 'ASC' | 'DESC'] {
    if (!sort) return [defaultField, 'ASC'];
    const [field, dir] = sort.split(':');
    return [
      `appointment.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}

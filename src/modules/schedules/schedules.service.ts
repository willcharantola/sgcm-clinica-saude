// src/modules/schedules/schedules.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Schedule, ScheduleStatus, ScheduleType } from './entities/schedule.entity';
import { InPersonSchedule } from './entities/in-person-schedule.entity';
import { OnlineSchedule } from './entities/online-schedule.entity';
import { HomeSchedule } from './entities/home-schedule.entity';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateScheduleStatusDto, AllowedStatusTransition } from './dto/update-schedule-status.dto';
import { FindSchedulesQueryDto } from './dto/find-schedules-query.dto';
import { ConflictException } from '@nestjs/common';

// mapa das transições permitidas via API
const ALLOWED_TRANSITIONS: Record<ScheduleStatus, ScheduleStatus[]> = {
  [ScheduleStatus.PENDING]: [ScheduleStatus.CONFIRMED, ScheduleStatus.CANCELLED],
  [ScheduleStatus.CONFIRMED]: [ScheduleStatus.CANCELLED],
  // COMPLETED e CANCELLED não têm transições via API
  [ScheduleStatus.CANCELLED]: [],
  [ScheduleStatus.COMPLETED]: [],
};

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,

    @InjectRepository(InPersonSchedule)
    private readonly inPersonRepository: Repository<InPersonSchedule>,

    @InjectRepository(OnlineSchedule)
    private readonly onlineRepository: Repository<OnlineSchedule>,

    @InjectRepository(HomeSchedule)
    private readonly homeRepository: Repository<HomeSchedule>,

    private readonly usersService: UsersService,
  ) {}

  // ─── criar ────────────────────────────────────────────────────────────────

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    // 1. valida data futura — verificado no service além do DTO
    this.assertFutureDate(dto.scheduledAt);

    // 2. valida médico
    const doctor = await this.usersService.findOneOrFail(dto.doctorId);
    if (doctor.type !== UserType.DOCTOR) {
      throw new BadRequestException(
        `O id ${dto.doctorId} não pertence a um médico.`,
      );
    }

    // 3. valida paciente
    const patient = await this.usersService.findOneOrFail(dto.patientId);
    if (patient.type !== UserType.PATIENT) {
      throw new BadRequestException(
        `O id ${dto.patientId} não pertence a um paciente.`,
      );
    }

    // 4. verifica conflito de horário — médico com CONFIRMED no mesmo horário
    await this.assertNoScheduleConflict(dto.doctorId, dto.scheduledAt);

    // 5. persiste no subtipo correto
    return this.persistSchedule(dto);
  }

  // ─── listar ───────────────────────────────────────────────────────────────

  async findAll(query: FindSchedulesQueryDto) {
    const {
      page = 1, limit = 20, sort,
      doctorId, patientId, status, type,
      dateFrom, dateTo,
    } = query;

    const qb = this.scheduleRepository.createQueryBuilder('schedule');

    if (doctorId) qb.andWhere('schedule.doctorId = :doctorId', { doctorId });
    if (patientId) qb.andWhere('schedule.patientId = :patientId', { patientId });
    if (status) qb.andWhere('schedule.status = :status', { status });
    if (type) qb.andWhere('schedule.type = :type', { type });
    if (dateFrom) qb.andWhere('schedule.scheduledAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('schedule.scheduledAt <= :dateTo', { dateTo });

    const [sortField, sortDir] = this.parseSortParam(sort, 'schedule.scheduledAt');
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

  async findOne(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOneBy({ id });
    if (!schedule) {
      throw new NotFoundException(
        `Agendamento com id ${id} não foi encontrado.`,
      );
    }
    return schedule;
  }

  // método exposto para AppointmentsModule na Etapa 3
  async findOneOrFail(id: number): Promise<Schedule> {
    return this.findOne(id);
  }

  // ─── listar por médico ────────────────────────────────────────────────────

  async findByDoctor(doctorId: number, query: FindSchedulesQueryDto) {
    await this.usersService.findOneOrFail(doctorId);
    return this.findAll({ ...query, doctorId });
  }

  // ─── listar por paciente ──────────────────────────────────────────────────

  async findByPatient(patientId: number, query: FindSchedulesQueryDto) {
    await this.usersService.findOneOrFail(patientId);
    return this.findAll({ ...query, patientId });
  }

  // ─── atualizar dados ──────────────────────────────────────────────────────

  async update(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.findOne(id);

    this.assertNotFinalStatus(schedule);

    if (dto.scheduledAt) {
      this.assertFutureDate(dto.scheduledAt);
      // revalida conflito se horário mudou
      if (dto.scheduledAt !== schedule.scheduledAt.toISOString()) {
        await this.assertNoScheduleConflict(
          schedule.doctorId,
          dto.scheduledAt,
          id, // exclui o próprio agendamento da verificação
        );
      }
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  // ─── atualizar status ─────────────────────────────────────────────────────

  async updateStatus(
    id: number,
    dto: UpdateScheduleStatusDto,
  ): Promise<Schedule> {
    const schedule = await this.findOne(id);
    const newStatus = dto.status as unknown as ScheduleStatus;

    // verifica se a transição é permitida
    const allowed = ALLOWED_TRANSITIONS[schedule.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de status inválida: ${schedule.status} → ${newStatus}. ` +
        `Transições permitidas a partir de ${schedule.status}: ${allowed.join(', ') || 'nenhuma'}.`,
      );
    }

    // confirmação: verifica conflito de horário no momento de confirmar
    if (newStatus === ScheduleStatus.CONFIRMED) {
      await this.assertNoScheduleConflict(
        schedule.doctorId,
        schedule.scheduledAt.toISOString(),
        id,
      );
    }

    // cancelamento: preenche campos automaticamente
    if (newStatus === ScheduleStatus.CANCELLED) {
      if (!dto.cancellationReason) {
        throw new BadRequestException(
          'O motivo do cancelamento é obrigatório ao cancelar um agendamento.',
        );
      }
      schedule.cancelledAt = new Date();
      schedule.cancellationReason = dto.cancellationReason;
      // cancelledBy será preenchido na Etapa 2 com o usuário autenticado
    }

    schedule.status = newStatus;
    return this.scheduleRepository.save(schedule);
  }

  // ─── método interno para Etapa 3 (AppointmentsService) ───────────────────
  // Não exposto como endpoint — chamado internamente ao criar um Appointment

  async complete(id: number): Promise<Schedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException(
        `Apenas agendamentos CONFIRMED podem ser concluídos. Status atual: ${schedule.status}.`,
      );
    }

    schedule.status = ScheduleStatus.COMPLETED;
    return this.scheduleRepository.save(schedule);
  }

  // ─── remover ──────────────────────────────────────────────────────────────

  async remove(id: number): Promise<void> {
    const schedule = await this.findOne(id);

    // agendamento COMPLETED originou atendimento — não pode ser removido
    if (schedule.status === ScheduleStatus.COMPLETED) {
      throw new ConflictException(
        `Agendamentos com status COMPLETED não podem ser excluídos pois originaram um atendimento clínico.`,
      );
    }

    await this.scheduleRepository.remove(schedule);
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private assertFutureDate(dateStr: string): void {
    if (new Date(dateStr) <= new Date()) {
      throw new BadRequestException(
        'A data do agendamento deve ser uma data futura.',
      );
    }
  }

  private assertNotFinalStatus(schedule: Schedule): void {
    const finals = [ScheduleStatus.CANCELLED, ScheduleStatus.COMPLETED];
    if (finals.includes(schedule.status)) {
      throw new BadRequestException(
        `Agendamentos com status ${schedule.status} não podem ser alterados.`,
      );
    }
  }

  private async assertNoScheduleConflict(
    doctorId: number,
    scheduledAt: string,
    excludeId?: number,
  ): Promise<void> {
    // conflito: mesmo médico, mesmo horário exato, status CONFIRMED
    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.doctorId = :doctorId', { doctorId })
      .andWhere('schedule.scheduledAt = :scheduledAt', { scheduledAt })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.CONFIRMED });

    // exclui o próprio agendamento ao atualizar
    if (excludeId) {
      qb.andWhere('schedule.id != :excludeId', { excludeId });
    }

    const conflict = await qb.getOne();
    if (conflict) {
      throw new ConflictException(
        `O médico com id ${doctorId} já possui um agendamento confirmado para ${new Date(scheduledAt).toLocaleString('pt-BR')}.`,
      );
    }
  }

  private async persistSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    const base = {
      scheduledAt: new Date(dto.scheduledAt),
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      status: ScheduleStatus.PENDING,
    };

    if (dto.type === ScheduleType.IN_PERSON) {
      const s = this.inPersonRepository.create({
        ...base,
        room: dto.room!,
        unit: dto.unit!,
      });
      return this.inPersonRepository.save(s);
    }

    if (dto.type === ScheduleType.ONLINE) {
      const s = this.onlineRepository.create({
        ...base,
        accessLink: dto.accessLink!,
        platform: dto.platform!,
      });
      return this.onlineRepository.save(s);
    }

    // HOME
    const s = this.homeRepository.create({
      ...base,
      fullAddress: dto.fullAddress!,
      accessNotes: dto.accessNotes,
    });
    return this.homeRepository.save(s);
  }

  private parseSortParam(
    sort: string | undefined,
    defaultField: string,
  ): [string, 'ASC' | 'DESC'] {
    if (!sort) return [defaultField, 'ASC'];
    const [field, dir] = sort.split(':');
    return [
      `schedule.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}
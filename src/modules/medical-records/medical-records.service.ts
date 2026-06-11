import {
  ConflictException,
  ForbiddenException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { FindMedicalRecordsQueryDto } from './dto/find-medical-records-query.dto';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordRepository: Repository<MedicalRecord>,

    private readonly appointmentsService: AppointmentsService,
  ) {}

  // ─── criar ────────────────────────────────────────────────────────────────

  async create(
    appointmentId: number,
    dto: CreateMedicalRecordDto,
    currentUser: UserPayload,
  ): Promise<MedicalRecord> {
    const appointment = await this.appointmentsService.findOne(appointmentId, currentUser);

    this.ensureAppointmentIsFinished(appointment);

    const existing = await this.recordRepository.findOneBy({ appointmentId });
    if (existing) {
      throw new ConflictException(
        `Já existe um prontuário para o atendimento com id ${appointmentId}.`,
      );
    }

    const record = this.recordRepository.create({
      ...dto,
      appointmentId,
    });

    return this.recordRepository.save(record);
  }

  // ─── buscar por atendimento ───────────────────────────────────────────────

  async findByAppointment(
    appointmentId: number,
    currentUser: UserPayload,
  ): Promise<MedicalRecord> {
    await this.appointmentsService.findOne(appointmentId, currentUser);

    const record = await this.recordRepository.findOneBy({ appointmentId });
    if (!record) {
      throw new NotFoundException(
        `Nenhum prontuário encontrado para o atendimento com id ${appointmentId}.`,
      );
    }

    return record;
  }

  // ─── buscar por id ────────────────────────────────────────────────────────

  async findOne(id: number, currentUser?: UserPayload): Promise<MedicalRecord> {
    const record = await this.recordRepository.findOneBy({ id });
    if (!record) {
      throw new NotFoundException(`Prontuário com id ${id} não foi encontrado.`);
    }

    if (currentUser) {
      await this.appointmentsService.findOne(record.appointmentId, currentUser);
    }

    return record;
  }

  // ─── atualizar ────────────────────────────────────────────────────────────

  async update(
    id: number,
    dto: UpdateMedicalRecordDto,
    currentUser: UserPayload,
  ): Promise<MedicalRecord> {
    const record = await this.findOne(id, currentUser);

    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    Object.assign(record, updateData);
    record.lastUpdatedById = currentUser.sub;

    return this.recordRepository.save(record);
  }

  // ─── remover (sempre 405) ────────────────────────────────────────────────

  remove(): never {
    throw new MethodNotAllowedException('Prontuários não podem ser excluídos.');
  }

  // ─── listar por paciente ──────────────────────────────────────────────────

  async findByPatient(
    patientId: number,
    query: FindMedicalRecordsQueryDto,
    currentUser: UserPayload,
  ) {
    if (currentUser.type === 'PATIENT' && currentUser.sub !== patientId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar prontuários de outro paciente.',
      );
    }

    const { page = 1, limit = 20, sort } = query;

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .innerJoin('appointments', 'appointment', 'appointment.id = record.appointmentId')
      .where('appointment.patientId = :patientId', { patientId });

    if (currentUser.type === 'DOCTOR') {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: currentUser.sub });
    }

    const [sortField, sortDir] = this.parseSortParam(sort, 'record.createdAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  // ─── listar por médico ────────────────────────────────────────────────────

  async findByDoctor(
    doctorId: number,
    query: FindMedicalRecordsQueryDto,
    currentUser: UserPayload,
  ) {
    if (currentUser.type === 'DOCTOR' && currentUser.sub !== doctorId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar prontuários de outro médico.',
      );
    }

    const { page = 1, limit = 20, sort } = query;

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .innerJoin('appointments', 'appointment', 'appointment.id = record.appointmentId')
      .where('appointment.doctorId = :doctorId', { doctorId });

    const [sortField, sortDir] = this.parseSortParam(sort, 'record.createdAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private ensureAppointmentIsFinished(appointment: { status: AppointmentStatus }): void {
    if (appointment.status !== AppointmentStatus.FINISHED) {
      throw new ConflictException(
        `Prontuários só podem ser criados para atendimentos FINISHED. Status atual: ${appointment.status}.`,
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
      `record.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}

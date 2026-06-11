import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AuthorizationStatus,
  ComplexityLevel,
  Procedure,
  ProcedureType,
} from './entities/procedure.entity';
import { SimpleProcedure } from './entities/simple-procedure.entity';
import { SpecializedProcedure } from './entities/specialized-procedure.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { AuthorizeAction, AuthorizeProcedureDto } from './dto/authorize-procedure.dto';
import { FindProceduresQueryDto } from './dto/find-procedures-query.dto';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class ProceduresService {
  constructor(
    @InjectRepository(Procedure)
    private readonly procedureRepository: Repository<Procedure>,

    @InjectRepository(SimpleProcedure)
    private readonly simpleProcedureRepository: Repository<SimpleProcedure>,

    @InjectRepository(SpecializedProcedure)
    private readonly specializedProcedureRepository: Repository<SpecializedProcedure>,

    private readonly appointmentsService: AppointmentsService,
  ) {}

  // ─── criar ────────────────────────────────────────────────────────────────

  async create(
    appointmentId: number,
    dto: CreateProcedureDto,
    currentUser: UserPayload,
  ): Promise<Procedure> {
    const appointment = await this.appointmentsService.findOne(appointmentId, currentUser);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Procedimentos só podem ser adicionados a atendimentos IN_PROGRESS. Status atual: ${appointment.status}.`,
      );
    }

    if (dto.type === ProcedureType.SIMPLE) {
      const entity = this.simpleProcedureRepository.create({
        name: dto.name,
        description: dto.description,
        appointmentId,
        estimatedDuration: dto.estimatedDuration,
      });
      return this.simpleProcedureRepository.save(entity);
    }

    // SPECIALIZED
    const entity = this.specializedProcedureRepository.create({
      name: dto.name,
      description: dto.description,
      appointmentId,
      requiredEquipment: dto.requiredEquipment,
      complexityLevel: dto.complexityLevel ?? ComplexityLevel.LOW,
      requiresAuthorization: dto.requiresAuthorization ?? false,
      // authorizationStatus sempre PENDING na criação — nunca recebido do cliente
      authorizationStatus: AuthorizationStatus.PENDING,
    });
    return this.specializedProcedureRepository.save(entity);
  }

  // ─── listar por atendimento ───────────────────────────────────────────────

  async findAllByAppointment(
    appointmentId: number,
    query: FindProceduresQueryDto,
    currentUser: UserPayload,
  ) {
    await this.appointmentsService.findOne(appointmentId, currentUser);

    const { page = 1, limit = 20, sort } = query;

    const qb = this.procedureRepository
      .createQueryBuilder('procedure')
      .where('procedure.appointmentId = :appointmentId', { appointmentId });

    const [sortField, sortDir] = this.parseSortParam(sort, 'procedure.createdAt');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  // ─── buscar por id ────────────────────────────────────────────────────────

  async findOne(id: number, currentUser?: UserPayload): Promise<Procedure> {
    const procedure = await this.procedureRepository.findOneBy({ id });
    if (!procedure) {
      throw new NotFoundException(`Procedimento com id ${id} não foi encontrado.`);
    }

    if (currentUser) {
      // acesso via atendimento — lança ForbiddenException se não autorizado
      await this.appointmentsService.findOne(procedure.appointmentId, currentUser);
    }

    return procedure;
  }

  // ─── atualizar ────────────────────────────────────────────────────────────

  async update(
    id: number,
    dto: UpdateProcedureDto,
    currentUser: UserPayload,
  ): Promise<Procedure> {
    const procedure = await this.findOne(id, currentUser);

    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    Object.assign(procedure, updateData);

    return this.procedureRepository.save(procedure);
  }

  // ─── autorizar / negar (Admin apenas) ────────────────────────────────────

  async authorize(
    id: number,
    dto: AuthorizeProcedureDto,
    currentUser: UserPayload,
  ): Promise<Procedure> {
    const procedure = await this.findOne(id);

    if (procedure.type !== ProcedureType.SPECIALIZED) {
      throw new BadRequestException(
        'Apenas procedimentos SPECIALIZED possuem controle de autorização.',
      );
    }

    const specialized = procedure as SpecializedProcedure;

    // DENIED → PENDING é bloqueado; como as ações disponíveis são AUTHORIZE e DENY,
    // PENDING só seria atingido por reset direto — portanto essa regra é implicitamente
    // respeitada pelo design do endpoint.

    if (dto.action === AuthorizeAction.AUTHORIZE) {
      specialized.authorizationStatus = AuthorizationStatus.AUTHORIZED;
      specialized.authorizedAt = new Date();
      specialized.authorizedById = currentUser.sub;
      specialized.denialReason = null as any;
    } else {
      specialized.authorizationStatus = AuthorizationStatus.DENIED;
      specialized.denialReason = dto.denialReason ?? null as any;
      specialized.authorizedAt = null as any;
      specialized.authorizedById = null as any;
    }

    return this.procedureRepository.save(specialized);
  }

  // ─── remover ──────────────────────────────────────────────────────────────

  async remove(id: number, currentUser: UserPayload): Promise<void> {
    const procedure = await this.findOne(id, currentUser);

    const appointment = await this.appointmentsService.findOneOrFail(procedure.appointmentId);

    if (appointment.status === AppointmentStatus.FINISHED) {
      throw new ConflictException(
        'Procedimentos de atendimentos FINISHED não podem ser excluídos.',
      );
    }

    await this.procedureRepository.remove(procedure);
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  private parseSortParam(
    sort: string | undefined,
    defaultField: string,
  ): [string, 'ASC' | 'DESC'] {
    if (!sort) return [defaultField, 'ASC'];
    const [field, dir] = sort.split(':');
    return [
      `procedure.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}

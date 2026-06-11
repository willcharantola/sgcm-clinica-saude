import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserType } from './entities/user.entity';
import { Admin } from './entities/admin.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UserPayload } from '../../common/types/user-payload.type';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  // ─── criar ────────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<User> {
    await this.assertEmailUnique(dto.email);
    this.assertProfileFields(dto);

    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    if (dto.type === UserType.DOCTOR) {
      await this.assertCrmUnique(dto.crm!);
      const doctor = this.doctorRepository.create({
        name: dto.name,
        email: dto.email,
        password: hashed,
        crm: dto.crm,
      });
      return this.doctorRepository.save(doctor);
    }

    if (dto.type === UserType.PATIENT) {
      this.assertBirthDatePast(dto.birthDate!);
      const patient = this.patientRepository.create({
        name: dto.name,
        email: dto.email,
        password: hashed,
        cpf: dto.cpf,
        birthDate: new Date(dto.birthDate!),
      });
      return this.patientRepository.save(patient);
    }

    // ADMIN
    const admin = this.adminRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
    });
    return this.adminRepository.save(admin);
  }

  // ─── listar ───────────────────────────────────────────────────────────────

  async findAll(query: FindUsersQueryDto) {
    const { page = 1, limit = 20, sort, search, type } = query;

    const qb = this.userRepository.createQueryBuilder('user');

    if (type) {
      qb.andWhere('user.type = :type', { type });
    }

    if (search) {
      qb.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.andWhere('user.isActive = :isActive', { isActive: true });

    const [sortField, sortDir] = this.parseSortParam(sort, 'user.name');
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

  // currentUser é opcional para preservar callers internos (findOneOrFail, etc.)
  async findOne(id: number, currentUser?: UserPayload): Promise<User> {
    // Controle por recurso: não-admins só podem ver o próprio perfil
    if (currentUser && currentUser.type !== 'ADMIN' && currentUser.sub !== id) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso.',
      );
    }

    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não foi encontrado.`);
    }
    return user;
  }

  // método público para outros módulos verificarem existência (sem controle de acesso)
  async findOneOrFail(id: number): Promise<User> {
    return this.findOne(id);
  }

  // ─── atualizar ────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateUserDto, currentUser?: UserPayload): Promise<User> {
    // Controle por recurso: não-admins só podem atualizar o próprio perfil
    if (currentUser && currentUser.type !== 'ADMIN' && currentUser.sub !== id) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este recurso.',
      );
    }

    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      await this.assertEmailUnique(dto.email);
    }

    if (dto.crm && (user as Doctor).crm !== dto.crm) {
      await this.assertCrmUnique(dto.crm);
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // ─── remover ──────────────────────────────────────────────────────────────

  async remove(id: number, currentUser?: UserPayload): Promise<void> {
    // Admin não pode excluir a própria conta
    if (currentUser && currentUser.sub === id) {
      throw new ForbiddenException('Você não pode excluir sua própria conta.');
    }

    const user = await this.findOne(id);
    await this.assertNoActiveSchedules(id);

    // inativação lógica — preserva histórico
    user.isActive = false;
    await this.userRepository.save(user);
  }

  // ─── helpers de validação (privados) ─────────────────────────────────────

  private async assertEmailUnique(email: string): Promise<void> {
    const exists = await this.userRepository.findOneBy({ email });
    if (exists) {
      throw new ConflictException(
        `Já existe um usuário cadastrado com o e-mail ${email}.`,
      );
    }
  }

  private async assertCrmUnique(crm: string): Promise<void> {
    const exists = await this.doctorRepository.findOneBy({ crm });
    if (exists) {
      throw new ConflictException(
        `Já existe um médico cadastrado com o CRM ${crm}.`,
      );
    }
  }

  private assertProfileFields(dto: CreateUserDto): void {
    if (dto.type === UserType.DOCTOR && !dto.crm) {
      throw new BadRequestException('O CRM é obrigatório para médicos.');
    }
    if (dto.type === UserType.PATIENT) {
      if (!dto.cpf) throw new BadRequestException('O CPF é obrigatório para pacientes.');
      if (!dto.birthDate) throw new BadRequestException('A data de nascimento é obrigatória para pacientes.');
    }
  }

  private assertBirthDatePast(birthDate: string): void {
    if (new Date(birthDate) >= new Date()) {
      throw new BadRequestException('A data de nascimento deve ser uma data no passado.');
    }
  }

  private async assertNoActiveSchedules(userId: number): Promise<void> {
    const { Schedule, ScheduleStatus } = await import(
      '../schedules/entities/schedule.entity.js'
    );

    const count = await (this.userRepository.manager
      .getRepository(Schedule) as Repository<any>)
      .createQueryBuilder('schedule')
      .where(
        '(schedule.doctorId = :id OR schedule.patientId = :id)',
        { id: userId },
      )
      .andWhere('schedule.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED],
      })
      .getCount();

    if (count > 0) {
      throw new ConflictException(
        `O usuário com id ${userId} possui agendamentos ativos e não pode ser removido.`,
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
      `user.${field}`,
      (dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'),
    ];
  }

  // ─── médicos ──────────────────────────────────────────────────────────────

  async findDoctors(query: FindUsersQueryDto) {
    const { page = 1, limit = 20, sort, search } = query;

    const qb = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.doctorSpecialties', 'ds')
      .leftJoinAndSelect('ds.specialty', 'specialty')
      .where('doctor.isActive = true');

    if (search) {
      qb.andWhere('doctor.name LIKE :search', { search: `%${search}%` });
    }

    const [sortField, sortDir] = this.parseSortParam(sort, 'doctor.name');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async findDoctor(id: number) {
    const doctor = await this.doctorRepository.findOne({
      where: { id },
      relations: { doctorSpecialties: { specialty: true } },
    });
    if (!doctor) {
      throw new NotFoundException(`Médico com id ${id} não foi encontrado.`);
    }
    return doctor;
  }

  // ─── pacientes ────────────────────────────────────────────────────────────

  async findPatients(query: FindUsersQueryDto) {
    const { page = 1, limit = 20, sort, search } = query;

    const qb = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.isActive = true');

    if (search) {
      qb.andWhere('patient.name LIKE :search', { search: `%${search}%` });
    }

    const [sortField, sortDir] = this.parseSortParam(sort, 'patient.name');
    qb.orderBy(sortField, sortDir);
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: { totalItems, page, limit, totalPages: Math.ceil(totalItems / limit) },
    };
  }

async findPatient(id: number, currentUser?: UserPayload) {
  // Paciente só pode acessar o próprio perfil
  if (currentUser && currentUser.type === 'PATIENT' && currentUser.sub !== id) {
    throw new ForbiddenException(
      'Você não tem permissão para acessar este recurso.',
    );
  }

  const patient = await this.patientRepository.findOneBy({ id });
  if (!patient) {
    throw new NotFoundException(`Paciente com id ${id} não foi encontrado.`);
  }
  return patient;
}

  // ─── auth ─────────────────────────────────────────────────────────────────

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByRefreshToken(refreshToken: string) {
    return this.userRepository.findOne({ where: { refreshToken } });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    await this.userRepository.update(userId, {
    refreshToken: refreshToken ?? undefined,
  });
}
}
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Specialty } from './entities/specialty.entity';
import { DoctorSpecialty } from './entities/doctor-specialty.entity';
import { Doctor } from '../users/entities/doctor.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { FindSpecialtiesQueryDto } from './dto/find-specialties-query.dto';
import { FindUsersQueryDto } from '../users/dto/find-users-query.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,

    @InjectRepository(DoctorSpecialty)
    private readonly doctorSpecialtyRepository: Repository<DoctorSpecialty>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  // ─── especialidades ───────────────────────────────────────────────────────

  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    await this.assertNameUnique(dto.name);

    const specialty = this.specialtyRepository.create(dto);
    return this.specialtyRepository.save(specialty);
  }

  async findAll(query: FindSpecialtiesQueryDto) {
    const { page = 1, limit = 20, sort, search } = query;

    const qb = this.specialtyRepository.createQueryBuilder('specialty');

    if (search) {
      qb.andWhere(
        '(specialty.name LIKE :search OR specialty.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [sortField, sortDir] = this.parseSortParam(sort, 'specialty.name');
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

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.specialtyRepository.findOneBy({ id });
    if (!specialty) {
      throw new NotFoundException(
        `Especialidade com id ${id} não foi encontrada.`,
      );
    }
    return specialty;
  }

  async update(id: number, dto: UpdateSpecialtyDto): Promise<Specialty> {
    const specialty = await this.findOne(id);

    if (dto.name && dto.name !== specialty.name) {
      await this.assertNameUnique(dto.name);
    }

    Object.assign(specialty, dto);
    return this.specialtyRepository.save(specialty);
  }

  async remove(id: number): Promise<void> {
    const specialty = await this.findOne(id);
    await this.assertNoDoctorsAssociated(id);
    await this.specialtyRepository.remove(specialty);
  }

  // ─── associações doctor ↔ specialty ──────────────────────────────────────

  async associateDoctor(
    doctorId: number,
    specialtyId: number,
  ): Promise<DoctorSpecialty> {
    // garante que médico existe
    const doctor = await this.doctorRepository.findOneBy({ id: doctorId });
    if (!doctor) {
      throw new NotFoundException(
        `Médico com id ${doctorId} não foi encontrado.`,
      );
    }

    // garante que especialidade existe
    await this.findOne(specialtyId);

    // garante que associação ainda não existe
    const already = await this.doctorSpecialtyRepository.findOne({
      where: { doctorId, specialtyId },
    });
    if (already) {
      throw new ConflictException(
        `O médico com id ${doctorId} já está associado à especialidade com id ${specialtyId}.`,
      );
    }

    const association = this.doctorSpecialtyRepository.create({
      doctorId,
      specialtyId,
    });
    return this.doctorSpecialtyRepository.save(association);
  }

  async disassociateDoctor(
    doctorId: number,
    specialtyId: number,
  ): Promise<void> {
    const association = await this.doctorSpecialtyRepository.findOne({
      where: { doctorId, specialtyId },
    });
    if (!association) {
      throw new NotFoundException(
        `Associação entre médico ${doctorId} e especialidade ${specialtyId} não encontrada.`,
      );
    }
    await this.doctorSpecialtyRepository.remove(association);
  }

  async findSpecialtiesByDoctor(
    doctorId: number,
    query: FindSpecialtiesQueryDto,
  ) {
    // garante que médico existe
    const doctor = await this.doctorRepository.findOneBy({ id: doctorId });
    if (!doctor) {
      throw new NotFoundException(
        `Médico com id ${doctorId} não foi encontrado.`,
      );
    }

    const { page = 1, limit = 20 } = query;

    const [data, totalItems] = await this.specialtyRepository
      .createQueryBuilder('specialty')
      .innerJoin(
        'specialty.doctorSpecialties',
        'ds',
        'ds.doctorId = :doctorId',
        { doctorId },
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async findDoctorsBySpecialty(
    specialtyId: number,
    query: FindUsersQueryDto,
  ) {
    // garante que especialidade existe
    await this.findOne(specialtyId);

    const { page = 1, limit = 20 } = query;

    const [data, totalItems] = await this.doctorRepository
      .createQueryBuilder('doctor')
      .innerJoin(
        'doctor.doctorSpecialties',
        'ds',
        'ds.specialtyId = :specialtyId',
        { specialtyId },
      )
      .andWhere('doctor.isActive = true')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  // ─── helpers privados ─────────────────────────────────────────────────────

  private async assertNameUnique(name: string): Promise<void> {
    const exists = await this.specialtyRepository.findOneBy({ name });
    if (exists) {
      throw new ConflictException(
        `Já existe uma especialidade cadastrada com o nome "${name}".`,
      );
    }
  }

  private async assertNoDoctorsAssociated(specialtyId: number): Promise<void> {
    const count = await this.doctorSpecialtyRepository.count({
      where: { specialtyId },
    });
    if (count > 0) {
      throw new ConflictException(
        `A especialidade com id ${specialtyId} possui médicos associados e não pode ser removida.`,
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
      `specialty.${field}`,
      dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    ];
  }
}
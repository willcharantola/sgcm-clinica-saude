// src/modules/users/doctors.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { UsersService } from './users.service';
import { SpecialtiesService } from '../specialties/specialties.service';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { FindSpecialtiesQueryDto } from '../specialties/dto/find-specialties-query.dto';
import { AssociateSpecialtyDto } from '../specialties/dto/associate-specialty.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { SpecialtyResponseDto } from '../specialties/dto/specialty-response.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { FindSchedulesQueryDto } from '../schedules/dto/find-schedules-query.dto';
import { ScheduleResponseDto } from '../schedules/dto/schedule-response.dto';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly specialtiesService: SpecialtiesService,
     private readonly schedulesService: SchedulesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar médicos',
    description: 'Retorna médicos ativos com especialidades. Filtro por nome e especialidade.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de médicos.' })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findDoctors(query);
    return {
      data: result.data.map((d) => plainToInstance(UserResponseDto, d)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar médico por ID com especialidades' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const doctor = await this.usersService.findDoctor(id);
    return plainToInstance(UserResponseDto, doctor);
  }

  @Get(':id/specialties')
  @ApiOperation({ summary: 'Listar especialidades de um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de especialidades.' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.' })
  async findSpecialties(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FindSpecialtiesQueryDto,
  ) {
    const result = await this.specialtiesService.findSpecialtiesByDoctor(id, query);
    return {
      data: result.data.map((s) => plainToInstance(SpecialtyResponseDto, s)),
      meta: result.meta,
    };
  }

  @Post(':id/specialties')
  @ApiOperation({ summary: 'Associar especialidade a um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Associação realizada.' })
  @ApiResponse({ status: 404, description: 'Médico ou especialidade não encontrado.' })
  @ApiResponse({ status: 409, description: 'Associação já existe.' })
  async associateSpecialty(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: AssociateSpecialtyDto,
  ) {
    const association = await this.specialtiesService.associateDoctor(
      doctorId,
      dto.specialtyId,
    );
    return { doctorId: association.doctorId, specialtyId: association.specialtyId, assignedAt: association.assignedAt };
  }

  @Delete(':id/specialties/:specialtyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desassociar especialidade de um médico' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'specialtyId', example: 2 })
  @ApiResponse({ status: 204, description: 'Desassociação realizada.' })
  @ApiResponse({ status: 404, description: 'Associação não encontrada.' })
  async disassociateSpecialty(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('specialtyId', ParseIntPipe) specialtyId: number,
  ): Promise<void> {
    await this.specialtiesService.disassociateDoctor(doctorId, specialtyId);
  }

  @Get(':id/schedules')
@ApiOperation({ summary: 'Listar agendamentos de um médico' })
@ApiParam({ name: 'id', example: 1 })
@ApiResponse({ status: 200, description: 'Lista paginada de agendamentos.' })
@ApiResponse({ status: 404, description: 'Médico não encontrado.' })
async findSchedules(
  @Param('id', ParseIntPipe) id: number,
  @Query() query: FindSchedulesQueryDto,
) {
  const result = await this.schedulesService.findByDoctor(id, query);
  return {
    data: result.data.map((s) => plainToInstance(ScheduleResponseDto, s)),
    meta: result.meta,
  };
}
}
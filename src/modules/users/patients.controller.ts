import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { UsersService } from './users.service';
import { SchedulesService } from '../schedules/schedules.service';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { FindSchedulesQueryDto } from '../schedules/dto/find-schedules-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ScheduleResponseDto } from '../schedules/dto/schedule-response.dto';

@ApiTags('Patients')
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes com paginação e filtro por nome' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pacientes.' })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findPatients(query);
    return {
      data: result.data.map((p) => plainToInstance(UserResponseDto, p)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const patient = await this.usersService.findPatient(id);
    return plainToInstance(UserResponseDto, patient);
  }

  @Get(':id/schedules')
  @ApiOperation({ summary: 'Listar agendamentos de um paciente' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiResponse({ status: 200, description: 'Lista paginada de agendamentos.' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.' })
  async findSchedules(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FindSchedulesQueryDto,
  ) {
    const result = await this.schedulesService.findByPatient(id, query);
    return {
      data: result.data.map((s) => plainToInstance(ScheduleResponseDto, s)),
      meta: result.meta,
    };
  }
}
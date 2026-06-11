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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { FindSpecialtiesQueryDto } from './dto/find-specialties-query.dto';
import { SpecialtyResponseDto } from './dto/specialty-response.dto';
import { FindUsersQueryDto } from '../users/dto/find-users-query.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { Roles } from '../../common/decorators/roles.decorators';

@ApiBearerAuth('access-token')
@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar especialidade' })
  @ApiResponse({ status: 201, type: SpecialtyResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado.' })
  async create(@Body() dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtiesService.create(dto);
    return plainToInstance(SpecialtyResponseDto, specialty);
  }

  @Get()
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Listar especialidades com paginação' })
  @ApiResponse({ status: 200, description: 'Lista paginada de especialidades.' })
  async findAll(@Query() query: FindSpecialtiesQueryDto) {
    const result = await this.specialtiesService.findAll(query);
    return {
      data: result.data.map((s) => plainToInstance(SpecialtyResponseDto, s)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Buscar especialidade por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: SpecialtyResponseDto })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtiesService.findOne(id);
    return plainToInstance(SpecialtyResponseDto, specialty);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar especialidade' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, type: SpecialtyResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtiesService.update(id, dto);
    return plainToInstance(SpecialtyResponseDto, specialty);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir especialidade',
    description: 'Não pode ser removida enquanto houver médicos associados.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Especialidade removida.' })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.' })
  @ApiResponse({ status: 409, description: 'Especialidade possui médicos associados.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.specialtiesService.remove(id);
  }

  @Get(':id/doctors')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @ApiOperation({ summary: 'Listar médicos de uma especialidade' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista paginada de médicos.' })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.' })
  async findDoctors(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FindUsersQueryDto,
  ) {
    const result = await this.specialtiesService.findDoctorsBySpecialty(id, query);
    return {
      data: result.data.map((d) => plainToInstance(UserResponseDto, d)),
      meta: result.meta,
    };
  }
}
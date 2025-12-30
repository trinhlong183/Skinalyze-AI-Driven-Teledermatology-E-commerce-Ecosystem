import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TreatmentRoutinesService } from './treatment-routines.service';
import { CreateTreatmentRoutineDto } from './dto/create-treatment-routine.dto';
import { UpdateTreatmentRoutineDto } from './dto/update-treatment-routine.dto';
import { GetTreatmentRoutineDto } from './dto/get-treatment-routine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper, SuccessResponse } from '../utils/responses';
import { isUUID } from 'class-validator';
import { TimelineEventDto } from './dto/treatment-timeline.dto';
import { RoutineStatus } from './entities/treatment-routine.entity';

@ApiTags('Treatment Routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('treatment-routines')
export class TreatmentRoutinesController {
  constructor(
    private readonly treatmentRoutinesService: TreatmentRoutinesService,
  ) {}

  @Post()
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new treatment Routine' })
  async create(@Body() createTreatmentRoutineDto: CreateTreatmentRoutineDto) {
    const Routine = await this.treatmentRoutinesService.create(
      createTreatmentRoutineDto,
    );
    return ResponseHelper.created(
      'Treatment Routine created successfully',
      Routine,
    );
  }

  @Get()
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all treatment Routines' })
  async findAll() {
    const Routines = await this.treatmentRoutinesService.findAll();
    return ResponseHelper.success(
      'Treatment Routines retrieved successfully',
      Routines,
    );
  }

  @Get('dermatologist/:dermatologistId')
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Routines by dermatologist' })
  async findByDermatologist(
    @Param('dermatologistId') dermatologistId: string,
    @Query() query: GetTreatmentRoutineDto,
  ) {
    const { customerId, status } = query;

    if (customerId && !isUUID(customerId)) {
      throw new BadRequestException('customerId must be a valid UUID');
    }

    if (status && !Object.values(RoutineStatus).includes(status)) {
      throw new BadRequestException('status must be a valid RoutineStatus');
    }

    const filters: GetTreatmentRoutineDto = {};

    if (customerId) {
      filters.customerId = customerId;
    }

    if (status) {
      filters.status = status;
    }

    const Routines = await this.treatmentRoutinesService.findByDermatologist(
      dermatologistId,
      filters,
    );
    return ResponseHelper.success(
      'Dermatologist Routines retrieved successfully',
      Routines,
    );
  }

  @Get('customer/:customerId')
  @Roles(UserRole.DERMATOLOGIST, UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Routines by customer' })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query() query: GetTreatmentRoutineDto,
  ) {
    const { dermatologistId, status } = query;

    if (dermatologistId && !isUUID(dermatologistId)) {
      throw new BadRequestException('dermatologistId must be a valid UUID');
    }

    if (status && !Object.values(RoutineStatus).includes(status)) {
      throw new BadRequestException('status must be a valid RoutineStatus');
    }

    const filters: GetTreatmentRoutineDto = {};

    if (dermatologistId) {
      filters.dermatologistId = dermatologistId;
    }

    if (status) {
      filters.status = status;
    }

    const Routines = await this.treatmentRoutinesService.findByCustomer(
      customerId,
      filters,
    );
    return ResponseHelper.success(
      'Customer Routines retrieved successfully',
      Routines,
    );
  }

  @Get(':id/timeline')
  @Roles(UserRole.DERMATOLOGIST, UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get visual timeline of a treatment routine' })
  async getTimeline(
    @Param('id') id: string,
  ): Promise<SuccessResponse<TimelineEventDto[]>> {
    const timeline =
      await this.treatmentRoutinesService.getTreatmentTimeline(id);
    return ResponseHelper.success(
      'Treatment timeline retrieved successfully',
      timeline,
    );
  }
  @Get(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a treatment Routine by ID' })
  async findOne(@Param('id') id: string) {
    const Routine = await this.treatmentRoutinesService.findOne(id);
    return ResponseHelper.success(
      'Treatment Routine retrieved successfully',
      Routine,
    );
  }

  @Patch(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a treatment Routine' })
  async update(
    @Param('id') id: string,
    @Body() updateTreatmentRoutineDto: UpdateTreatmentRoutineDto,
  ) {
    const Routine = await this.treatmentRoutinesService.update(
      id,
      updateTreatmentRoutineDto,
    );
    return ResponseHelper.success(
      'Treatment Routine updated successfully',
      Routine,
    );
  }

  @Delete(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a treatment Routine' })
  async remove(@Param('id') id: string) {
    await this.treatmentRoutinesService.remove(id);
    return ResponseHelper.success('Treatment Routine deleted successfully');
  }
}

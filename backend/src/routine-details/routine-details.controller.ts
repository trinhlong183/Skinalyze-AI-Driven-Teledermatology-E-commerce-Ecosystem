import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoutineDetailsService } from './routine-details.service';
import { CreateRoutineDetailDto } from './dto/create-routine-detail.dto';
import { UpdateRoutineDetailDto } from './dto/update-routine-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Routine Details')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routine-details')
export class RoutineDetailsController {
  constructor(private readonly routineDetailsService: RoutineDetailsService) {}

  @Post()
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new Routine detail' })
  async create(
    @GetUser() user: User,
    @Body() createRoutineDetailDto: CreateRoutineDetailDto,
  ) {
    const detail = await this.routineDetailsService.create(
      user.userId,
      createRoutineDetailDto,
    );
    return ResponseHelper.created(
      'Routine detail created successfully',
      detail,
    );
  }

  @Get()
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Routine details' })
  async findAll() {
    const details = await this.routineDetailsService.findAll();
    return ResponseHelper.success(
      'Routine details retrieved successfully',
      details,
    );
  }

  @Get(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a Routine detail by ID' })
  async findOne(@Param('id') id: string) {
    const detail = await this.routineDetailsService.findOne(id);
    return ResponseHelper.success(
      'Routine detail retrieved successfully',
      detail,
    );
  }

  @Get('routine/:routineId')
  @Roles(UserRole.DERMATOLOGIST, UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all details for a specific Routine' })
  async findByRoutine(@Param('routineId') routineId: string) {
    const details = await this.routineDetailsService.findByRoutineId(routineId);
    return ResponseHelper.success(
      'Routine details retrieved successfully',
      details,
    );
  }

  @Patch(':id')
  @Roles(UserRole.DERMATOLOGIST)
  @ApiOperation({ summary: 'Update a Routine detail (Versioning)' })
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateRoutineDetailDto: UpdateRoutineDetailDto,
  ) {
    const detail = await this.routineDetailsService.updateRoutineDetail(
      user.userId,
      id,
      updateRoutineDetailDto,
    );
    return ResponseHelper.success(
      'Routine detail updated successfully (new version created)',
      detail,
    );
  }

  @Delete(':id')
  @Roles(UserRole.DERMATOLOGIST)
  @ApiOperation({ summary: 'Soft delete a Routine detail' })
  async remove(@GetUser() user: User, @Param('id') id: string) {
    await this.routineDetailsService.deleteRoutineDetail(user.userId, id);
    return ResponseHelper.success('Routine detail deactivated successfully');
  }
}

// src/appointments/admin-appointments.controller.ts

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User, UserRole } from 'src/users/entities/user.entity';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ResponseHelper } from 'src/utils/responses';
import { AdminAppointmentsService } from './admin-appointment.service';

@Controller('admin/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiTags('Admin Appointments')
@ApiBearerAuth()
export class AdminAppointmentsController {
  constructor(
    private readonly adminAppointmentsService: AdminAppointmentsService,
  ) {}

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a disputed/interrupted appointment' })
  @ApiResponse({ status: 200, description: 'Dispute resolved.' })
  async resolveDispute(
    @GetUser() admin: User,
    @Param('id') appointmentId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const result = await this.adminAppointmentsService.resolveDispute(
      admin.userId,
      appointmentId,
      dto,
    );
    return ResponseHelper.success('Dispute resolved successfully', result);
  }
}

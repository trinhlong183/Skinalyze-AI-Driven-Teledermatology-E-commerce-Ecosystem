import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';
import { WithdrawalStatus } from './entities/withdrawal-request.entity';

@ApiTags('Withdrawals')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('request-otp')
  @Roles(UserRole.CUSTOMER, UserRole.DERMATOLOGIST)
  @ApiOperation({
    summary: '🔐 Step 1: Request OTP for withdrawal',
    description: 'Request OTP code sent to email before creating withdrawal request. OTP valid for 10 minutes.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to email successfully' })
  async requestOTP(
    @GetUser() user: User,
    @Body() requestOtpDto: RequestOtpDto,
  ) {
    const result = await this.withdrawalsService.requestOTP(
      user.userId,
      requestOtpDto,
    );
    
    const message = result.message || 'OTP code sent to your email. Valid for 10 minutes.';
    return ResponseHelper.success(message, result);
  }

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.DERMATOLOGIST)
  @ApiOperation({
    summary: 'Step 2: Create withdrawal request with OTP',
    description: 'Creates withdrawal request after verifying OTP code. OTP will be verified automatically.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  async createRequest(
    @GetUser() user: User,
    @Body() createDto: CreateWithdrawalRequestDto,
  ) {
    const request = await this.withdrawalsService.createRequest(
      user.userId,
      createDto,
    );
    return ResponseHelper.created(
      'Withdrawal request created successfully. Waiting for admin approval.',
      {
        requestId: request.requestId,
        amount: request.amount,
        status: request.status,
      },
    );
  }

  @Get('my-requests')
  @Roles(UserRole.CUSTOMER, UserRole.DERMATOLOGIST)
  @ApiOperation({
    summary: 'Get my withdrawal requests',
    description: 'Returns all withdrawal requests for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async getMyRequests(@GetUser() user: User) {
    const requests = await this.withdrawalsService.getMyRequests(user.userId);
    return ResponseHelper.success(
      'Your withdrawal requests retrieved successfully',
      requests,
    );
  }

  @Get()
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all withdrawal requests (Staff/Admin only)',
    description: 'Returns all withdrawal requests with optional status filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WithdrawalStatus,
    description: 'Filter by status',
  })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved successfully' })
  async getAllRequests(@Query('status') status?: WithdrawalStatus) {
    const requests = await this.withdrawalsService.getAllRequests(status);
    return ResponseHelper.success(
      'Withdrawal requests retrieved successfully',
      requests,
    );
  }

  @Patch(':requestId/status')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update withdrawal request status (Staff/Admin only)',
    description: 'Approves, rejects, or completes a withdrawal request',
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @GetUser() user: User,
    @Param('requestId') requestId: string,
    @Body() updateDto: UpdateWithdrawalStatusDto,
  ) {
    const request = await this.withdrawalsService.updateStatus(
      requestId,
      user.userId,
      updateDto,
    );
    return ResponseHelper.success('Withdrawal request status updated', request);
  }

  @Delete(':requestId')
  @Roles(UserRole.CUSTOMER, UserRole.DERMATOLOGIST)
  @ApiOperation({
    summary: 'Cancel withdrawal request',
    description: 'Cancels a pending or verified withdrawal request',
  })
  @ApiResponse({ status: 200, description: 'Request cancelled successfully' })
  async cancelRequest(
    @GetUser() user: User,
    @Param('requestId') requestId: string,
  ) {
    await this.withdrawalsService.cancelRequest(user.userId, requestId);
    return ResponseHelper.success('Withdrawal request cancelled');
  }
}

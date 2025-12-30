import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReturnRequestsService } from './return-requests.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import {
  ReviewReturnRequestDto,
  CompleteReturnDto,
} from './dto/review-return-request.dto';
import { ReturnRequestResponseDto } from './dto/return-request-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from 'src/utils/responses';

@ApiTags('Return Requests')
@Controller('return-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReturnRequestsController {
  constructor(private readonly returnRequestsService: ReturnRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Customer creates return request' })
  @ApiResponse({
    status: 201,
    description: 'Return request created successfully',
    type: ReturnRequestResponseDto,
  })
  async create(
    @Body() createReturnRequestDto: CreateReturnRequestDto,
    @Request() req,
  ) {
    const data = await this.returnRequestsService.create(
      createReturnRequestDto,
      req.user.userId,
    );
    return ResponseHelper.success('Return request created successfully', data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all return requests (ADMIN/STAFF only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all return requests',
    type: [ReturnRequestResponseDto],
  })
  async findAll() {
    const data = await this.returnRequestsService.findAll();
    return ResponseHelper.success('Get all return requests successfully', data);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get pending return requests (ADMIN/STAFF only)' })
  @ApiResponse({
    status: 200,
    description: 'List of pending return requests',
    type: [ReturnRequestResponseDto],
  })
  async findPending() {
    const data = await this.returnRequestsService.findPending();
    return ResponseHelper.success(
      'Get pending return requests successfully',
      data,
    );
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my return requests (CUSTOMER)' })
  @ApiResponse({
    status: 200,
    description: 'List of my return requests',
    type: [ReturnRequestResponseDto],
  })
  async findMyRequests(@Request() req) {
    const data = await this.returnRequestsService.findByCustomer(
      req.user.userId,
    );
    return ResponseHelper.success('Get my return requests successfully', data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return request details',
    type: ReturnRequestResponseDto,
  })
  async findOne(@Param('id') id: string) {
    const data = await this.returnRequestsService.findOne(id);
    return ResponseHelper.success('Get return request successfully', data);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Approve return request (STAFF/ADMIN only)' })
  async approve(
    @Param('id') id: string,
    @Body() reviewDto: ReviewReturnRequestDto,
    @Request() req,
  ) {
    const data = await this.returnRequestsService.approve(
      id,
      req.user.userId,
      reviewDto,
    );
    return ResponseHelper.success('Return request approved successfully', data);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Reject return request (STAFF/ADMIN only)' })
  async reject(
    @Param('id') id: string,
    @Body() reviewDto: ReviewReturnRequestDto,
    @Request() req,
  ) {
    const data = await this.returnRequestsService.reject(
      id,
      req.user.userId,
      reviewDto,
    );
    return ResponseHelper.success('Return request rejected successfully', data);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff assigns themselves to handle return' })
  async assignStaff(@Param('id') id: string, @Request() req) {
    const data = await this.returnRequestsService.assignStaff(
      id,
      req.user.userId,
    );
    return ResponseHelper.success('Staff assigned successfully', data);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: 'Staff completes return (arrived at warehouse)' })
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteReturnDto,
    @Request() req,
  ) {
    const data = await this.returnRequestsService.complete(
      id,
      req.user.userId,
      completeDto,
    );
    return ResponseHelper.success('Return completed successfully', data);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Customer cancels return request (PENDING only)' })
  async cancel(@Param('id') id: string, @Request() req) {
    const data = await this.returnRequestsService.cancel(id, req.user.userId);
    return ResponseHelper.success(
      'Return request cancelled successfully',
      data,
    );
  }

  @Post(':id/upload-completion-photos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STAFF)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('photos', 10)) // Max 10 ảnh
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '📸 Upload return completion proof photos',
    description:
      'Staff uploads proof photos when completing return (1-10 photos)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Return completion proof photos (1-10 images)',
        },
      },
    },
  })
  async uploadCompletionPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please upload at least 1 photo');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 photos allowed');
    }

    const staffId = req.user.userId;
    const result = await this.returnRequestsService.uploadCompletionPhotos(
      id,
      files,
      staffId,
    );

    return ResponseHelper.success(
      'Return completion photos uploaded successfully',
      result,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete return request (ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.returnRequestsService.remove(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  ParseEnumPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { AvailabilitySlotsService } from './availability-slots.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { DermatologistsService } from '../dermatologists/dermatologists.service';
import { ResponseHelper } from '../utils/responses';
import { SlotStatus } from './entities/availability-slot.entity';
import { DeleteBatchSlotsDto } from './dto/delete-batch-availability.dto';

@ApiTags('Availability-slots')
@ApiBearerAuth()
@Controller('availability-slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DERMATOLOGIST)
export class AvailabilitySlotsController {
  constructor(
    private readonly availabilitySlotsService: AvailabilitySlotsService,
    private readonly dermatologistsService: DermatologistsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create availability slots for the authenticated dermatologist',
  })
  @ApiCreatedResponse({
    description: 'Availability slots created successfully',
  })
  async createSlots(@GetUser() user: User, @Body() dto: CreateAvailabilityDto) {
    const dermatologist = await this.dermatologistsService.findByUserId(
      user.userId,
    );
    const result = await this.availabilitySlotsService.createMySlots(
      dermatologist.dermatologistId,
      dermatologist.defaultSlotPrice,
      dto,
    );
    return ResponseHelper.created(result.message, result);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieve availability slots within the given date range',
  })
  @ApiOkResponse({
    description: 'Availability slots retrieved successfully',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'ISO 8601 timestamp marking the start of the search window',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'ISO 8601 timestamp marking the end of the search window',
  })
  @ApiQuery({
    name: 'status',
    enum: SlotStatus,
    required: false,
    description: 'Filter availability slots by status',
  })
  async getSlots(
    @GetUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status', new ParseEnumPipe(SlotStatus, { optional: true }))
    status?: SlotStatus,
  ) {
    const dermatologistId = await this.getDermatologistId(user.userId);
    const slots = await this.availabilitySlotsService.getMySlots(
      dermatologistId,
      startDate,
      endDate,
      status,
    );

    return ResponseHelper.success('Slots retrieved successfully', slots);
  }

  @Delete('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel multiple availability slots',
  })
  @ApiOkResponse({
    description: 'Availability slots cancelled successfully',
  })
  async cancelBatchSlots(
    @GetUser() user: User,
    @Body() dto: DeleteBatchSlotsDto,
  ) {
    const dermatologistId = await this.getDermatologistId(user.userId);
    return this.availabilitySlotsService.cancelMySlotsBatch(
      dermatologistId,
      dto.slotIds,
    );
  }

  @Delete(':slotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel an availability slot',
  })
  @ApiNoContentResponse({
    description: 'Availability slot cancelled successfully',
  })
  async cancelSlot(
    @GetUser() user: User,
    @Param('slotId', new ParseUUIDPipe()) slotId: string,
  ) {
    const dermatologistId = await this.getDermatologistId(user.userId);
    await this.availabilitySlotsService.cancelMySlot(dermatologistId, slotId);
  }

  private async getDermatologistId(userId: string): Promise<string> {
    const dermatologist = await this.dermatologistsService.findByUserId(userId);
    return dermatologist.dermatologistId;
  }
}

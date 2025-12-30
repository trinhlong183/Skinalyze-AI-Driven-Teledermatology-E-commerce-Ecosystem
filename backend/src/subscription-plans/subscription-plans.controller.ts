import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ResponseHelper } from '../utils/responses';
import { FindSubscriptionPlansDto } from './dto/find-subscription-plan.dto';

@ApiTags('Subscription Plans')
@ApiBearerAuth()
@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @Roles(UserRole.DERMATOLOGIST)
  @ApiOperation({ summary: 'Create a new subscription plan (Dermatologist)' })
  @ApiResponse({ status: 201, description: 'Creation successful.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Dermatologist role required.',
  })
  async create(
    @GetUser() user: User,
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    const subscription = await this.subscriptionPlansService.createForUser(
      user.userId,
      createSubscriptionPlanDto,
    );

    return ResponseHelper.created(
      'Subscription created successfully',
      subscription,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get a list of subscription plans (Filter & Sort)' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved list.' })
  async findAll(@Query() filters: FindSubscriptionPlansDto) {
    const subscriptions = await this.subscriptionPlansService.findAll(filters);

    return ResponseHelper.success(
      'Subscriptions retrieved successfully',
      subscriptions,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single subscription plan' })
  @ApiParam({
    name: 'id',
    description: 'Subscription Plan ID (UUID)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved detail.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const subscription = await this.subscriptionPlansService.findOne(id);

    return ResponseHelper.success('Subscription retrieved', subscription);
  }

  @Patch(':id')
  @Roles(UserRole.DERMATOLOGIST)
  @ApiOperation({ summary: 'Update a subscription plan (Dermatologist)' })
  @ApiParam({
    name: 'id',
    description: 'Subscription Plan ID (UUID)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Update successful.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Dermatologist role required.',
  })
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    const subscription = await this.subscriptionPlansService.updateForUser(
      user.userId,
      id,
      updateSubscriptionPlanDto,
    );

    return ResponseHelper.success('Subscription updated', subscription);
  }

  @Delete(':id')
  @Roles(UserRole.DERMATOLOGIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription plan (Dermatologist)' })
  @ApiParam({
    name: 'id',
    description: 'Subscription Plan ID (UUID)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Deletion successful (No Content).',
  })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Dermatologist role required.',
  })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.subscriptionPlansService.removeForUser(user.userId, id);
  }
}

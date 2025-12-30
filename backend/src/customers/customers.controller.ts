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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseHelper } from '../utils/responses';
import { User } from 'src/users/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    const customer = await this.customersService.create(createCustomerDto);
    return ResponseHelper.success('Customer created successfully', customer);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customers' })
  async findAll() {
    const customers = await this.customersService.findAll();
    return ResponseHelper.success(
      'Customers retrieved successfully',
      customers,
    );
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    const customer = await this.customersService.findByUserId(userId);
    return ResponseHelper.success('Customer retrieved successfully', customer);
  }

  @Post('user/:userId/ai-usage/increment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Increment AI usage for customer' })
  async incrementAiUsage(@Param('userId') userId: string) {
    const customer = await this.customersService.incrementAiUsage(userId);
    return ResponseHelper.success('AI usage incremented', customer);
  }

  @Post('user/:userId/analysis/:analysisId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add analysis to customer' })
  async addAnalysis(
    @Param('userId') userId: string,
    @Param('analysisId') analysisId: string,
  ) {
    const customer = await this.customersService.addAnalysis(
      userId,
      analysisId,
    );
    return ResponseHelper.success('Analysis added', customer);
  }

  @Post('subscribe/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a customer for a subscription plan' })
  async subscribeToPlan(
    @Param('subscriptionId') subscriptionId: string,
    @GetUser() user: User,
  ) {
    const customer = await this.customersService.subscribeToPlan(
      user.userId,
      subscriptionId,
    );
    return ResponseHelper.success('Subscription registered', customer);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a customer' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customersService.update(id, updateCustomerDto);
    return ResponseHelper.success('Customer updated successfully', customer);
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a customer by ID' })
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);
    return ResponseHelper.success('Customer retrieved successfully', customer);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a customer' })
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
    return ResponseHelper.success('Customer deleted successfully');
  }
}

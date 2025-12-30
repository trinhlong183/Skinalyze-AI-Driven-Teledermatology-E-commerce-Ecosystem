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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseHelper } from '../utils/responses';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new transaction' })
  async create(@Body() createDto: CreateTransactionDto) {
    const transaction = await this.transactionsService.create(createDto);
    return ResponseHelper.success(
      'Transaction created successfully',
      transaction,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all transactions' })
  async findAll() {
    const transactions = await this.transactionsService.findAll();
    return ResponseHelper.success(
      'Transactions retrieved successfully',
      transactions,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a transaction by ID' })
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionsService.findOne(id);
    return ResponseHelper.success(
      'Transaction retrieved successfully',
      transaction,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a transaction' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
  ) {
    const transaction = await this.transactionsService.update(id, updateDto);
    return ResponseHelper.success(
      'Transaction updated successfully',
      transaction,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a transaction' })
  async remove(@Param('id') id: string) {
    await this.transactionsService.remove(id);
    return ResponseHelper.success('Transaction deleted successfully');
  }
}

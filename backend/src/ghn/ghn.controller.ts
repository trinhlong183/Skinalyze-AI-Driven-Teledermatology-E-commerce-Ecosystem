import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GhnService } from './ghn.service';
import { CreateGhnOrderDto } from './dto/create-ghn-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('GHN - Third Party Shipping')
@Controller('ghn')
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  @Get('wards')
  @ApiOperation({
    summary: 'Get list of wards by district ID',
    description: 'Retrieve available wards for a specific district from GHN',
  })
  @ApiQuery({ name: 'districtId', example: 1444 })
  @ApiResponse({
    status: 200,
    description: 'List of wards retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        data: [
          {
            WardCode: '20308',
            WardName: 'Phường 14',
            DistrictID: 1444,
          },
        ],
      },
    },
  })
  async getWards(@Query('districtId') districtId: string) {
    const wards = await this.ghnService.getWards(parseInt(districtId));
    return {
      statusCode: 200,
      data: wards,
    };
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create GHN shipping order (Admin/Staff only)',
    description:
      'Create a third-party shipping order with GHN for long-distance deliveries',
  })
  @ApiResponse({
    status: 201,
    description: 'GHN order created successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'GHN shipping order created successfully',
        data: {
          order_code: 'GHN12345678',
          sort_code: '1444-C',
          total_fee: 35000,
          expected_delivery_time: '2025-12-05T17:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async createShippingOrder(@Body() createDto: CreateGhnOrderDto) {
    const result = await this.ghnService.createShippingOrder(createDto);
    return {
      statusCode: 201,
      message: 'GHN shipping order created successfully',
      data: {
        order_code: result.data.order_code,
        sort_code: result.data.sort_code,
        total_fee: result.data.total_fee,
        expected_delivery_time: result.data.expected_delivery_time,
        fee_breakdown: result.data.fee,
      },
    };
  }

  @Get('order/:orderCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get GHN order tracking information',
    description: 'Retrieve tracking details for a GHN order',
  })
  @ApiResponse({
    status: 200,
    description: 'Order information retrieved successfully',
  })
  async getOrderInfo(@Param('orderCode') orderCode: string) {
    const orderInfo = await this.ghnService.getOrderInfo(orderCode);
    return {
      statusCode: 200,
      data: orderInfo,
    };
  }

  @Post('calculate-fee')
  @ApiOperation({
    summary: 'Calculate shipping fee',
    description: 'Calculate GHN shipping fee before creating order',
  })
  @ApiResponse({
    status: 200,
    description: 'Shipping fee calculated',
    schema: {
      example: {
        statusCode: 200,
        data: {
          fee: 35000,
          currency: 'VND',
        },
      },
    },
  })
  async calculateFee(
    @Body()
    params: {
      toDistrictId: number;
      toWardCode: string;
      weight: number;
      serviceTypeId?: number;
    },
  ) {
    const fee = await this.ghnService.calculateShippingFee(params);
    return {
      statusCode: 200,
      data: {
        fee,
        currency: 'VND',
      },
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ResponseHelper } from '../utils/responses';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new address',
    description: 'Create a new address for a user. Requires authentication.',
  })
  @ApiBody({
    type: CreateAddressDto,
    examples: {
      residential: {
        summary: 'Residential address',
        value: {
          userId: '550e8400-e29b-41d4-a716-446655440001',
          street: '123 Nguyen Hue Street',
          streetLine1: 'Building A, Floor 5',
          streetLine2: 'Apartment 502',
          wardOrSubDistrict: 'Ben Nghe Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
        },
      },
      office: {
        summary: 'Office address',
        value: {
          userId: '550e8400-e29b-41d4-a716-446655440001',
          street: '456 Le Loi Boulevard',
          streetLine1: 'Office Tower B',
          wardOrSubDistrict: 'Ben Thanh Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Address created successfully',
        data: {
          addressId: '550e8400-e29b-41d4-a716-446655440000',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          street: '123 Nguyen Hue Street',
          streetLine1: 'Building A, Floor 5',
          streetLine2: 'Apartment 502',
          wardOrSubDistrict: 'Ben Nghe Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
          createdAt: '2025-10-03T10:30:00.000Z',
          updatedAt: '2025-10-03T10:30:00.000Z',
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createAddressDto: CreateAddressDto) {
    const address = await this.addressService.create(createAddressDto);
    return ResponseHelper.created('Address created successfully', address);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all addresses',
    description: 'Retrieve all addresses. Can filter by userId.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter addresses by user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Addresses retrieved successfully',
        data: [
          {
            addressId: '550e8400-e29b-41d4-a716-446655440000',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            street: '123 Nguyen Hue Street',
            streetLine1: 'Building A, Floor 5',
            streetLine2: 'Apartment 502',
            wardOrSubDistrict: 'Ben Nghe Ward',
            district: 'District 1',
            city: 'Ho Chi Minh City',
            createdAt: '2025-10-03T10:30:00.000Z',
            updatedAt: '2025-10-03T10:30:00.000Z',
          },
        ],
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('userId') userId?: string) {
    const addresses = userId
      ? await this.addressService.findByUserId(userId)
      : await this.addressService.findAll();
    return ResponseHelper.success(
      'Addresses retrieved successfully',
      addresses,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get address by ID',
    description: 'Retrieve a specific address by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Address UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Address retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Address retrieved successfully',
        data: {
          addressId: '550e8400-e29b-41d4-a716-446655440000',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          street: '123 Nguyen Hue Street',
          streetLine1: 'Building A, Floor 5',
          streetLine2: 'Apartment 502',
          wardOrSubDistrict: 'Ben Nghe Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
          createdAt: '2025-10-03T10:30:00.000Z',
          updatedAt: '2025-10-03T10:30:00.000Z',
        },
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    const address = await this.addressService.findOne(id);
    return ResponseHelper.success('Address retrieved successfully', address);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update address by ID',
    description: 'Update an existing address. Cannot update userId.',
  })
  @ApiParam({
    name: 'id',
    description: 'Address UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateAddressDto,
    examples: {
      partial: {
        summary: 'Update street only',
        value: {
          street: '789 Updated Street',
        },
      },
      multiple: {
        summary: 'Update multiple fields',
        value: {
          street: '789 Updated Street',
          wardOrSubDistrict: 'New Ward',
          district: 'District 2',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Address updated successfully',
        data: {
          addressId: '550e8400-e29b-41d4-a716-446655440000',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          street: '789 Updated Street',
          streetLine1: 'Building A, Floor 5',
          streetLine2: 'Apartment 502',
          wardOrSubDistrict: 'New Ward',
          district: 'District 2',
          city: 'Ho Chi Minh City',
          createdAt: '2025-10-03T10:30:00.000Z',
          updatedAt: '2025-10-03T11:00:00.000Z',
        },
        timestamp: '2025-10-03T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(id, updateAddressDto);
    return ResponseHelper.success('Address updated successfully', address);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete address by ID',
    description: 'Delete an existing address permanently.',
  })
  @ApiParam({
    name: 'id',
    description: 'Address UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Address deleted successfully',
        timestamp: '2025-10-03T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.addressService.remove(id);
    return ResponseHelper.success('Address deleted successfully');
  }
}

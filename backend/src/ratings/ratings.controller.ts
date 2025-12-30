import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';
import { GetDermatologistRatingsDto } from './dto/get-detmatologist-rating.dto';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a dermatologist after an appointment' })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Appointment not completed or already rated.',
  })
  async create(
    @GetUser() user: User,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    const rating = await this.ratingsService.create(
      user.userId,
      createRatingDto,
    );
    return ResponseHelper.created('Rating submitted successfully', rating);
  }

  @Get('dermatologist/:id')
  @ApiOperation({ summary: 'Get reviews of a dermatologist (Public)' })
  async getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetDermatologistRatingsDto,
  ) {
    const result = await this.ratingsService.getReviewsForDermatologist(id, {
      limit: query.limit,
      page: query.page,
      sort: query.sort,
      rating: query.rating,
    });

    return ResponseHelper.paginated(
      result.items,
      result.total,
      result.page,
      result.limit,
      'Reviews retrieved successfully',
    );
  }

  @Get('my/:appointmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.DERMATOLOGIST)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get rating for an appointment (requires ownership)',
  })
  async getMyAppointmentRating(
    @GetUser() user: User,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    const rating = await this.ratingsService.getRatingForAppointment(
      user.userId,
      appointmentId,
    );

    return ResponseHelper.success('Rating retrieved successfully', rating);
  }
}

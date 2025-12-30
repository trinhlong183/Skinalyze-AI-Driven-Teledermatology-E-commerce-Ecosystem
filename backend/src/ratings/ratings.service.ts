import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../appointments/types/appointment.types';
import { CustomersService } from '../customers/customers.service';
import { Dermatologist } from '../dermatologists/entities/dermatologist.entity';
import { RatingSortOption } from './dto/get-detmatologist-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly customersService: CustomersService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async create(
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<Rating> {
    const customer = await this.customersService.findByUserId(userId);
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const { appointmentId, rating, content } = createRatingDto;

    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId },
      relations: ['customer', 'dermatologist', 'rating'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // 2. Validate owner
    if (appointment.customer.customerId !== customer.customerId) {
      throw new ForbiddenException('You can only rate your own appointments');
    }

    // 3. Validate status (Only allowed to rate when COMPLETED or SETTLED)
    if (
      appointment.appointmentStatus !== AppointmentStatus.COMPLETED &&
      appointment.appointmentStatus !== AppointmentStatus.SETTLED
    ) {
      throw new BadRequestException('You can only rate completed appointments');
    }

    // 4. Validate duplicate (Each appointment can only have 1 rating)
    if (appointment.rating) {
      throw new BadRequestException('You have already rated this appointment');
    }

    return this.entityManager.transaction(async (manager) => {
      const ratingRepo = manager.getRepository(Rating);
      const dermRepo = manager.getRepository(Dermatologist);

      // A. Save Rating
      const newRating = ratingRepo.create({
        rating,
        content,
        customer: customer,
        dermatologist: appointment.dermatologist,
        appointment: appointment,
      });

      const savedRating = await ratingRepo.save(newRating);

      // B. Update statistics for Dermatologist (Average & Total)
      // Logic: Retrieve all ratings for this dermatologist to calculate the average
      const dermatologistId = appointment.dermatologist.dermatologistId;

      const statsRaw = await ratingRepo
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .addSelect('COUNT(rating.ratingId)', 'count')
        .where('rating.dermatologistId = :id', { id: dermatologistId })
        .getRawOne<{ average: string | null; count: string | null }>();

      const stats = statsRaw ?? { average: null, count: null };

      const newAverage = parseFloat(stats.average ?? '0');
      const newTotal = parseInt(stats.count ?? '0', 10);

      await dermRepo.update(dermatologistId, {
        averageRating: newAverage,
        totalReviews: newTotal,
      });

      return savedRating;
    });
  }

  async getReviewsForDermatologist(
    dermatologistId: string,
    options?: {
      limit?: number;
      page?: number;
      sort?: RatingSortOption;
      rating?: number;
    },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const page = Math.max(options?.page ?? 1, 1);
    const sort = options?.sort ?? RatingSortOption.LATEST;
    const ratingFilter = options?.rating;
    const offset = (page - 1) * limit;

    const query = this.ratingRepository
      .createQueryBuilder('rating')
      .leftJoinAndSelect('rating.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'user')
      .where('rating.dermatologistId = :dermatologistId', {
        dermatologistId,
      })
      .take(limit)
      .skip(offset);

    if (typeof ratingFilter === 'number') {
      query.andWhere('rating.rating = :ratingValue', {
        ratingValue: ratingFilter,
      });
    }

    switch (sort) {
      case RatingSortOption.HIGHEST:
        query.orderBy('rating.rating', 'DESC');
        query.addOrderBy('rating.createdAt', 'DESC');
        break;
      case RatingSortOption.LOWEST:
        query.orderBy('rating.rating', 'ASC');
        query.addOrderBy('rating.createdAt', 'DESC');
        break;
      case RatingSortOption.LATEST:
      default:
        query.orderBy('rating.createdAt', 'DESC');
        break;
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      limit,
      page,
    };
  }

  async getRatingForAppointment(
    userId: string,
    appointmentId: string,
  ): Promise<Rating> {
    const appointment = await this.appointmentRepository.findOne({
      where: { appointmentId },
      relations: ['customer', 'customer.user', 'dermatologist.user', 'rating'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isCustomerOwner = appointment.customer?.user?.userId === userId;
    const isDermOwner = appointment.dermatologist?.user?.userId === userId;

    if (!isCustomerOwner && !isDermOwner) {
      throw new ForbiddenException(
        'You do not have permission to view this appointment rating',
      );
    }

    if (!appointment.rating) {
      throw new NotFoundException('Rating not found for this appointment');
    }

    const ratingDetail = await this.ratingRepository.findOne({
      where: { ratingId: appointment.rating.ratingId },
      relations: [
        'customer',
        'customer.user',
        'dermatologist',
        'dermatologist.user',
        'appointment',
      ],
    });

    return ratingDetail ?? appointment.rating;
  }
}

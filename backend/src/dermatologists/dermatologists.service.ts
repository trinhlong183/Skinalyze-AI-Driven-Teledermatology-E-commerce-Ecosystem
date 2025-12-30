import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Dermatologist } from './entities/dermatologist.entity';
import {
  CreateDermatologistDto,
  UpdateDermatologistDto,
} from './dto/create-dermatologist.dto';
import { UsersService } from '../users/users.service';
import {
  GetMyPatientsDto,
  PatientListItemDto,
} from './dto/get-my-patients.dto';
import { Customer } from '../customers/entities/customer.entity';
import { differenceInYears, isSameDay } from 'date-fns';
import { Brackets } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../appointments/types/appointment.types';

@Injectable()
export class DermatologistsService {
  constructor(
    @InjectRepository(Dermatologist)
    private readonly dermatologistRepository: Repository<Dermatologist>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async create(
    userId: string,
    createDermatologistDto: CreateDermatologistDto,
  ): Promise<Dermatologist> {
    try {
      await this.usersService.findOne(userId);
      const existingProfile = await this.dermatologistRepository.findOne({
        where: { user: { userId: userId } },
      });
      if (existingProfile) {
        throw new ConflictException(
          `Dermatologist profile for this user already exists`,
        );
      }

      const dermatologist = this.dermatologistRepository.create({
        ...createDermatologistDto,
        user: { userId: userId },
      });
      return await this.dermatologistRepository.save(dermatologist);
    } catch (error) {
      this.handleError(error, 'Failed to create dermatologist');
    }
  }

  async findAll(): Promise<Dermatologist[]> {
    try {
      return await this.dermatologistRepository.find({
        relations: ['user'],
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve dermatologists');
    }
  }

  async findByDermaId(dermaId: string): Promise<Dermatologist> {
    try {
      const dermatologist = await this.dermatologistRepository.findOne({
        where: { dermatologistId: dermaId },
        relations: ['user'],
      });
      if (!dermatologist) {
        throw new NotFoundException(
          `Dermatologist with ID ${dermaId} not found`,
        );
      }

      return dermatologist;
    } catch (error) {
      this.handleError(error, `Failed to load dermatologist ${dermaId}`);
    }
  }

  async findByUserId(userId: string): Promise<Dermatologist> {
    try {
      const dermatologist = await this.dermatologistRepository.findOne({
        where: { user: { userId } },
        relations: ['user'],
      });

      if (!dermatologist) {
        throw new NotFoundException(
          `Dermatologist profile for user ${userId} not found`,
        );
      }

      return dermatologist;
    } catch (error) {
      this.handleError(
        error,
        `Failed to load dermatologist for user ${userId}`,
      );
    }
  }

  async updateMyProfile(
    userId: string,
    updateDermatologistDto: UpdateDermatologistDto,
  ): Promise<Dermatologist> {
    try {
      const dermatologist = await this.findByUserId(userId);

      Object.assign(dermatologist, updateDermatologistDto);
      return await this.dermatologistRepository.save(dermatologist);
    } catch (error) {
      this.handleError(
        error,
        `Failed to update dermatologist for user ${userId}`,
      );
    }
  }

  async update(
    dermatologistId: string,
    updateDermatologistDto: UpdateDermatologistDto,
  ): Promise<Dermatologist> {
    try {
      const dermatologist = await this.findByDermaId(dermatologistId);
      Object.assign(dermatologist, updateDermatologistDto);
      return await this.dermatologistRepository.save(dermatologist);
    } catch (error) {
      this.handleError(
        error,
        `Failed to update dermatologist ${dermatologistId}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const dermatologist = await this.findByDermaId(id);
      await this.dermatologistRepository.remove(dermatologist);
    } catch (error) {
      this.handleError(error, `Failed to remove dermatologist ${id}`);
    }
  }

  private handleError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(message);
  }

  async getPatientCount(dermatologistId: string): Promise<number> {
    try {
      // Ensure dermatologist exists
      await this.findByDermaId(dermatologistId);

      return await this.customerRepository
        .createQueryBuilder('customer')
        .leftJoin(
          'customer.appointments',
          'appointment',
          'appointment.dermatologistId = :dermatologistId AND appointment.appointmentStatus != :excludedStatus',
          {
            dermatologistId,
            excludedStatus: AppointmentStatus.PENDING_PAYMENT,
          },
        )
        .leftJoin(
          'customer.treatmentRoutines',
          'routine',
          'routine.dermatologistId = :dermatologistId',
          { dermatologistId },
        )
        .where(
          new Brackets((qb) => {
            qb.where('appointment.appointmentId IS NOT NULL').orWhere(
              'routine.routineId IS NOT NULL',
            );
          }),
        )
        .getCount();
    } catch (error) {
      this.handleError(error, 'Failed to count patients');
    }
  }

  async getPatientsForDermatologist(
    userId: string,
    filters: GetMyPatientsDto,
  ): Promise<{
    data: PatientListItemDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const dermatologist = await this.findByUserId(userId);
      const dermatologistId = dermatologist.dermatologistId;

      const { search, page = 1, limit = 10 } = filters;
      const skip = (page - 1) * limit;

      // 2. Query Builder để tìm Customer
      const query = this.customerRepository
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.user', 'user')
        .leftJoin(
          'customer.appointments',
          'appointment',
          'appointment.dermatologistId = :dermatologistId',
          { dermatologistId },
        )
        .leftJoin(
          'customer.treatmentRoutines',
          'routine',
          'routine.dermatologistId = :dermatologistId',
          { dermatologistId },
        )
        .where(
          new Brackets((qb) => {
            qb.where('appointment.appointmentId IS NOT NULL').orWhere(
              'routine.routineId IS NOT NULL',
            );
          }),
        );

      // 3. Tìm kiếm (Search)
      if (search) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('user.fullName LIKE :search', { search: `%${search}%` })
              .orWhere('user.phone LIKE :search', { search: `%${search}%` })
              .orWhere('user.email LIKE :search', { search: `%${search}%` });
          }),
        );
      }

      // 4. Phân trang
      query.skip(skip).take(limit);

      // Lấy danh sách customer và tổng số
      const [customers, total] = await query.getManyAndCount();

      // 5. Map dữ liệu sang DTO (Cần query thêm để lấy thông tin chi tiết cho từng người)
      // (Để tối ưu, bước này có thể dùng sub-query trong SQL, nhưng xử lý ở code sẽ dễ đọc hơn cho logic phức tạp)
      const populatedData = await Promise.all(
        customers.map(async (customer) => {
          return this.mapToPatientListItem(customer, dermatologistId);
        }),
      );

      return {
        data: populatedData,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.handleError(error, 'Failed to get patients list');
    }
  }

  /**
   * Helper: Tính toán thông tin hiển thị cho từng bệnh nhân
   */
  private async mapToPatientListItem(
    customer: Customer,
    dermatologistId: string,
  ): Promise<PatientListItemDto> {
    const now = new Date();
    const appRepo = this.customerRepository.manager.getRepository(Appointment);

    // A. Get last Appointment
    const lastAppt = await appRepo.findOne({
      where: {
        customer: { customerId: customer.customerId },
        dermatologist: { dermatologistId: dermatologistId },
        startTime: LessThan(now),
        // (Optional: Chỉ lấy status COMPLETED hoặc NO_SHOW?)
        // appointmentStatus: In([AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW])
      },
      order: { startTime: 'DESC' },
    });

    // B. Get next Appointment
    const nextAppt = await appRepo.findOne({
      where: {
        customer: { customerId: customer.customerId },
        dermatologist: { dermatologistId: dermatologistId },
        startTime: MoreThanOrEqual(now),
        appointmentStatus: AppointmentStatus.SCHEDULED,
      },
      order: { startTime: 'ASC' },
    });

    return {
      customerId: customer.customerId,
      userId: customer.user.userId,
      fullName: customer.user.fullName,
      photoUrl: customer.user.photoUrl,
      phone: customer.user.phone,
      gender: customer.user.gender,
      age: customer.user.dob
        ? differenceInYears(now, new Date(customer.user.dob))
        : null,

      //  Last Appointment Info
      lastAppointment: lastAppt
        ? {
            appointmentId: lastAppt.appointmentId,
            date: lastAppt.startTime,
            status: lastAppt.appointmentStatus,
            type: lastAppt.appointmentType,
          }
        : null,

      //  Next Appointment Info
      nextAppointment: nextAppt
        ? {
            appointmentId: nextAppt.appointmentId,
            date: nextAppt.startTime,
            status: nextAppt.appointmentStatus,
            type: nextAppt.appointmentType,
            isToday: isSameDay(new Date(nextAppt.startTime), now),
          }
        : null,
    };
  }
}

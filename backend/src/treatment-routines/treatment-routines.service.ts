import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CreateTreatmentRoutineDto } from './dto/create-treatment-routine.dto';
import { UpdateTreatmentRoutineDto } from './dto/update-treatment-routine.dto';
import { GetTreatmentRoutineDto } from './dto/get-treatment-routine.dto';
import {
  TreatmentRoutine,
  RoutineStatus,
} from './entities/treatment-routine.entity';
import { Dermatologist } from '../dermatologists/entities/dermatologist.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { SkinAnalysis } from '../skin-analysis/entities/skin-analysis.entity';
import { TimelineEventDto } from './dto/treatment-timeline.dto';
import {
  AppointmentStatus,
  AppointmentType,
} from '../appointments/types/appointment.types';
import { RoutineDetail } from '../routine-details/entities/routine-detail.entity';
import { endOfDay } from 'date-fns';

@Injectable()
export class TreatmentRoutinesService {
  constructor(
    @InjectRepository(TreatmentRoutine)
    private readonly treatmentRoutineRepository: Repository<TreatmentRoutine>,
    @InjectRepository(Dermatologist)
    private readonly dermatologistRepository: Repository<Dermatologist>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(SkinAnalysis)
    private readonly skinAnalysisRepository: Repository<SkinAnalysis>,
    @InjectRepository(RoutineDetail)
    private readonly routineDetailRepository: Repository<RoutineDetail>,
  ) {}

  async create(
    createTreatmentRoutineDto: CreateTreatmentRoutineDto,
  ): Promise<TreatmentRoutine> {
    const {
      dermatologistId,
      customerId,
      originalAnalysisId,
      createdFromAppointmentId,
      status,
      routineName,
    } = createTreatmentRoutineDto;

    // Validate dermatologist exists
    const dermatologist = await this.dermatologistRepository.findOne({
      where: { dermatologistId },
    });
    if (!dermatologist) {
      throw new BadRequestException(
        `Dermatologist with ID ${dermatologistId} not found`,
      );
    }

    // Validate customer exists
    const customer = await this.customerRepository.findOne({
      where: { customerId },
    });
    if (!customer) {
      throw new BadRequestException(`Customer with ID ${customerId} not found`);
    }

    let originalAnalysis: SkinAnalysis | null = null;
    if (originalAnalysisId) {
      originalAnalysis = await this.skinAnalysisRepository.findOne({
        where: { analysisId: originalAnalysisId },
      });

      if (!originalAnalysis) {
        throw new BadRequestException(
          `Skin analysis with ID ${originalAnalysisId} not found`,
        );
      }
    }

    let createdFromAppointment: Appointment | null = null;

    // Validate appointment exists if provided
    if (createdFromAppointmentId) {
      createdFromAppointment = await this.appointmentRepository.findOne({
        where: { appointmentId: createdFromAppointmentId },
      });
      if (!createdFromAppointment) {
        throw new BadRequestException(
          `Appointment with ID ${createdFromAppointmentId} not found`,
        );
      }
    }

    const routine = this.treatmentRoutineRepository.create({
      routineName,
      status: status ?? RoutineStatus.ACTIVE,
      dermatologist,
      customer,
    });

    if (originalAnalysis) {
      routine.originalAnalysis = originalAnalysis;
    }

    if (createdFromAppointment) {
      routine.createdFromAppointment = createdFromAppointment;
    }
    return await this.treatmentRoutineRepository.save(routine);
  }

  async findAll(): Promise<TreatmentRoutine[]> {
    return await this.treatmentRoutineRepository.find({
      relations: [
        'dermatologist',
        'customer',
        'originalAnalysis',
        'createdFromAppointment',
        'followUpAppointments',
        'routineDetails',
      ],
    });
  }

  async findOne(id: string): Promise<TreatmentRoutine> {
    const routine = await this.treatmentRoutineRepository.findOne({
      where: { routineId: id },
      relations: [
        'dermatologist',
        'customer',
        'originalAnalysis',
        'createdFromAppointment',
        'followUpAppointments',
        'routineDetails',
      ],
    });

    if (!routine) {
      throw new NotFoundException(`Treatment Routine with ID ${id} not found`);
    }

    return routine;
  }

  async findByDermatologist(
    dermatologistId: string,
    filters?: GetTreatmentRoutineDto,
  ): Promise<TreatmentRoutine[]> {
    const where: FindOptionsWhere<TreatmentRoutine> = {
      dermatologist: { dermatologistId },
    };

    const customerId = filters?.customerId;
    const status = filters?.status;

    if (customerId) {
      where.customer = { customerId };
    }

    if (status) {
      where.status = status;
    }

    return this.treatmentRoutineRepository.find({
      where,
      relations: [
        'dermatologist',
        'customer',
        'originalAnalysis',
        'createdFromAppointment',
        'routineDetails',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(
    customerId: string,
    filters?: GetTreatmentRoutineDto,
  ): Promise<TreatmentRoutine[]> {
    const where: FindOptionsWhere<TreatmentRoutine> = {
      customer: { customerId },
    };

    const dermatologistId = filters?.dermatologistId;
    const status = filters?.status;

    if (dermatologistId) {
      where.dermatologist = { dermatologistId };
    }

    if (status) {
      where.status = status;
    }

    return this.treatmentRoutineRepository.find({
      where,
      relations: [
        'dermatologist',
        'customer',
        'originalAnalysis',
        'createdFromAppointment',
        'routineDetails',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateTreatmentRoutineDto: UpdateTreatmentRoutineDto,
  ): Promise<TreatmentRoutine> {
    const routine = await this.findOne(id);

    if (updateTreatmentRoutineDto.routineName) {
      routine.routineName = updateTreatmentRoutineDto.routineName;
    }

    if (updateTreatmentRoutineDto.status) {
      routine.status = updateTreatmentRoutineDto.status;
    }

    if (updateTreatmentRoutineDto.dermatologistId) {
      const dermatologist = await this.dermatologistRepository.findOne({
        where: { dermatologistId: updateTreatmentRoutineDto.dermatologistId },
      });
      if (!dermatologist) {
        throw new BadRequestException(
          `Dermatologist with ID ${updateTreatmentRoutineDto.dermatologistId} not found`,
        );
      }
      routine.dermatologist = dermatologist;
    }

    if (updateTreatmentRoutineDto.customerId) {
      const customer = await this.customerRepository.findOne({
        where: { customerId: updateTreatmentRoutineDto.customerId },
      });
      if (!customer) {
        throw new BadRequestException(
          `Customer with ID ${updateTreatmentRoutineDto.customerId} not found`,
        );
      }
      routine.customer = customer;
    }

    if (updateTreatmentRoutineDto.originalAnalysisId) {
      const originalAnalysis = await this.skinAnalysisRepository.findOne({
        where: { analysisId: updateTreatmentRoutineDto.originalAnalysisId },
      });
      if (!originalAnalysis) {
        throw new BadRequestException(
          `Skin analysis with ID ${updateTreatmentRoutineDto.originalAnalysisId} not found`,
        );
      }
      routine.originalAnalysis = originalAnalysis;
    }

    if (updateTreatmentRoutineDto.createdFromAppointmentId) {
      const appointment = await this.appointmentRepository.findOne({
        where: {
          appointmentId: updateTreatmentRoutineDto.createdFromAppointmentId,
        },
      });
      if (!appointment) {
        throw new BadRequestException(
          `Appointment with ID ${updateTreatmentRoutineDto.createdFromAppointmentId} not found`,
        );
      }
      routine.createdFromAppointment = appointment;
    }

    return await this.treatmentRoutineRepository.save(routine);
  }

  async remove(id: string): Promise<void> {
    const routine = await this.findOne(id);
    await this.treatmentRoutineRepository.remove(routine);
  }

  async getTreatmentTimeline(routineId: string): Promise<TimelineEventDto[]> {
    const routine = await this.treatmentRoutineRepository.findOne({
      where: { routineId },
      relations: [
        'createdFromAppointment',
        'createdFromAppointment.skinAnalysis',
        'originalAnalysis', // Backup appraisal images
      ],
    });

    if (!routine) {
      throw new NotFoundException('Treatment routine not found');
    }

    const timeline: TimelineEventDto[] = [];

    // --- Stage 1: New Problem (START) ---
    // Based on createdFromAppointment or originalAnalysisId
    if (routine.createdFromAppointment) {
      const startAppt = routine.createdFromAppointment;
      const initialDetails = await this.findRoutineDetailsAtTime(
        routineId,
        startAppt.endTime,
      );

      timeline.push({
        id: startAppt.appointmentId,
        date: startAppt.endTime,
        type: AppointmentType.NEW_PROBLEM,
        doctorNote: startAppt.medicalNote || 'Initial consultation.',
        skinAnalysisImages:
          startAppt.skinAnalysis?.imageUrls ||
          routine.originalAnalysis?.imageUrls ||
          [],
        routine: {
          routineName: routine.routineName,
          details: initialDetails,
        },
      });
    }

    // --- Stage 2, 3...: Follow-up Appointments (FOLLOW_UP) ---
    // Find completed follow-up appointments belonging to this routine
    const followUpAppointments = await this.appointmentRepository.find({
      where: {
        trackingRoutine: { routineId: routineId },
        appointmentStatus: In([
          AppointmentStatus.COMPLETED,
          AppointmentStatus.SETTLED,
        ]),
      },
      relations: ['skinAnalysis'],
      order: { endTime: 'ASC' },
    });

    for (const appt of followUpAppointments) {
      const detailsAtTime = await this.findRoutineDetailsAtTime(
        routineId,
        appt.endTime,
      );

      timeline.push({
        id: appt.appointmentId,
        date: appt.endTime,
        type: AppointmentType.FOLLOW_UP,
        doctorNote: appt.medicalNote || 'Follow-up appointment.',
        skinAnalysisImages: appt.skinAnalysis?.imageUrls || [],
        routine: {
          routineName: routine.routineName,
          details: detailsAtTime,
        },
      });
    }

    return timeline;
  }

  private async findRoutineDetailsAtTime(routineId: string, timePoint: Date) {
    //Timepoint is adjusted to the end of the meeting day to include all details created/updated on that day
    const adjustedTimePoint = endOfDay(timePoint);

    const details = await this.routineDetailRepository
      .createQueryBuilder('detail')
      .where('detail.routineId = :routineId', { routineId })
      // 1. Routine detial is created ON OR BEFORE that time point
      .andWhere('detail.createdAt <= :point', { point: adjustedTimePoint })
      // 2. Not inactive or deactivated AFTER that time point
      .andWhere('(detail.isActive = true OR detail.updatedAt > :point)', {
        point: adjustedTimePoint,
      })
      .getMany();

    return details;
  }
}

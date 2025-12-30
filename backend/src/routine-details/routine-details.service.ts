import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateRoutineDetailDto } from './dto/create-routine-detail.dto';
import { UpdateRoutineDetailDto } from './dto/update-routine-detail.dto';
import { RoutineDetail } from './entities/routine-detail.entity';
import { TreatmentRoutine } from '../treatment-routines/entities/treatment-routine.entity';
import { DermatologistsService } from '../dermatologists/dermatologists.service';

@Injectable()
export class RoutineDetailsService {
  //  In 24h: Update Overwrite/hard Delete . After 24h: Create new version/Soft Delete.
  private readonly EDIT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  constructor(
    @InjectRepository(RoutineDetail)
    private readonly routineDetailRepository: Repository<RoutineDetail>,
    @InjectRepository(TreatmentRoutine)
    private readonly treatmentRoutineRepository: Repository<TreatmentRoutine>,
    private readonly dermatologistsService: DermatologistsService,
    private readonly entityManager: EntityManager,
  ) {}

  private async checkOwnership(
    userId: string,
    routineDetailId: string,
  ): Promise<RoutineDetail> {
    const detail = await this.routineDetailRepository.findOne({
      where: { routineDetailId },
      relations: ['treatmentRoutine', 'treatmentRoutine.dermatologist'],
    });

    if (!detail) {
      throw new NotFoundException('Routine Detail not found');
    }

    const dermatologist = await this.dermatologistsService.findByUserId(userId);

    if (
      detail.treatmentRoutine.dermatologist.dermatologistId !==
      dermatologist.dermatologistId
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this routine detail.',
      );
    }

    return detail;
  }

  async create(
    userId: string,
    createRoutineDetailDto: CreateRoutineDetailDto,
  ): Promise<RoutineDetail> {
    // 1. Validate Routine exists
    const routine = await this.treatmentRoutineRepository.findOne({
      where: { routineId: createRoutineDetailDto.routineId },
      relations: ['dermatologist.user'],
    });

    if (!routine) {
      throw new BadRequestException(
        `Treatment Routine with ID ${createRoutineDetailDto.routineId} not found`,
      );
    }
    if (routine?.dermatologist?.user?.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to add details to this routine.',
      );
    }

    // 2. Create RoutineDetail with new structure
    // Remove routineId from payload as we will assign treatmentRoutine relation
    const { routineId, products, ...detailPayload } = createRoutineDetailDto;

    // Create new RoutineDetail entity
    const newRoutineDetail = new RoutineDetail();
    Object.assign(newRoutineDetail, detailPayload);

    newRoutineDetail.products = products ?? [];
    newRoutineDetail.isActive = true;
    newRoutineDetail.treatmentRoutine = routine;

    // Save to database
    return await this.routineDetailRepository.save(newRoutineDetail);
  }

  async findAll(): Promise<RoutineDetail[]> {
    return await this.routineDetailRepository.find({
      relations: ['treatmentRoutine'],
    });
  }

  async findOne(id: string): Promise<RoutineDetail> {
    const routineDetail = await this.routineDetailRepository.findOne({
      where: { routineDetailId: id },
      relations: ['treatmentRoutine'],
    });

    if (!routineDetail) {
      throw new NotFoundException(`Routine Detail with ID ${id} not found`);
    }

    return routineDetail;
  }

  async findByRoutineId(routineId: string): Promise<RoutineDetail[]> {
    return await this.routineDetailRepository.find({
      where: { treatmentRoutine: { routineId } },
      relations: ['treatmentRoutine'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    id: string,
    updateRoutineDetailDto: UpdateRoutineDetailDto,
  ): Promise<RoutineDetail> {
    const routineDetail = await this.findOne(id);

    Object.assign(routineDetail, updateRoutineDetailDto);

    return await this.routineDetailRepository.save(routineDetail);
  }

  async remove(id: string): Promise<void> {
    const routineDetail = await this.findOne(id);
    await this.routineDetailRepository.remove(routineDetail);
  }

  async updateRoutineDetail(
    userId: string,
    detailId: string,
    updateDto: UpdateRoutineDetailDto,
  ): Promise<RoutineDetail> {
    const currentDetail = await this.checkOwnership(userId, detailId);

    if (!currentDetail.isActive) {
      throw new BadRequestException(
        'Cannot update an inactive (history) routine detail.',
      );
    }

    const now = new Date();
    const createdAt = new Date(currentDetail.createdAt);
    const timeDifference = now.getTime() - createdAt.getTime();

    // === (IN-PLACE UPDATE) ===
    // Applies when: Created within the last 24 hours (Doctor corrects typos, adjusts dosage on the same day)
    if (timeDifference <= this.EDIT_GRACE_PERIOD_MS) {
      Object.assign(currentDetail, updateDto);
      return this.routineDetailRepository.save(currentDetail);
    }

    // === (VERSIONING) ===
    // Applies when: More than 24 hours have passed (Clinical changes)
    // Benefit: Retain the history of old versions for past time points.
    return this.entityManager.transaction(async (manager) => {
      const detailRepo = manager.getRepository(RoutineDetail);

      // B1. Deactivate old record (Soft Delete)
      // updatedAt will be automatically updated -> Mark the end time
      currentDetail.isActive = false;
      await detailRepo.save(currentDetail);

      // B2. Clone old data + New data from DTO
      const newDetail = detailRepo.create({
        treatmentRoutine: currentDetail.treatmentRoutine,
        stepType: currentDetail.stepType,

        // Prioritize data from DTO, if not available then use old data
        content: updateDto.content ?? currentDetail.content,
        description: updateDto.description ?? currentDetail.description,
        products: updateDto.products ?? currentDetail.products,

        isActive: true,
      });

      return await detailRepo.save(newDetail);
    });
  }

  async deleteRoutineDetail(userId: string, detailId: string): Promise<void> {
    const detail = await this.checkOwnership(userId, detailId);

    if (!detail.isActive) {
      throw new BadRequestException('Detail is already inactive.');
    }

    const now = new Date();
    const createdAt = new Date(detail.createdAt);
    const timeDifference = now.getTime() - createdAt.getTime();

    // === (HARD DELETE) ===

    if (timeDifference <= this.EDIT_GRACE_PERIOD_MS) {
      await this.routineDetailRepository.remove(detail);
      return;
    }

    // === (SOFT DELETE) ===

    detail.isActive = false;
    // TypeORM automatically updates 'updatedAt' to the current time
    await this.routineDetailRepository.save(detail);
  }
}

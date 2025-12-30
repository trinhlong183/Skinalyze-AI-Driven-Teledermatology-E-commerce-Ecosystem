import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { Specialization } from './entities/specialization.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class SpecializationsService {
  constructor(
    @InjectRepository(Specialization)
    private readonly specializationRepository: Repository<Specialization>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createSpecializationDto: CreateSpecializationDto,
    certificateImage?: Express.Multer.File,
  ): Promise<Specialization> {
    try {
      // Upload certificate image if provided
      if (certificateImage) {
        const uploadResult = await this.cloudinaryService.uploadImage(
          certificateImage,
          'specialization-certificates',
        );
        createSpecializationDto.certificateImageUrl = uploadResult.secure_url;
      }

      const specialization = this.specializationRepository.create(
        createSpecializationDto,
      );
      return await this.specializationRepository.save(specialization);
    } catch (error) {
      console.error('Specialization creation error:', error);
      throw new InternalServerErrorException(
        `Failed to create specialization: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<Specialization[]> {
    try {
      return await this.specializationRepository.find({
        relations: ['dermatologist'],
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve specializations',
      );
    }
  }

  async findByDermatologist(
    dermatologistId: string,
  ): Promise<Specialization[]> {
    try {
      return await this.specializationRepository.find({
        where: { dermatologistId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve dermatologist specializations',
      );
    }
  }

  async findOne(id: string): Promise<Specialization> {
    try {
      const specialization = await this.specializationRepository.findOne({
        where: { specializationId: id },
        relations: ['dermatologist'],
      });

      if (!specialization) {
        throw new NotFoundException(`Specialization with ID ${id} not found`);
      }

      return specialization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve specialization',
      );
    }
  }

  async update(
    id: string,
    updateSpecializationDto: UpdateSpecializationDto,
    certificateImage?: Express.Multer.File,
  ): Promise<Specialization> {
    try {
      const specialization = await this.findOne(id);

      // Upload new certificate image if provided
      if (certificateImage) {
        const uploadResult = await this.cloudinaryService.uploadImage(
          certificateImage,
          'specialization-certificates',
        );
        updateSpecializationDto.certificateImageUrl = uploadResult.secure_url;
      }

      Object.assign(specialization, updateSpecializationDto);
      return await this.specializationRepository.save(specialization);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to update specialization',
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const specialization = await this.findOne(id);
      await this.specializationRepository.remove(specialization);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to remove specialization',
      );
    }
  }
}

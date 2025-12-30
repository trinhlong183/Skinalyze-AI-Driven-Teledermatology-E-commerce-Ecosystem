import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { SpecializationsService } from './specializations.service';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';

@ApiTags('Specializations')
@ApiBearerAuth()
@Controller('specializations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpecializationsController {
  constructor(
    private readonly specializationsService: SpecializationsService,
  ) {}

  @Post()
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('certificateImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new specialization' })
  @ApiCreatedResponse({ description: 'Specialization created successfully' })
  async create(
    @Body() createSpecializationDto: CreateSpecializationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    certificateImage?: Express.Multer.File,
  ) {
    const specialization = await this.specializationsService.create(
      createSpecializationDto,
      certificateImage,
    );
    return ResponseHelper.created(
      'Specialization created successfully',
      specialization,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all specializations' })
  @ApiOkResponse({ description: 'Specializations retrieved successfully' })
  async findAll() {
    const specializations = await this.specializationsService.findAll();
    return ResponseHelper.success(
      'Specializations retrieved successfully',
      specializations,
    );
  }

  @Get('dermatologist/:dermatologistId')
  @ApiOperation({ summary: 'Get specializations by dermatologist' })
  @ApiOkResponse({ description: 'Specializations retrieved successfully' })
  async findByDermatologist(
    @Param('dermatologistId', new ParseUUIDPipe()) dermatologistId: string,
  ) {
    const specializations =
      await this.specializationsService.findByDermatologist(dermatologistId);
    return ResponseHelper.success(
      'Specializations retrieved successfully',
      specializations,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specialization by ID' })
  @ApiOkResponse({ description: 'Specialization retrieved successfully' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const specialization = await this.specializationsService.findOne(id);
    return ResponseHelper.success(
      'Specialization retrieved successfully',
      specialization,
    );
  }

  @Patch(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('certificateImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a specialization' })
  @ApiOkResponse({ description: 'Specialization updated successfully' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSpecializationDto: UpdateSpecializationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    certificateImage?: Express.Multer.File,
  ) {
    const specialization = await this.specializationsService.update(
      id,
      updateSpecializationDto,
      certificateImage,
    );
    return ResponseHelper.success(
      'Specialization updated successfully',
      specialization,
    );
  }

  @Delete(':id')
  @Roles(UserRole.DERMATOLOGIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a specialization' })
  @ApiOkResponse({ description: 'Specialization deleted successfully' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.specializationsService.remove(id);
    return ResponseHelper.success('Specialization deleted successfully');
  }
}

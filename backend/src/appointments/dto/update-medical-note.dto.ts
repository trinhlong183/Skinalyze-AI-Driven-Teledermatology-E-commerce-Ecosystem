import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMedicalNoteDto {
  @ApiProperty({
    description: 'Ghi chú y khoa của bác sĩ (Chẩn đoán, triệu chứng...)',
    example: 'Bệnh nhân giảm mụn viêm 50%, da còn hơi khô vùng chữ T.',
  })
  @IsString()
  @IsNotEmpty()
  medicalNote: string;
}

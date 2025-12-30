import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompleteAppointmentDto {
  @ApiProperty({
    description: 'Ghi chú chuyên môn của bác sĩ sau buổi tư vấn',
    example:
      'Bệnh nhân có dấu hiệu cải thiện. Tiếp tục theo dõi và tái khám sau 2 tuần.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  medicalNote: string;
}

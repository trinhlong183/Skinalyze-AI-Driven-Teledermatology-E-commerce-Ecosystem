import { ApiProperty } from '@nestjs/swagger';
import { AppointmentType } from 'src/appointments/types/appointment.types';

export class RoutineSnapshotDto {
  @ApiProperty({ description: 'Tên phác đồ tại thời điểm này' })
  routineName: string;

  @ApiProperty({
    description: 'Chi tiết các bước (Sáng/Tối/...) tại thời điểm này',
  })
  details: any[];
}

export class TimelineEventDto {
  @ApiProperty({
    description: 'ID của mốc thời gian (thường là Appointment ID)',
  })
  id: string;

  @ApiProperty({ description: 'Ngày diễn ra sự kiện' })
  date: Date;

  @ApiProperty({
    description: 'Loại sự kiện: START (Khám đầu) hoặc FOLLOW_UP (Tái khám)',
    enum: ['NEW_PROBLEM', 'FOLLOW_UP'],
  })
  type: AppointmentType;

  @ApiProperty({ description: 'Ghi chú chuyên môn/Chẩn đoán của bác sĩ' })
  doctorNote: string;

  @ApiProperty({
    description: 'Danh sách ảnh da tại thời điểm này',
    type: [String],
  })
  skinAnalysisImages: string[];

  @ApiProperty({
    description: 'Thông tin treatment routine áp dụng sau buổi khám này',
  })
  routine: RoutineSnapshotDto;
}

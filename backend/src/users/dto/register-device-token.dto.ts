import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '../entities/device-token.entity';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM token from Firebase SDK',
    example: 'dGhpc19pc19hX2ZpcmViYXNlX3Rva2VuX2V4YW1wbGU',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  @IsNotEmpty()
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Device name (optional)',
    example: 'iPhone 14 Pro',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiProperty({
    description: 'Device model (optional)',
    example: 'iPhone15,2',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceModel?: string;
}

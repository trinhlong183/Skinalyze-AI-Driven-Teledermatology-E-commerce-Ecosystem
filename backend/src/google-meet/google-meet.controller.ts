import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleMeetService } from './google-meet.service';
import { CreateMeetDto } from './dto/create-meet.dto';

@ApiTags('Google Meet')
@Controller('google-meet')
export class GoogleMeetController {
  constructor(private readonly googleMeetService: GoogleMeetService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Google Meet link',
    description: 'Generate a Google Meet link for appointments',
  })
  @ApiResponse({
    status: 200,
    description: 'Meet link created successfully',
    schema: {
      example: {
        success: true,
        message: 'Google Meet link created successfully',
        data: {
          meetLink: 'https://meet.google.com/xxx-yyyy-zzz',
          summary: 'Tư vấn da liễu',
          startTime: '2025-11-15T10:00:00+07:00',
          endTime: '2025-11-15T10:30:00+07:00',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createMeetLink(@Body() createMeetDto: CreateMeetDto) {
    const meetLink = await this.googleMeetService.createMeetLink(createMeetDto);

    return {
      success: true,
      message: 'Google Meet link created successfully',
      data: {
        meetLink,
        summary: createMeetDto.summary,
        startTime: createMeetDto.startTimeISO,
        endTime: createMeetDto.endTimeISO,
      },
    };
  }
}

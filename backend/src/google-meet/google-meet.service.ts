import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { CreateMeetDto } from './dto/create-meet.dto';

@Injectable()
export class GoogleMeetService {
  private readonly logger = new Logger(GoogleMeetService.name);

  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar'];
  private readonly USER_TO_IMPERSONATE = 'lonh@nhatlonh.id.vn';

  /**
   * Tạo Google Meet link cho cuộc hẹn
   */
  async createMeetLink(createMeetDto: CreateMeetDto): Promise<string> {
    const { summary, startTimeISO, endTimeISO } = createMeetDto;

    const startDate = new Date(startTimeISO);
    const endDate = new Date(endTimeISO);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End time must be after start time');
    }

    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

    if (!credentialsJson && !credentialsBase64) {
      this.logger.error(
        'Missing GOOGLE_CREDENTIALS_JSON or GOOGLE_CREDENTIALS_BASE64 in environment variables',
      );
      throw new BadRequestException(
        'Server configuration error: Missing Google Credentials',
      );
    }

    let credentials;
    try {
      if (credentialsBase64) {
        const decoded = Buffer.from(credentialsBase64, 'base64').toString(
          'utf-8',
        );
        credentials = JSON.parse(decoded);
        this.logger.log('✅ Using GOOGLE_CREDENTIALS_BASE64');
      }
    } catch (error) {
      this.logger.error(`Failed to parse Google credentials: ${error.message}`);
      throw new BadRequestException(
        'Server configuration error: Invalid Credentials format',
      );
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: this.SCOPES,
        clientOptions: {
          subject: this.USER_TO_IMPERSONATE,
        },
      });

      const calendar = google.calendar({ version: 'v3', auth });

      // 4. Create calendar event with Meet link
      const event = {
        summary,
        description: 'Cuộc hẹn tư vấn da liễu qua Skinalyze',
        start: {
          dateTime: startTimeISO,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        end: {
          dateTime: endTimeISO,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        // Không thêm attendees theo yêu cầu của bạn
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
      });

      const meetLink = response.data.hangoutLink;

      if (!meetLink) {
        throw new Error('Failed to generate Google Meet link');
      }

      this.logger.log(`✅ Created Google Meet link: ${meetLink}`);
      return meetLink;
    } catch (error) {
      this.logger.error(`❌ Error creating Google Meet link: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error details: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new BadRequestException(
        `Failed to create Google Meet link: ${error.message}`,
      );
    }
  }

  /**
   * Helper method để tạo Meet link từ Date objects
   */
  async createMeetLinkFromDates(
    summary: string,
    startTime: Date,
    endTime: Date,
  ): Promise<string> {
    return this.createMeetLink({
      summary,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
    });
  }
}

import { Module } from '@nestjs/common';
import { GoogleMeetService } from './google-meet.service';
import { GoogleMeetController } from './google-meet.controller';

@Module({
  controllers: [GoogleMeetController],
  providers: [GoogleMeetService],
  exports: [GoogleMeetService],
})
export class GoogleMeetModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GhnService } from './ghn.service';
import { GhnController } from './ghn.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}

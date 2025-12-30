import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokensRepository: Repository<DeviceToken>,
  ) {}

  /**
   * Register or update a device token for a user
   */
  async registerToken(
    userId: string,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceToken> {
    // Check if token already exists for this user
    let deviceToken = await this.deviceTokensRepository.findOne({
      where: {
        userId,
        fcmToken: dto.fcmToken,
      },
    });

    if (deviceToken) {
      // Update existing token
      deviceToken.platform = dto.platform;
      if (dto.deviceName) deviceToken.deviceName = dto.deviceName;
      if (dto.deviceModel) deviceToken.deviceModel = dto.deviceModel;
      deviceToken.isActive = true;
      deviceToken.lastUsedAt = new Date();
    } else {
      // Create new token
      deviceToken = this.deviceTokensRepository.create({
        userId,
        fcmToken: dto.fcmToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    return this.deviceTokensRepository.save(deviceToken);
  }

  /**
   * Get all active device tokens for a user
   */
  async getActiveTokensByUserId(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokensRepository.find({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  /**
   * Get all active FCM tokens (strings) for a user
   */
  async getActiveFcmTokensByUserId(userId: string): Promise<string[]> {
    const deviceTokens = await this.getActiveTokensByUserId(userId);
    return deviceTokens.map((dt) => dt.fcmToken);
  }

  /**
   * Get all active FCM tokens for multiple users
   */
  async getActiveFcmTokensByUserIds(userIds: string[]): Promise<string[]> {
    const deviceTokens = await this.deviceTokensRepository.find({
      where: {
        userId: userIds as any, // TypeORM will handle the IN clause
        isActive: true,
      },
    });
    return deviceTokens.map((dt) => dt.fcmToken);
  }

  /**
   * Mark a device token as inactive (usually after failed push)
   */
  async markTokenAsInactive(fcmToken: string): Promise<void> {
    await this.deviceTokensRepository.update({ fcmToken }, { isActive: false });
    this.logger.log(
      `Marked token as inactive: ${fcmToken.substring(0, 20)}...`,
    );
  }

  /**
   * Mark multiple tokens as inactive
   */
  async markTokensAsInactive(fcmTokens: string[]): Promise<void> {
    if (fcmTokens.length === 0) return;

    await this.deviceTokensRepository.update(
      { fcmToken: fcmTokens as any },
      { isActive: false },
    );
    this.logger.log(`Marked ${fcmTokens.length} tokens as inactive`);
  }

  /**
   * Delete a device token (when user logs out)
   */
  async deleteToken(userId: string, fcmToken: string): Promise<void> {
    await this.deviceTokensRepository.delete({
      userId,
      fcmToken,
    });
  }

  /**
   * Delete all tokens for a user (when user deletes account)
   */
  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.deviceTokensRepository.delete({ userId });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(fcmToken: string): Promise<void> {
    await this.deviceTokensRepository.update(
      { fcmToken },
      { lastUsedAt: new Date() },
    );
  }

  /**
   * Clean up old inactive tokens (run as cron job)
   */
  async cleanupOldTokens(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deviceTokensRepository
      .createQueryBuilder()
      .delete()
      .where('isActive = :isActive', { isActive: false })
      .andWhere('lastUsedAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old device tokens`);
    return result.affected || 0;
  }
}

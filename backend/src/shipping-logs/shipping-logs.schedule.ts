import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShippingLogsService } from './shipping-logs.service';

/**
 * 🤖 Scheduler for Shipping Logs Operations
 *
 * This scheduler handles two main tasks:
 * 1. Auto-assignment of unassigned shipping logs (every hour)
 * 2. GHN order status synchronization (every 30 minutes) - BACKUP for webhook failures
 *
 * WHY WE NEED GHN POLLING:
 * - GHN webhook registration might fail
 * - GHN servers might not send webhooks
 * - Network issues between GHN and our server
 * - Webhook payload validation failures
 * - Our server was down when webhook was sent
 */
@Injectable()
export class ShippingLogsScheduler {
  private readonly logger = new Logger(ShippingLogsScheduler.name);

  constructor(private readonly shippingLogsService: ShippingLogsService) {}

  /**
   * 🕐 Runs every hour to auto-assign unassigned shipping logs
   * If a shipping log has been pending for more than 24 hours without a staff assignment,
   * it will be automatically assigned to a random active staff member
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoAssignShippingLogs() {
    this.logger.log(
      '🔄 Running Cron: Auto-assign unassigned shipping logs after 24 hours...',
    );

    try {
      const result =
        await this.shippingLogsService.autoAssignUnassignedShippingLogs();

      if (result.assignedCount > 0) {
        this.logger.log(
          `✅ Auto-assigned ${result.assignedCount} shipping logs to staff members`,
        );
      } else {
        this.logger.log('✅ No shipping logs needed auto-assignment');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `❌ Failed to auto-assign shipping logs: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * 🔄 Sync GHN orders every 30 minutes (BACKUP for webhook failures)
   * Runs at :00 and :30 of every hour (e.g., 10:00, 10:30, 11:00, 11:30)
   *
   * This acts as a safety net to catch any status updates that were missed
   * due to webhook failures or network issues.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncGhnOrderStatuses() {
    this.logger.log('🔄 Running Cron: Syncing GHN order statuses...');

    try {
      const result = await this.shippingLogsService.syncOrdersWithGHN();

      if (result.synced > 0 || result.failed > 0) {
        this.logger.log(
          `✅ GHN sync completed: ${result.synced} synced, ${result.failed} failed`,
        );

        // Log details for monitoring
        if (result.details.length > 0) {
          this.logger.debug(
            `📋 Sync details: ${JSON.stringify(result.details, null, 2)}`,
          );
        }
      } else {
        this.logger.log('✅ GHN sync completed: No orders to sync');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ GHN sync failed: ${err.message}`, err.stack);
    }
  }
}

import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { OrdersService } from '../orders.service';
import {
  GhnStatusWebhookDto,
  GhnCodWebhookDto,
} from '../dto/ghn-webhook.dto';

/**
 * 🚚 GHN WEBHOOK CONTROLLER
 * Handles status update callbacks from GHN (Giao Hàng Nhanh) shipping service
 *
 * Webhook URL to configure in GHN dashboard:
 * https://yourdomain.com/webhooks/ghn/status-update
 */
@ApiTags('webhooks')
@Controller('webhooks/ghn')
export class GhnWebhookController {
  private readonly logger = new Logger(GhnWebhookController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * 📦 Handle order status updates from GHN
   *
   * This endpoint receives webhooks from GHN when order status changes:
   * - ready_to_pick → CONFIRMED
   * - picking/sorting → PROCESSING
   * - delivering → SHIPPING
   * - delivered → DELIVERED
   * - cancel → CANCELLED
   * - return/delivery_fail → REJECTED
   */
  @Post('status-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🚚 GHN Status Update Webhook',
    description: `
      Receives status updates from GHN shipping service.

      **Webhook Flow:**
      1. GHN sends POST request with order status
      2. System maps GHN status to internal OrderStatus
      3. Updates order in database
      4. Sends notification to customer
      5. Returns HTTP 200 to acknowledge receipt

      **Status Mappings:**
      - ready_to_pick → CONFIRMED
      - picking, sorting, storing → PROCESSING
      - transporting, delivering → SHIPPING
      - delivered → DELIVERED
      - cancel → CANCELLED
      - return, delivery_fail → REJECTED

      **Important:** Always returns HTTP 200 to prevent GHN from retrying.
    `,
  })
  @ApiBody({
    description: 'GHN webhook payload',
    schema: {
      type: 'object',
      properties: {
        OrderCode: {
          type: 'string',
          example: 'GHN123456789',
          description: 'GHN order tracking code',
        },
        Status: {
          type: 'string',
          example: 'delivering',
          description: 'Current order status',
        },
        StatusText: {
          type: 'string',
          example: 'Đang giao hàng',
          description: 'Human-readable status in Vietnamese',
        },
        Time: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-13T10:30:00Z',
          description: 'Timestamp of status change',
        },
        Fee: {
          type: 'number',
          example: 25000,
          description: 'Shipping fee in VND',
        },
        CODAmount: {
          type: 'number',
          example: 500000,
          description: 'COD amount collected (if applicable)',
        },
      },
      required: ['OrderCode', 'Status'],
    },
  })
  async handleStatusUpdate(@Body() payload: GhnStatusWebhookDto) {
    this.logger.log(
      `📦 Received GHN webhook - OrderCode: ${payload.OrderCode}, Status: ${payload.Status}`,
    );
    this.logger.debug(`Full payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const { OrderCode, Status, Description, Warehouse } = payload;

      // Validate required fields
      if (!OrderCode || !Status) {
        this.logger.error('❌ Missing required fields: OrderCode or Status');
        return {
          success: false,
          message: 'Missing required fields',
        };
      }

      // Update order status using the GHN status mapper
      const updatedOrder = await this.ordersService.updateOrderStatusFromGhn(
        OrderCode,
        Status,
      );

      this.logger.log(
        `✅ Successfully updated order ${updatedOrder.orderId} to status ${updatedOrder.status}`,
      );

      return {
        success: true,
        message: 'Status updated successfully',
        data: {
          orderId: updatedOrder.orderId,
          previousStatus: updatedOrder.status, // This will be the new status after update
          newStatus: updatedOrder.status,
          ghnOrderCode: OrderCode,
          ghnStatus: Status,
          description: Description,
          warehouse: Warehouse,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to process GHN webhook: ${error.message}`,
        error.stack,
      );

      // ⚠️ IMPORTANT: Return 200 even on error to prevent GHN from retrying
      // We log the error but acknowledge receipt to avoid infinite retry loops
      return {
        success: false,
        message: error.message,
        error: error.name,
        orderId: null,
      };
    }
  }

  /**
   * 💰 Handle COD (Cash on Delivery) collection webhooks
   *
   * Called when GHN collects COD payment from customer
   */
  @Post('cod-collected')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '💰 GHN COD Collection Webhook',
    description: `
      Receives notification when GHN collects COD payment from customer.

      **Use Cases:**
      - Update payment status to COMPLETED
      - Record COD amount collected
      - Trigger financial reconciliation
      - Send confirmation to customer
    `,
  })
  @ApiBody({
    description: 'GHN COD collection webhook payload',
    schema: {
      type: 'object',
      properties: {
        OrderCode: {
          type: 'string',
          example: 'GHN123456789',
        },
        CODAmount: {
          type: 'number',
          example: 500000,
          description: 'Amount collected in VND',
        },
        CODTransferDate: {
          type: 'string',
          format: 'date',
          example: '2025-12-15',
          description: 'Expected transfer date to merchant',
        },
        Time: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-13T14:30:00Z',
        },
      },
    },
  })
  async handleCodCollected(@Body() payload: GhnCodWebhookDto) {
    this.logger.log(
      `💰 COD collected - OrderCode: ${payload.OrderCode}, Amount: ${payload.CODAmount}`,
    );
    this.logger.debug(`Full payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      // TODO: Implement COD collection logic
      // 1. Find order by GHN order code
      // 2. Update payment status to COMPLETED
      // 3. Record COD amount and collection date
      // 4. Send notification to merchant/admin
      // 5. Trigger accounting/reconciliation workflow

      this.logger.warn(
        '⚠️ COD collection webhook received but handler not yet implemented',
      );

      return {
        success: true,
        message: 'COD collection webhook received (handler pending)',
        data: {
          orderCode: payload.OrderCode,
          codAmount: payload.CODAmount,
          transferDate: payload.CODTransferDate,
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to process COD webhook: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 📍 Health check endpoint for webhook
   * GHN may ping this to verify the webhook URL is active
   */
  @Post('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🏓 Webhook Health Check',
    description: 'GHN may use this to verify webhook endpoint is active',
  })
  async ping() {
    return {
      success: true,
      message: 'GHN webhook endpoint is active',
      timestamp: new Date().toISOString(),
    };
  }
}

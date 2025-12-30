import { OrderStatus } from '../entities/order.entity';

/**
 * Maps GHN (Giao Hàng Nhanh) carrier status strings to internal OrderStatus enum.
 *
 * This function normalizes external carrier statuses into our internal order tracking system.
 *
 * @param ghnStatus - Raw status string from GHN webhook or API response
 * @returns OrderStatus - Corresponding internal enum value
 *
 * @example
 * ```typescript
 * mapGhnStatusToEnum('ready_to_pick') // Returns OrderStatus.CONFIRMED
 * mapGhnStatusToEnum('delivering') // Returns OrderStatus.SHIPPING
 * mapGhnStatusToEnum('delivered') // Returns OrderStatus.DELIVERED
 * ```
 */
export function mapGhnStatusToEnum(ghnStatus: string): OrderStatus {
  switch (ghnStatus) {
    // Ready to pick -> Order confirmed and ready for carrier pickup
    case 'ready_to_pick':
      return OrderStatus.CONFIRMED;

    // Processing states -> Order is being prepared/sorted at warehouse
    case 'picking':
    case 'money_collect_picking':
    case 'picked':
    case 'storing':
    case 'sorting':
      return OrderStatus.PROCESSING;

    // In-transit states -> Order is on the way to customer
    case 'transporting':
    case 'delivering':
    case 'money_collect_delivering':
      return OrderStatus.SHIPPING;

    // Successfully delivered
    case 'delivered':
      return OrderStatus.DELIVERED;

    // Order cancelled
    case 'cancel':
      return OrderStatus.CANCELLED;

    // Delivery failed or returned -> Rejected
    case 'delivery_fail':
    case 'waiting_to_return':
    case 'return':
    case 'return_transporting':
    case 'return_sorting':
    case 'returning':
    case 'return_fail':
    case 'returned':
      return OrderStatus.REJECTED;

    // Default fallback for unknown statuses
    default:
      return OrderStatus.PROCESSING;
  }
}

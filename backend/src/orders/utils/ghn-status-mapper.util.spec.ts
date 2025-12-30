import { OrderStatus } from '../entities/order.entity';
import { mapGhnStatusToEnum } from './ghn-status-mapper.util';
describe('mapGhnStatusToEnum', () => {
  describe('CONFIRMED status mapping', () => {
    it('should map "ready_to_pick" to CONFIRMED', () => {
      expect(mapGhnStatusToEnum('ready_to_pick')).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('PROCESSING status mapping', () => {
    it('should map "picking" to PROCESSING', () => {
      expect(mapGhnStatusToEnum('picking')).toBe(OrderStatus.PROCESSING);
    });

    it('should map "money_collect_picking" to PROCESSING', () => {
      expect(mapGhnStatusToEnum('money_collect_picking')).toBe(
        OrderStatus.PROCESSING,
      );
    });

    it('should map "picked" to PROCESSING', () => {
      expect(mapGhnStatusToEnum('picked')).toBe(OrderStatus.PROCESSING);
    });

    it('should map "storing" to PROCESSING', () => {
      expect(mapGhnStatusToEnum('storing')).toBe(OrderStatus.PROCESSING);
    });

    it('should map "sorting" to PROCESSING', () => {
      expect(mapGhnStatusToEnum('sorting')).toBe(OrderStatus.PROCESSING);
    });
  });

  describe('SHIPPING status mapping', () => {
    it('should map "transporting" to SHIPPING', () => {
      expect(mapGhnStatusToEnum('transporting')).toBe(OrderStatus.SHIPPING);
    });

    it('should map "delivering" to SHIPPING', () => {
      expect(mapGhnStatusToEnum('delivering')).toBe(OrderStatus.SHIPPING);
    });

    it('should map "money_collect_delivering" to SHIPPING', () => {
      expect(mapGhnStatusToEnum('money_collect_delivering')).toBe(
        OrderStatus.SHIPPING,
      );
    });
  });

  describe('DELIVERED status mapping', () => {
    it('should map "delivered" to DELIVERED', () => {
      expect(mapGhnStatusToEnum('delivered')).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('CANCELLED status mapping', () => {
    it('should map "cancel" to CANCELLED', () => {
      expect(mapGhnStatusToEnum('cancel')).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('REJECTED status mapping', () => {
    it('should map "delivery_fail" to REJECTED', () => {
      expect(mapGhnStatusToEnum('delivery_fail')).toBe(OrderStatus.REJECTED);
    });

    it('should map "waiting_to_return" to REJECTED', () => {
      expect(mapGhnStatusToEnum('waiting_to_return')).toBe(
        OrderStatus.REJECTED,
      );
    });

    it('should map "return" to REJECTED', () => {
      expect(mapGhnStatusToEnum('return')).toBe(OrderStatus.REJECTED);
    });

    it('should map "return_transporting" to REJECTED', () => {
      expect(mapGhnStatusToEnum('return_transporting')).toBe(
        OrderStatus.REJECTED,
      );
    });

    it('should map "return_sorting" to REJECTED', () => {
      expect(mapGhnStatusToEnum('return_sorting')).toBe(OrderStatus.REJECTED);
    });

    it('should map "returning" to REJECTED', () => {
      expect(mapGhnStatusToEnum('returning')).toBe(OrderStatus.REJECTED);
    });

    it('should map "return_fail" to REJECTED', () => {
      expect(mapGhnStatusToEnum('return_fail')).toBe(OrderStatus.REJECTED);
    });

    it('should map "returned" to REJECTED', () => {
      expect(mapGhnStatusToEnum('returned')).toBe(OrderStatus.REJECTED);
    });
  });

  describe('Default fallback handling', () => {
    it('should map unknown status to PROCESSING', () => {
      expect(mapGhnStatusToEnum('unknown_status')).toBe(OrderStatus.PROCESSING);
    });

    it('should map empty string to PROCESSING', () => {
      expect(mapGhnStatusToEnum('')).toBe(OrderStatus.PROCESSING);
    });

    it('should map random string to PROCESSING', () => {
      expect(mapGhnStatusToEnum('random_ghn_status')).toBe(
        OrderStatus.PROCESSING,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle case-sensitive matching', () => {
      // GHN sends lowercase statuses, uppercase should fall to default
      expect(mapGhnStatusToEnum('DELIVERED')).toBe(OrderStatus.PROCESSING);
    });

    it('should handle whitespace in status', () => {
      expect(mapGhnStatusToEnum(' delivered ')).toBe(OrderStatus.PROCESSING);
    });
  });
});

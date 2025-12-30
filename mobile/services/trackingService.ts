import axios from 'axios';
import config from '@/config/env';

export interface TrackingLocation {
  lat: number;
  lng: number;
  timestamp?: string;
}

export interface TrackingETA {
  distance: number;  // meters
  duration: number;  // seconds
  text: string;      // Vietnamese text e.g. "5 phút"
  polyline?: string | null;  // Encoded polyline string from Goong Directions API
}

export interface ShippingLog {
  shippingLogId: string;
  status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  estimatedDeliveryDate: string | null;
  deliveredDate: string | null;
}

export interface ShipperInfo {
  userId: string;
  fullName: string;
  phone: string;
}

export interface CustomerInfo {
  address: string;
  location: TrackingLocation;
}

export interface TrackingData {
  orderId: string;
  shippingLog: ShippingLog;
  shipper: ShipperInfo | null;
  customer: CustomerInfo;
  currentLocation: TrackingLocation | null;
  eta: TrackingETA | null;
}

export interface TrackingResponse {
  success: boolean;
  message: string;
  data: TrackingData;
}

class TrackingService {
  /**
   * Get tracking information for an order
   * Includes: current shipper location, ETA, shipper info
   */
  async getOrderTracking(orderId: string, token: string): Promise<TrackingData> {
    try {
      (`📍 Fetching tracking for order: ${orderId}`);
      
      const response = await axios.get<TrackingResponse>(
        `${config.API_BASE_URL}/tracking/order/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      ('✅ Tracking data received:', {
        orderId: response.data.data.orderId,
        status: response.data.data.shippingLog.status,
        hasShipper: !!response.data.data.shipper,
        hasLocation: !!response.data.data.currentLocation,
        hasETA: !!response.data.data.eta,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching tracking:', error.response?.data || error.message);
      
      // User-friendly error messages
      if (error.response?.status === 404) {
        throw new Error('Shipper chưa chuẩn bị giao hàng. Vui lòng kiểm tra lại sau.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      
      throw new Error(
        error.response?.data?.message || 
        'Đơn hàng chưa sẵn sàng để theo dõi. Shipper sẽ bắt đầu giao hàng sớm.'
      );
    }
  }

  /**
   * Format ETA text to Vietnamese
   */
  formatETA(eta: TrackingETA): string {
    const minutes = Math.ceil(eta.duration / 60);
    const km = (eta.distance / 1000).toFixed(1);
    return `${minutes} phút (${km} km)`;
  }

  /**
   * Get status label in Vietnamese
   */
  getStatusLabel(status: ShippingLog['status']): string {
    const labels: Record<ShippingLog['status'], string> = {
      PICKED_UP: 'Đã lấy hàng',
      IN_TRANSIT: 'Đang vận chuyển',
      OUT_FOR_DELIVERY: 'Đang giao hàng',
      DELIVERED: 'Đã giao hàng',
    };
    return labels[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: ShippingLog['status']): string {
    const colors: Record<ShippingLog['status'], string> = {
      PICKED_UP: '#FF9800',
      IN_TRANSIT: '#2196F3',
      OUT_FOR_DELIVERY: '#9C27B0',
      DELIVERED: '#4CAF50',
    };
    return colors[status] || '#757575';
  }

  /**
   * Check if tracking should be active (polling enabled)
   */
  shouldTrack(status: ShippingLog['status']): boolean {
    return ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(status);
  }

  /**
   * Format distance to readable text
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Format duration to readable text
   */
  formatDuration(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} giờ ${remainingMinutes} phút`;
  }

  /**
   * Check if location is stale (older than 5 minutes)
   */
  isLocationStale(timestamp: string): boolean {
    const locationTime = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - locationTime) > fiveMinutes;
  }
}

export default new TrackingService();

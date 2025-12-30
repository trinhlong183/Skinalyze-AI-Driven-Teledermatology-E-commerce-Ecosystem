import { BACKEND_URL } from '@/config/env';
import axios from 'axios';

export interface LocationUpdate {
  shipperId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

class LocationTrackingService {
  private isTracking = false;
  private trackingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Gửi vị trí hiện tại lên backend
   */
  async sendLocation(locationData: LocationUpdate): Promise<void> {
    try {
      await axios.post(`${BACKEND_URL}/api/shipper/location`, locationData, {
        headers: {
          'Content-Type': 'application/json',
          // TODO: Thêm authentication token
          // 'Authorization': `Bearer ${token}`,
        },
        timeout: 5000, // 5 seconds timeout
      });
      console.log('Location sent successfully:', locationData);
    } catch (error) {
      console.error('Error sending location to backend:', error);
      // Không throw error để không làm gián đoạn tracking
    }
  }

  /**
   * Bắt đầu tracking và gửi vị trí định kỳ
   */
  startPeriodicTracking(
    shipperId: string,
    orderId: string | undefined,
    getCurrentLocation: () => Promise<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    } | null>,
    intervalMs: number = 10000 // Mặc định gửi mỗi 10 giây
  ): void {
    if (this.isTracking) {
      console.log('Already tracking location');
      return;
    }

    this.isTracking = true;

    // Gửi ngay lập tức
    this.sendCurrentLocation(shipperId, orderId, getCurrentLocation);

    // Sau đó gửi định kỳ
    this.trackingInterval = setInterval(() => {
      this.sendCurrentLocation(shipperId, orderId, getCurrentLocation);
    }, intervalMs);

    console.log(`Started periodic location tracking (interval: ${intervalMs}ms)`);
  }

  /**
   * Dừng tracking định kỳ
   */
  stopPeriodicTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTracking = false;
    console.log('Stopped periodic location tracking');
  }

  /**
   * Gửi vị trí hiện tại
   */
  private async sendCurrentLocation(
    shipperId: string,
    orderId: string | undefined,
    getCurrentLocation: () => Promise<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    } | null>
  ): Promise<void> {
    try {
      const location = await getCurrentLocation();
      if (location) {
        await this.sendLocation({
          shipperId,
          orderId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error getting/sending location:', error);
    }
  }

  /**
   * Cập nhật trạng thái shipper
   */
  async updateShipperStatus(
    shipperId: string,
    status: 'online' | 'offline' | 'busy' | 'available',
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      await axios.post(
        `${BACKEND_URL}/api/shipper/status`,
        {
          shipperId,
          status,
          location: currentLocation,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Thêm authentication token
            // 'Authorization': `Bearer ${token}`,
          },
        }
      );
      console.log('Shipper status updated:', status);
    } catch (error) {
      console.error('Error updating shipper status:', error);
      throw error;
    }
  }

  /**
   * Gửi thông báo đã đến điểm lấy hàng / giao hàng
   */
  async notifyArrival(
    orderId: string,
    type: 'pickup' | 'delivery',
    location: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      await axios.post(
        `${BACKEND_URL}/api/order/${orderId}/arrival`,
        {
          type,
          location,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // TODO: Thêm authentication token
            // 'Authorization': `Bearer ${token}`,
          },
        }
      );
      console.log(`Arrival notification sent for ${type}:`, orderId);
    } catch (error) {
      console.error('Error sending arrival notification:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra xem có đang tracking không
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export default new LocationTrackingService();

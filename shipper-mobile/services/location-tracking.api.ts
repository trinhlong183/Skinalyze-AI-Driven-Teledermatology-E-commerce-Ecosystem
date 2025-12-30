import axios from 'axios';
import StorageService from './storage.service';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export type VehicleType = 'bike' | 'car';

export interface LocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  timestamp?: string;
  vehicle?: VehicleType; // Loại phương tiện: bike (xe máy/xe đạp) hoặc car (ô tô)
}

export interface ETAData {
  distance: number; // meters
  duration: number; // seconds
  text: string; // e.g., "19 phút"
}

export interface LocationUpdateResponse {
  orderId: string;
  location: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  eta: ETAData | null;
  message: string;
}

interface ShipperLocation {
  orderId: string;
  shipperId: string;
  lat: number;
  lng: number;
  timestamp: string;
  updatedAt: string;
}

interface ETAResponse {
  orderId: string;
  distance: number; // meters
  duration: number; // seconds
  distanceText: string; // e.g., "5.4 km"
  durationText: string; // e.g., "15 phút"
  estimatedArrival: string; // ISO timestamp
  shipperLocation: {
    lat: number;
    lng: number;
  };
  destinationLocation: {
    lat: number;
    lng: number;
  };
}

class LocationTrackingAPI {
  /**
   * Send shipper's current location to server
   * Backend will automatically calculate and broadcast ETA
   * POST /api/v1/tracking/location
   * 
   * @returns Location update response including ETA data
   */
  async sendLocation(payload: LocationPayload): Promise<LocationUpdateResponse> {
    try {
      const token = await StorageService.getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      const requestBody = {
        orderId: payload.orderId,
        lat: payload.lat,
        lng: payload.lng,
        timestamp: payload.timestamp || new Date().toISOString(),
        vehicle: payload.vehicle || 'bike', // Mặc định là bike
      };

      console.log('📤 ===== SENDING LOCATION TO BACKEND =====');
      console.log('🔗 URL:', `${API_BASE_URL}/api/v1/tracking/location`);
      console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('🚗 Vehicle:', payload.vehicle || 'bike (default)');
      console.log('🔐 Token:', token ? `Bearer ${token.substring(0, 20)}...` : 'No token');

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/tracking/location`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ ===== RESPONSE FROM BACKEND =====');
      console.log('📥 Full Response:', JSON.stringify(response.data, null, 2));
      console.log('📍 Location:', response.data?.data?.location);
      console.log('⏱️ ETA:', response.data?.data?.eta);
      console.log('💬 Message:', response.data?.data?.message);
      console.log('=====================================');
      
      // Return the data object which contains location and eta
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ ===== ERROR SENDING LOCATION =====');
      if (axios.isAxiosError(error)) {
        console.error('🔴 Status:', error.response?.status);
        console.error('🔴 Response:', JSON.stringify(error.response?.data, null, 2));
        console.error('🔴 Message:', error.message);
        console.error('=====================================');
        throw new Error(error.response?.data?.message || 'Failed to send location');
      }
      console.error('🔴 Unknown Error:', error);
      console.error('=====================================');
      throw error;
    }
  }

  /**
   * Get shipper's current location for an order
   * GET /api/v1/tracking/{orderId}/location
   */
  async getShipperLocation(orderId: string): Promise<ShipperLocation> {
    try {
      const token = await StorageService.getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/tracking/${orderId}/location`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('📍 Shipper location retrieved:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error getting shipper location:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to get shipper location');
      }
      throw error;
    }
  }

  /**
   * Get ETA (Estimated Time of Arrival) from shipper's current location to customer address
   * NOTE: This endpoint may not exist on backend. 
   * ETA is automatically calculated and returned when calling sendLocation()
   * 
   * @deprecated Use sendLocation() instead which returns ETA in response
   */
  async getETA(orderId: string): Promise<ETAResponse> {
    try {
      const token = await StorageService.getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/tracking/${orderId}/eta`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('⏱️ ETA retrieved:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('⚠️ Error getting ETA (endpoint may not exist):', error.response?.data || error.message);
        console.warn('💡 TIP: Use sendLocation() instead, which returns ETA automatically');
        throw new Error(error.response?.data?.message || 'Failed to get ETA');
      }
      throw error;
    }
  }

  /**
   * Send location periodically
   * Returns a cleanup function to stop sending
   */
  startPeriodicLocationUpdates(
    orderId: string,
    getCurrentLocation: () => Promise<{ lat: number; lng: number }>,
    intervalMs: number = 5000
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        await this.sendLocation({
          orderId,
          lat: location.lat,
          lng: location.lng,
        });
      } catch (error) {
        console.error('Error in periodic location update:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('🛑 Stopped periodic location updates');
    };
  }
}

export default new LocationTrackingAPI();

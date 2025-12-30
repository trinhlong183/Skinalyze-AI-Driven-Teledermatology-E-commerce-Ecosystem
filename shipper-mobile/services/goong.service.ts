import { GOONG_API_KEY, GOONG_MAP_KEY } from '@/config/env';
import axios from 'axios';

export interface GoongDirectionResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      steps: Array<{
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        html_instructions: string;
        polyline: {
          points: string;
        };
        start_location: {
          lat: number;
          lng: number;
        };
        end_location: {
          lat: number;
          lng: number;
        };
      }>;
    }>;
  }>;
}

export interface GoongPlaceDetail {
  result: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    name: string;
  };
}

class GoongService {
  private baseURL = 'https://rsapi.goong.io';
  
  /**
   * Lấy directions từ origin đến destination
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'bike'
  ): Promise<GoongDirectionResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/Direction`, {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          vehicle,
          api_key: GOONG_API_KEY,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }

  /**
   * Geocoding - Chuyển địa chỉ thành tọa độ
   */
  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await axios.get(`${this.baseURL}/geocode`, {
        params: {
          address,
          api_key: GOONG_API_KEY,
        },
      });
      
      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }
      throw new Error('No results found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  /**
   * Reverse Geocoding - Chuyển tọa độ thành địa chỉ
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/geocode`, {
        params: {
          latlng: `${lat},${lng}`,
          api_key: GOONG_API_KEY,
        },
      });
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  /**
   * Autocomplete - Tìm kiếm địa điểm với gợi ý
   */
  async autocomplete(
    input: string,
    location?: { lat: number; lng: number },
    options?: {
      limit?: number;
      radius?: number;
      more_compound?: boolean;
    }
  ) {
    try {
      const params: any = {
        input,
        api_key: GOONG_API_KEY,
        has_deprecated_administrative_unit: true,
        limit: options?.limit || 10,
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
        params.origin = `${location.lat},${location.lng}`;
        params.radius = options?.radius || 50;
      }

      if (options?.more_compound) {
        params.more_compound = true;
      }

      const response = await axios.get(
        `${this.baseURL}/Place/AutoComplete`,
        { params }
      );

      return response.data.predictions || [];
    } catch (error) {
      console.error("Error in autocomplete:", error);
      throw error;
    }
  }

  /**
   * Get place detail by place_id
   */
  async getPlaceDetail(placeId: string): Promise<GoongPlaceDetail> {
    try {
      const response = await axios.get(`${this.baseURL}/Place/Detail`, {
        params: {
          place_id: placeId,
          api_key: GOONG_API_KEY,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error getting place detail:", error);
      throw error;
    }
  }

  /**
   * Tìm kiếm địa điểm (legacy method for backward compatibility)
   */
  async searchPlaces(input: string, location?: { lat: number; lng: number }) {
    return this.autocomplete(input, location);
  }

  /**
   * Decode polyline từ Google's encoded polyline algorithm
   */
  decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  /**
   * Lấy Goong Maps API Key cho static map URLs
   */
  getMapKey(): string {
    return GOONG_MAP_KEY;
  }
}

export default new GoongService();

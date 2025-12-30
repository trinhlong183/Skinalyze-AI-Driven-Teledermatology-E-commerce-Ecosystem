import axios from 'axios';
import config from '@/config/env';

export interface GoongLatLng {
  lat: number;
  lng: number;
}

export interface GoongDirectionLeg {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  start_location: GoongLatLng;
  end_location: GoongLatLng;
}

export interface GoongDirectionRoute {
  overview_polyline: {
    points: string; // Encoded polyline
  };
  legs: GoongDirectionLeg[];
  summary: string;
  warnings: string[];
  waypoint_order: number[];
}

export interface GoongDirectionResponse {
  routes: GoongDirectionRoute[];
  status: string;
}

class GoongService {
  /**
   * Get directions from origin to destination
   * Used to draw route on map
   */
  async getDirections(
    origin: GoongLatLng,
    destination: GoongLatLng,
    vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'bike'
  ): Promise<GoongDirectionResponse> {
    try {
      ('🗺️ Fetching directions from Goong:', {
        origin,
        destination,
        vehicle,
      });

      const response = await axios.get<GoongDirectionResponse>(
        `${config.GOONG_BASE_URL}/Direction`,
        {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            vehicle,
            api_key: config.GOONG_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Goong API error: ${response.data.status}`);
      }

      ('✅ Directions received:', {
        routesCount: response.data.routes.length,
        hasPolyline: !!response.data.routes[0]?.overview_polyline?.points,
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching directions:', error.response?.data || error.message);
      throw new Error('Không thể tải đường đi từ Goong Maps');
    }
  }

  /**
   * Decode polyline from Goong to array of coordinates
   * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
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
   * Get distance matrix (alternative to directions)
   * Useful for calculating ETA without full route
   */
  async getDistanceMatrix(
    origins: GoongLatLng[],
    destinations: GoongLatLng[],
    vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'bike'
  ) {
    try {
      const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
      const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

      const response = await axios.get(
        `${config.GOONG_BASE_URL}/DistanceMatrix`,
        {
          params: {
            origins: originsStr,
            destinations: destinationsStr,
            vehicle,
            api_key: config.GOONG_API_KEY,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching distance matrix:', error.response?.data || error.message);
      throw new Error('Không thể tính khoảng cách');
    }
  }

  /**
   * Geocoding: Convert address to coordinates
   */
  async geocodeAddress(address: string): Promise<GoongLatLng | null> {
    try {
      const response = await axios.get(
        `${config.GOONG_BASE_URL}/Geocode`,
        {
          params: {
            address,
            api_key: config.GOONG_API_KEY,
          },
        }
      );

      if (response.data.results?.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error geocoding address:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Reverse geocoding: Convert coordinates to address
   */
  async reverseGeocode(location: GoongLatLng): Promise<string | null> {
    try {
      const response = await axios.get(
        `${config.GOONG_BASE_URL}/Geocode`,
        {
          params: {
            latlng: `${location.lat},${location.lng}`,
            api_key: config.GOONG_API_KEY,
          },
        }
      );

      if (response.data.results?.length > 0) {
        return response.data.results[0].formatted_address;
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error reverse geocoding:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Validate if coordinates are in Vietnam bounds
   */
  isInVietnam(location: GoongLatLng): boolean {
    return (
      location.lat >= 8.0 && location.lat <= 24.0 &&
      location.lng >= 102.0 && location.lng <= 110.0
    );
  }
}

export default new GoongService();

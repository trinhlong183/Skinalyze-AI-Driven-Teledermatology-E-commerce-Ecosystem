import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { ShippingLog } from '../shipping-logs/entities/shipping-log.entity';
import axios from 'axios';

// Forward reference to avoid circular dependency
import type { TrackingGateway } from './tracking.gateway';

export interface ETAResult {
  distance: number; // meters
  duration: number; // seconds
  text: string; // "5 phút", "10 phút"
  polyline?: string; // Encoded polyline string từ Goong Directions API
}

export interface TrackingInfo {
  orderId: string;
  shippingLog: {
    shippingLogId: string;
    status: string;
    estimatedDeliveryDate: Date | null;
    deliveredDate: Date | null;
  };
  shipper: {
    userId: string;
    fullName: string;
    phone: string;
  } | null;
  customer: {
    address: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  currentLocation: {
    lat: number;
    lng: number;
    timestamp: Date;
  } | null;
  eta: ETAResult | null;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  // Cache customer addresses để tránh geocode lại nhiều lần
  private customerAddresses: Map<string, { lat: number; lng: number }> = new Map();
  
  // Cache shipper locations từ REST API (in-memory, 5 phút expire)
  private shipperLocations: Map<string, { lat: number; lng: number; timestamp: Date; vehicle: string }> = new Map();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ShippingLog)
    private readonly shippingLogRepository: Repository<ShippingLog>,
    @Inject('TrackingGateway')
    private trackingGateway: TrackingGateway,
  ) {}

  /**
   * ️ Lấy địa chỉ khách hàng và convert thành tọa độ
   */
  async getCustomerLocation(orderId: string): Promise<{ lat: number; lng: number } | null> {
    // Check cache
    if (this.customerAddresses.has(orderId)) {
      return this.customerAddresses.get(orderId) || null;
    }

    // Lấy order để có shipping address
    const order = await this.orderRepository.findOne({
      where: { orderId },
      select: ['orderId', 'shippingAddress'],
    });

    if (!order || !order.shippingAddress) {
      this.logger.warn(`No shipping address found for order ${orderId}`);
      return null;
    }

    // Gọi Goong Geocoding API để convert address → coordinates
    const coordinates = await this.geocodeAddress(order.shippingAddress);
    
    if (coordinates) {
      // Cache lại để lần sau không phải gọi API
      this.customerAddresses.set(orderId, coordinates);
      return coordinates;
    }

    this.logger.warn(`Failed to geocode address for order ${orderId}: ${order.shippingAddress}`);
    return null;
  }

  /**
   * 🧮 Tính ETA và route bằng Goong Directions API v2
   * Vehicle types: car (ô tô), bike (xe đạp/xe máy)
   */
  async calculateETA(
    shipperLocation: { lat: number; lng: number },
    customerLocation: { lat: number; lng: number },
    vehicle: string = 'bike', // Default: bike (xe máy)
  ): Promise<ETAResult | null> {
    try {
      const GOONG_API_KEY = process.env.GOONG_API_KEY;

      if (!GOONG_API_KEY) {
        this.logger.warn('⚠️ GOONG_API_KEY not configured');
        return null;
      }

      // 🚀 Gọi Goong Directions API v2
      const directionsUrl = 'https://rsapi.goong.io/v2/direction';
      const directionsParams = {
        origin: `${shipperLocation.lat},${shipperLocation.lng}`,
        destination: `${customerLocation.lat},${customerLocation.lng}`,
        vehicle: vehicle, // car, bike
        api_key: GOONG_API_KEY,
      };

      this.logger.debug(`Calculating route with vehicle=${vehicle}: ${JSON.stringify(directionsParams)}`);

      const response = await axios.get(directionsUrl, { params: directionsParams });

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        // Lấy polyline encoded string
        const polyline = route.overview_polyline?.points || null;

        const distance = leg.distance.value; // meters
        const duration = leg.duration.value; // seconds
        const durationText = leg.duration.text; // "30 phút"

        this.logger.log(
          `✅ Route calculated [${vehicle}]: ${durationText} (${(distance / 1000).toFixed(2)} km), polyline: ${polyline ? 'YES' : 'NO'}`,
        );

        // Convert duration to readable text (fallback)
        const minutes = Math.ceil(duration / 60);
        const text = durationText || (minutes < 60 
          ? `${minutes} phút` 
          : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`);

        return {
          distance,
          duration,
          text,
          polyline, // ✅ Trả về polyline string
        };
      }

      this.logger.warn('No routes found from Directions API');
      return null;
    } catch (error) {
      this.logger.error(`Error calculating route: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * 🗺️ Geocode address thành coordinates (Goong API V2)
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const GOONG_API_KEY = process.env.GOONG_API_KEY;

      if (!GOONG_API_KEY) {
        this.logger.warn('⚠️ GOONG_API_KEY not configured');
        return null;
      }

      // Goong Geocoding API V2
      const url = 'https://rsapi.goong.io/v2/geocode';
      const response = await axios.get(url, {
        params: {
          address: address,
          api_key: GOONG_API_KEY,
        },
      });

      if (response.data.status === 'OK' && 
          response.data.results && 
          response.data.results.length > 0) {
        
        const firstResult = response.data.results[0];
        const location = firstResult.geometry.location;
        
        this.logger.log(
          `✅ Geocoded "${address}" → ${location.lat}, ${location.lng}`,
        );

        return {
          lat: location.lat,
          lng: location.lng,
        };
      }

      this.logger.warn(`No results found for address: ${address}`);
      return null;
    } catch (error) {
      this.logger.error(`Error geocoding address "${address}": ${error.message}`);
      return null;
    }
  }

  /**
   * Cache shipper location for tracking
   */
  async cacheShipperLocation(
    orderId: string,
    location: { lat: number; lng: number },
    vehicle: string = 'bike',
  ): Promise<void> {
    this.shipperLocations.set(orderId, {
      lat: location.lat,
      lng: location.lng,
      timestamp: new Date(),
      vehicle: vehicle,
    });

    this.logger.log(
      `📍 Cached shipper location for order ${orderId}: ${location.lat}, ${location.lng}, vehicle: ${vehicle}`,
    );

    // Auto-expire after 5 minutes
    setTimeout(() => {
      this.shipperLocations.delete(orderId);
      this.logger.log(`🗑️ Expired cached location for order ${orderId}`);
    }, 5 * 60 * 1000);
  }

  /**
   * Get comprehensive tracking info for customer
   */
  async getTrackingInfo(orderId: string): Promise<TrackingInfo | null> {
    try {
      this.logger.log(`🔍 Getting tracking info for order: ${orderId}`);
      
      // Find active shipping log with relations
      const shippingLog = await this.shippingLogRepository.findOne({
        where: {
          orderId,
          status: In([
            'PICKED_UP',
            'IN_TRANSIT',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
          ]),
        },
        relations: ['order', 'order.customer', 'order.customer.user', 'shippingStaff'],
      });

      if (!shippingLog) {
        this.logger.warn(`No active shipping log found for order ${orderId}`);
        return null;
      }

      this.logger.log(`📦 Found shipping log: ${shippingLog.shippingLogId}, status: ${shippingLog.status}`);

      // Build shipper info
      let shipperInfo: { userId: string; fullName: string; phone: string } | null = null;
      if (shippingLog.shippingStaff) {
        shipperInfo = {
          userId: shippingLog.shippingStaff.userId,
          fullName: shippingLog.shippingStaff.fullName,
          phone: shippingLog.shippingStaff.phone,
        };
        this.logger.log(`👤 Shipper: ${shipperInfo.fullName} (${shipperInfo.userId})`);
      }

      // Get cached shipper location (only if within 5 minutes)
      this.logger.log(`📍 Checking cache... Total cached locations: ${this.shipperLocations.size}`);
      this.logger.log(`📍 Cache keys: ${Array.from(this.shipperLocations.keys()).join(', ')}`);
      
      const cachedLocation = this.shipperLocations.get(orderId);
      let currentLocation: { lat: number; lng: number; timestamp: Date } | null = null;
      
      if (cachedLocation) {
        const ageMinutes =
          (Date.now() - cachedLocation.timestamp.getTime()) / 1000 / 60;
        this.logger.log(`📍 Found cached location, age: ${ageMinutes.toFixed(2)} minutes`);
        
        if (ageMinutes <= 5) {
          currentLocation = {
            lat: cachedLocation.lat,
            lng: cachedLocation.lng,
            timestamp: cachedLocation.timestamp,
          };
          this.logger.log(`✅ Using cached location: ${currentLocation.lat}, ${currentLocation.lng}`);
        } else {
          this.logger.log(
            `⏰ Cached location for order ${orderId} is stale (${ageMinutes.toFixed(1)} min old)`,
          );
        }
      } else {
        this.logger.log(`❌ No cached location found for order ${orderId}`);
      }

      // Get customer location
      const customerLocation = await this.getCustomerLocation(orderId);

      // Build customer info
      const customerInfo = {
        address: shippingLog.order.shippingAddress || 'N/A',
        location: customerLocation || { lat: 0, lng: 0 },
      };

      // Calculate ETA if we have both locations
      let eta: ETAResult | null = null;
      if (currentLocation && customerLocation) {
        const vehicle = cachedLocation?.vehicle || 'bike'; // Lấy vehicle từ cache
        eta = await this.calculateETA(
          { lat: currentLocation.lat, lng: currentLocation.lng },
          customerLocation,
          vehicle, // ✅ Truyền vehicle type
        );
      }

      // Build comprehensive tracking info
      const trackingInfo: TrackingInfo = {
        orderId: shippingLog.orderId,
        shippingLog: {
          shippingLogId: shippingLog.shippingLogId,
          status: shippingLog.status,
          estimatedDeliveryDate: shippingLog.estimatedDeliveryDate,
          deliveredDate: shippingLog.deliveredDate,
        },
        shipper: shipperInfo,
        customer: customerInfo,
        currentLocation: currentLocation,
        eta: eta,
      };

      this.logger.log(
        `📦 Retrieved tracking info for order ${orderId}: ${shippingLog.status}, ETA: ${eta ? eta.text : 'N/A'}`,
      );

      return trackingInfo;
    } catch (error) {
      this.logger.error(
        `Error getting tracking info for order ${orderId}: ${error.message}`,
      );
      return null;
    }
  }
}

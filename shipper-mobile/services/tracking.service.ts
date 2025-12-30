import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';

interface LocationUpdate {
  orderId: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface ETAData {
  orderId: string;
  eta: {
    distance: number; // meters
    duration: number; // seconds
    text: string;
  };
  timestamp: string;
}

interface StatusChangeData {
  orderId: string;
  status: string;
  message: string;
  timestamp: string;
}

interface JoinRoomData {
  orderId: string;
  role: 'shipper' | 'customer';
}

class TrackingService {
  private socket: Socket | null = null;
  private locationInterval: ReturnType<typeof setInterval> | null = null;
  private currentOrderId: string | null = null;
  private backendUrl: string;
  private accessToken: string = '';

  constructor() {
    // Get backend URL from env
    this.backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'ws://localhost:3000';
    // Socket.IO handles protocol conversion internally, keep http/https
  }

  /**
   * Set access token for authentication
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Connect to tracking WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Simple connection like your test
        this.socket = io(`${this.backendUrl}/tracking`, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          auth: {
            token: `Bearer ${this.accessToken}`,
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to tracking server');
          console.log('Socket ID:', this.socket?.id);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error.message);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected:', reason);
          this.stopSendingLocation();
        });

        // Listen for ETA updates
        this.socket.on('updateETA', (data: ETAData) => {
          console.log('📍 ETA Update:', data);
          // Emit event for UI to listen
          this.emitETAUpdate(data);
        });

        // Listen for status changes
        this.socket.on('statusChanged', (data: StatusChangeData) => {
          console.log('📦 Status Changed:', data);
          this.emitStatusChange(data);
        });

      } catch (error) {
        console.error('Failed to create socket:', error);
        reject(error);
      }
    });
  }

  /**
   * Join tracking room for an order
   */
  async joinRoom(orderId: string, role: 'shipper' | 'customer' = 'shipper'): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.currentOrderId = orderId;

      const data: JoinRoomData = {
        orderId,
        role,
      };

      this.socket?.emit('joinRoom', data);

      this.socket?.once('joinedRoom', (response) => {
        console.log('✅ Joined room:', response);
        resolve();
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);
    });
  }

  /**
   * Start sending location updates every 5 seconds
   */
  async startSendingLocation(orderId: string): Promise<void> {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Stop any existing interval
    this.stopSendingLocation();

    // Send location immediately
    await this.sendCurrentLocation(orderId);

    // Then send every 5 seconds
    this.locationInterval = setInterval(async () => {
      await this.sendCurrentLocation(orderId);
    }, 5000);

    console.log('📍 Started sending location updates');
  }

  /**
   * Send current location to server
   */
  private async sendCurrentLocation(orderId: string): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const data: LocationUpdate = {
        orderId,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
      };

      this.socket?.emit('updateLocation', data);
      console.log('📍 Location sent:', data.location);

    } catch (error) {
      console.error('Failed to get location:', error);
    }
  }

  /**
   * Stop sending location updates
   */
  stopSendingLocation(): void {
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
      console.log('⏹️  Stopped sending location');
    }
  }

  /**
   * Leave tracking room
   */
  leaveRoom(orderId: string): void {
    if (this.socket) {
      this.socket.emit('leaveRoom', { orderId });
      console.log('👋 Left room:', orderId);
    }
    this.stopSendingLocation();
    this.currentOrderId = null;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopSendingLocation();
    if (this.currentOrderId) {
      this.leaveRoom(this.currentOrderId);
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Disconnected from tracking server');
    }
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Listen for ETA updates
   */
  onETAUpdate(callback: (data: ETAData) => void): void {
    this.socket?.on('updateETA', callback);
  }

  /**
   * Listen for status changes
   */
  onStatusChange(callback: (data: StatusChangeData) => void): void {
    this.socket?.on('statusChanged', callback);
  }

  /**
   * Remove listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  /**
   * Emit ETA update event (for React components to listen)
   */
  private emitETAUpdate(data: ETAData): void {
    // You can use EventEmitter or React Context here
    // For now, just log it
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(data: StatusChangeData): void {
    // You can use EventEmitter or React Context here
  }
}

export default new TrackingService();

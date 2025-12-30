import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import trackingService, { TrackingData } from '@/services/trackingService';
import tokenService from '@/services/tokenService';
import config from '@/config/env';

interface UseOrderTrackingWebSocketOptions {
  orderId: string;
  enabled?: boolean;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onETAUpdate?: (eta: { distance: number; duration: number; text: string }) => void;
}

export function useOrderTrackingWebSocket({
  orderId,
  enabled = true,
  onLocationUpdate,
  onETAUpdate,
}: UseOrderTrackingWebSocketOptions) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const isFirstLoad = useRef(true);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onETAUpdateRef = useRef(onETAUpdate);

  // Update refs when callbacks change
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onETAUpdateRef.current = onETAUpdate;
  }, [onLocationUpdate, onETAUpdate]);

  // Initial fetch via REST API (one-time unless manual refresh or fallback polling)
  const fetchInitialTracking = useCallback(async () => {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error('Vui lòng đăng nhập để xem thông tin giao hàng');
      }

      (`🔍 [ONE-TIME] Fetching initial tracking for order: ${orderId}`);
      const data = await trackingService.getOrderTracking(orderId, token);

      // Helpful debug payload
      ('📦 Backend tracking data:');
      ('  - Order ID:', data.orderId);
      ('  - Shipper location:', data.currentLocation);
      ('  - Customer location:', data.customer?.location);
      ('  - Customer address:', data.customer?.address);
      ('  - Has ETA:', !!data.eta);
      ('  - Full data:', JSON.stringify(data, null, 2));

      setTrackingData(data);
      setError(null);
      setIsLoading(false);
      setLastUpdate(new Date());

      if (data.currentLocation && onLocationUpdateRef.current) {
        onLocationUpdateRef.current({
          lat: data.currentLocation.lat,
          lng: data.currentLocation.lng,
        });
      }

      if (data.eta && onETAUpdateRef.current) {
        onETAUpdateRef.current(data.eta);
      }

      ('✅ Initial tracking data loaded');
      isFirstLoad.current = false;
    } catch (err: any) {
      console.error('❌ Error fetching initial tracking:', err);
      const errorMessage = err.message || 'Shipper chưa chuẩn bị giao hàng. Vui lòng kiểm tra lại sau.';
      setError(errorMessage);
      if (isFirstLoad.current) setIsLoading(false);
    }
  }, [orderId]); // ONLY orderId in dependencies

  // Setup WebSocket connection (run once per mount for the given order)
  useEffect(() => {
    if (!enabled || !orderId) return;

    let isMounted = true;

    const setupWebSocket = async () => {
      try {
        const token = await tokenService.getToken();
        if (!token) {
          setError('Vui lòng đăng nhập để xem thông tin giao hàng');
          setIsLoading(false);
          return;
        }

        // Fetch initial data once
        if (isMounted) await fetchInitialTracking();

        // Connect socket
        ('🔌 Connecting to tracking WebSocket...');
        const socket = io(`${config.WEBSOCKET_URL}/tracking`, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          auth: { token: `Bearer ${token}` },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        if (!isMounted) {
          socket.disconnect();
          return;
        }

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
          ('✅ WebSocket connected');
          setIsConnected(true);
          setError(null);

          // Join room - send orderId as string directly
          socket.emit('joinRoom', orderId);
          (`📍 Joined tracking room for order: ${orderId}`);
        });

        socket.on('disconnect', (reason: any) => {
          ('❌ WebSocket disconnected:', reason);
          setIsConnected(false);
          // socket.io will try reconnect automatically according to options
        });

        socket.on('connect_error', (err: any) => {
          console.error('❌ WebSocket connect_error:', err);
          setIsConnected(false);
        });

        // Real-time events
        socket.on('shipperMoved', (data: any) => {
          ('📍 shipperMoved', data);
          setTrackingData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              currentLocation: {
                lat: data.location.lat,
                lng: data.location.lng,
                timestamp: data.timestamp,
              },
            };
          });
          setLastUpdate(new Date());
          if (onLocationUpdateRef.current) onLocationUpdateRef.current({ lat: data.location.lat, lng: data.location.lng });
        });

        socket.on('updateETA', (data: any) => {
          ('⏱️ updateETA', data);
          setTrackingData(prev => (prev ? { ...prev, eta: data.eta } : prev));
          setLastUpdate(new Date());
          if (onETAUpdateRef.current) onETAUpdateRef.current(data.eta);
        });

        socket.on('statusChanged', (data: any) => {
          ('🔄 statusChanged', data);
          setTrackingData(prev => {
            if (!prev) return prev;
            return { ...prev, shippingLog: { ...prev.shippingLog, status: data.status } };
          });
          setLastUpdate(new Date());
        });

        socket.on('trackingUpdate', (data: any) => {
          ('🔄 trackingUpdate', data);
          setTrackingData(data);
          setLastUpdate(new Date());
        });

        socket.on('error', (err: any) => {
          console.error('❌ WebSocket error:', err);
          setError(err?.message || 'Lỗi kết nối WebSocket');
        });

      } catch (err: any) {
        console.error('❌ Error setting up WebSocket:', err);
        setError(err.message || 'Không thể thiết lập kết nối real-time');
        setIsLoading(false);
      }
    };

    setupWebSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.emit('leaveRoom', orderId);
          socketRef.current.disconnect();
        } catch (e) {
          /* ignore */
        }
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [orderId, enabled, fetchInitialTracking]); // fetchInitialTracking is now stable (only depends on orderId)

  // Stale-location detection (older than LOCATION_CACHE_DURATION)
  const isLocationStale = useMemo(() => {
    if (!trackingData || !trackingData.currentLocation || !trackingData.currentLocation.timestamp) return false;
    const ts = new Date(trackingData.currentLocation.timestamp).getTime();
    const ageMs = Date.now() - ts;
    return ageMs > (config.LOCATION_CACHE_DURATION || 300000);
  }, [trackingData]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchInitialTracking();
  }, [fetchInitialTracking]);

  const shouldTrack = trackingData ? trackingService.shouldTrack(trackingData.shippingLog.status) : false;

  return {
    trackingData,
    isLoading,
    error,
    lastUpdate,
    refresh,
    shouldTrack,
    isConnected,
    isLocationStale,
  };
}

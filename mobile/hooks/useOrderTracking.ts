import { useState, useEffect, useRef, useCallback } from 'react';
import trackingService, { TrackingData } from '@/services/trackingService';
import tokenService from '@/services/tokenService';
import config from '@/config/env';

interface UseOrderTrackingOptions {
  orderId: string;
  enabled?: boolean;
  intervalMs?: number;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onETAUpdate?: (eta: { distance: number; duration: number; text: string }) => void;
}

export function useOrderTracking({
  orderId,
  enabled = true,
  intervalMs = config.TRACKING_POLL_INTERVAL,
  onLocationUpdate,
  onETAUpdate,
}: UseOrderTrackingOptions) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstLoad = useRef(true);

  const fetchTracking = useCallback(async () => {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error('Vui lòng đăng nhập để xem thông tin giao hàng');
      }

      (`🔍 Fetching tracking for order: ${orderId}`);
      const data = await trackingService.getOrderTracking(orderId, token);
      
      setTrackingData(data);
      setError(null);
      setIsLoading(false);
      setLastUpdate(new Date());

      // Callbacks for location and ETA updates
      if (data.currentLocation && onLocationUpdate) {
        onLocationUpdate({
          lat: data.currentLocation.lat,
          lng: data.currentLocation.lng,
        });
      }

      if (data.eta && onETAUpdate) {
        onETAUpdate(data.eta);
      }

      ('✅ Tracking data updated:', {
        status: data.shippingLog.status,
        hasShipper: !!data.shipper,
        hasLocation: !!data.currentLocation,
        hasETA: !!data.eta,
      });

      isFirstLoad.current = false;
    } catch (err: any) {
      console.error('❌ Error fetching tracking:', err);
      
      // User-friendly error message
      const errorMessage = err.message || 'Shipper chưa chuẩn bị giao hàng. Vui lòng kiểm tra lại sau.';
      setError(errorMessage);
      
      // Only set loading to false on first load error
      if (isFirstLoad.current) {
        setIsLoading(false);
      }
    }
  }, [orderId, onLocationUpdate, onETAUpdate]);

  useEffect(() => {
    if (!enabled || !orderId) {
      ('⏸️ Tracking disabled or no orderId');
      return;
    }

    // Fetch immediately
    fetchTracking();

    // Then poll at intervals
    intervalRef.current = setInterval(() => {
      (`🔄 Polling tracking (interval: ${intervalMs}ms)`);
      fetchTracking();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        ('🛑 Stopping tracking polling');
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId, enabled, intervalMs, fetchTracking]);

  const refresh = useCallback(() => {
    ('🔄 Manual refresh tracking');
    setIsLoading(true);
    fetchTracking();
  }, [fetchTracking]);

  const shouldTrack = trackingData 
    ? trackingService.shouldTrack(trackingData.shippingLog.status)
    : false;

  return {
    trackingData,
    isLoading,
    error,
    lastUpdate,
    refresh,
    shouldTrack,
  };
}

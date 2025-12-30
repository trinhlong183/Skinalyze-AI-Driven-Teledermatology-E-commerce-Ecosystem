import TrackingService from '@/services/tracking.service';
import { useCallback, useEffect, useState } from 'react';

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

interface UseTrackingOptions {
  orderId: string;
  autoStart?: boolean; // Auto start tracking when component mounts
  onETAUpdate?: (data: ETAData) => void;
  onStatusChange?: (data: StatusChangeData) => void;
}

export function useTracking({
  orderId,
  autoStart = false,
  onETAUpdate,
  onStatusChange,
}: UseTrackingOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [eta, setEta] = useState<ETAData['eta'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      
      // Connect to server if not connected
      if (!TrackingService.isConnected()) {
        await TrackingService.connect();
        setIsConnected(true);
      }

      // Join tracking room
      await TrackingService.joinRoom(orderId, 'shipper');

      // Start sending location
      await TrackingService.startSendingLocation(orderId);
      setIsTracking(true);

      console.log('✅ Tracking started for order:', orderId);
    } catch (err: any) {
      console.error('Failed to start tracking:', err);
      setError(err.message || 'Failed to start tracking');
      setIsTracking(false);
    }
  }, [orderId]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    TrackingService.stopSendingLocation();
    TrackingService.leaveRoom(orderId);
    setIsTracking(false);
    console.log('⏹️  Tracking stopped for order:', orderId);
  }, [orderId]);

  // Setup listeners
  useEffect(() => {
    const handleETAUpdate = (data: ETAData) => {
      if (data.orderId === orderId) {
        setEta(data.eta);
        onETAUpdate?.(data);
      }
    };

    const handleStatusChange = (data: StatusChangeData) => {
      if (data.orderId === orderId) {
        onStatusChange?.(data);
        // Auto stop tracking if order is completed
        if (data.status === 'DELIVERED' || data.status === 'CANCELLED' || data.status === 'RETURNED') {
          stopTracking();
        }
      }
    };

    TrackingService.onETAUpdate(handleETAUpdate);
    TrackingService.onStatusChange(handleStatusChange);

    return () => {
      TrackingService.off('updateETA', handleETAUpdate);
      TrackingService.off('statusChanged', handleStatusChange);
    };
  }, [orderId, onETAUpdate, onStatusChange, stopTracking]);

  // Auto start tracking
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [autoStart, startTracking, stopTracking, isTracking]);

  return {
    isConnected,
    isTracking,
    eta,
    error,
    startTracking,
    stopTracking,
  };
}

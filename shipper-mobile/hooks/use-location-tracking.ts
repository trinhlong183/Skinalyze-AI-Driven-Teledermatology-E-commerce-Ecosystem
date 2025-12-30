import LocationTrackingAPI, { ETAData, VehicleType } from '@/services/location-tracking.api';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

interface UseLocationTrackingOptions {
  orderId: string;
  enabled?: boolean;
  intervalMs?: number;
  vehicle?: VehicleType; // Loại phương tiện
  onETAUpdate?: (eta: ETAData | null) => void;
}

interface UseLocationTrackingReturn {
  isTracking: boolean;
  currentLocation: { lat: number; lng: number } | null;
  currentETA: ETAData | null;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

/**
 * Hook to track and send shipper location to backend
 * Backend automatically calculates and returns ETA with each location update
 */
export function useLocationTracking({
  orderId,
  enabled = false,
  intervalMs = 5000,
  vehicle = 'bike', // Mặc định là bike
  onETAUpdate,
}: UseLocationTrackingOptions): UseLocationTrackingReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentETA, setCurrentETA] = useState<ETAData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    try {
      setError(null);

      console.log('🔐 ===== REQUESTING LOCATION PERMISSION =====');
      
      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();
      console.log('📱 Current permission status:', currentStatus.status);
      console.log('🔍 Can ask again?', currentStatus.canAskAgain);
      
      // Request permissions
      console.log('🙏 Requesting foreground location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('✅ Permission result:', status);
      
      if (status !== 'granted') {
        console.error('❌ Location permission DENIED:', status);
        throw new Error('Location permission not granted');
      }

      console.log('✅ Permission GRANTED! Getting current location...');

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('📍 Initial location obtained:', {
        lat: initialLocation.coords.latitude,
        lng: initialLocation.coords.longitude,
        accuracy: initialLocation.coords.accuracy,
      });

      const location = {
        lat: initialLocation.coords.latitude,
        lng: initialLocation.coords.longitude,
      };
      setCurrentLocation(location);

      // Send initial location and get ETA
      const response = await LocationTrackingAPI.sendLocation({
        orderId,
        ...location,
        vehicle, // Gửi loại phương tiện
      });

      // Update ETA from response
      if (response.eta) {
        setCurrentETA(response.eta);
        onETAUpdate?.(response.eta);
        console.log('⏱️ Initial ETA:', response.eta.text);
      }

      // Start watching location
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 10, // Update every 10 meters
        },
        async (locationUpdate) => {
          const newLocation = {
            lat: locationUpdate.coords.latitude,
            lng: locationUpdate.coords.longitude,
          };
          setCurrentLocation(newLocation);

          // Send location to backend and get ETA
          try {
            const response = await LocationTrackingAPI.sendLocation({
              orderId,
              ...newLocation,
              vehicle, // Gửi loại phương tiện
            });

            // Update ETA from response
            if (response.eta) {
              setCurrentETA(response.eta);
              onETAUpdate?.(response.eta);
            }
          } catch (err) {
            console.error('Error sending location update:', err);
          }
        }
      );

      setIsTracking(true);
      console.log('✅ Started location tracking for order:', orderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      console.error('❌ Error starting location tracking:', err);
    }
  };

  const stopTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsTracking(false);
    console.log('🛑 Stopped location tracking');
  };

  // Auto-start if enabled
  useEffect(() => {
    if (enabled && orderId) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, orderId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    isTracking,
    currentLocation,
    currentETA,
    error,
    startTracking,
    stopTracking,
  };
}

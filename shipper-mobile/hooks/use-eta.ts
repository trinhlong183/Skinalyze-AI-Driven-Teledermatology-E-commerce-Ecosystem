import { ETAData } from '@/services/location-tracking.api';
import { useState } from 'react';

interface ETADisplayData {
  distance: number; // meters
  duration: number; // seconds
  text: string; // e.g., "19 phút"
}

interface UseETAOptions {
  orderId: string;
  enabled?: boolean;
}

interface UseETAReturn {
  eta: ETADisplayData | null;
  loading: boolean;
  error: string | null;
  updateETA: (etaData: ETAData | null) => void;
}

/**
 * Hook to manage ETA state
 * ETA data comes from location updates (POST /tracking/location response)
 * No longer calls separate API endpoint
 */
export function useETA({
  orderId,
  enabled = false,
}: UseETAOptions): UseETAReturn {
  const [eta, setETA] = useState<ETADisplayData | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const updateETA = (etaData: ETAData | null) => {
    if (!enabled || !orderId) {
      return;
    }

    if (etaData) {
      setETA({
        distance: etaData.distance,
        duration: etaData.duration,
        text: etaData.text,
      });
      console.log('⏱️ ETA updated:', etaData.text);
    } else {
      setETA(null);
      console.warn('⚠️ ETA is null from backend');
    }
  };

  return {
    eta,
    loading,
    error,
    updateETA,
  };
}

import { useLocationTracking } from '@/hooks/use-location-tracking';
import { ETAData, VehicleType } from '@/services/location-tracking.api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface ETADisplayProps {
  orderId: string;
  enabled?: boolean;
  compact?: boolean;
  isTracking?: boolean; // Whether location tracking is active
  vehicle?: VehicleType; // Loại phương tiện
}

/**
 * ETA Display Component
 * Shows estimated time and distance to destination
 * ETA data comes from location tracking (POST /tracking/location response)
 */
export default function ETADisplay({ 
  orderId, 
  enabled = true,
  compact = false,
  isTracking = true, // Default to true - will auto-track when enabled
  vehicle = 'bike', // Mặc định là bike
}: ETADisplayProps) {
  const [displayETA, setDisplayETA] = useState<ETAData | null>(null);

  // Track location to get ETA updates
  const { currentETA, isTracking: actuallyTracking } = useLocationTracking({
    orderId,
    enabled: enabled, // Just use enabled directly
    intervalMs: 10000, // Update every 10 seconds
    vehicle, // Truyền vehicle type
    onETAUpdate: (etaData) => {
      if (etaData) {
        setDisplayETA(etaData);
        console.log('📍 ETADisplay - ETA updated:', etaData.text, `(${(etaData.distance/1000).toFixed(1)} km)`);
      } else {
        console.warn('⚠️ ETADisplay - ETA is null from backend');
      }
    },
  });

  useEffect(() => {
    if (currentETA) {
      console.log('📊 ETADisplay - currentETA changed:', currentETA);
      setDisplayETA(currentETA);
    }
  }, [currentETA]);

  useEffect(() => {
    console.log('🔍 ETADisplay mounted:', { orderId, enabled, actuallyTracking, hasETA: !!displayETA });
  }, []);

  if (!enabled) {
    console.log('⏸️ ETADisplay - disabled');
    return null;
  }

  if (!displayETA) {
    console.log('⏳ ETADisplay - no ETA yet, showing loading...');
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color="#42A5F5" />
        <Text style={styles.loadingText}>Đang tính toán...</Text>
      </View>
    );
  }

  console.log('✅ ETADisplay - rendering with ETA:', displayETA);

  if (compact) {
    return (
      <View style={styles.containerCompact}>
        <View style={styles.etaItemCompact}>
          <Ionicons name="time-outline" size={16} color="#42A5F5" />
          <Text style={styles.etaTextCompact}>{displayETA.text}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.etaItemCompact}>
          <Ionicons name="navigate-outline" size={16} color="#42A5F5" />
          <Text style={styles.etaTextCompact}>
            {(displayETA.distance / 1000).toFixed(1)} km
          </Text>
        </View>
      </View>
    );
  }

  // Calculate estimated arrival time
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + displayETA.duration * 1000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color="#42A5F5" />
        <Text style={styles.title}>Thời gian dự kiến</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.etaItem}>
          <Text style={styles.etaLabel}>Thời gian còn lại:</Text>
          <Text style={styles.etaValue}>{displayETA.text}</Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaLabel}>Khoảng cách:</Text>
          <Text style={styles.etaValue}>
            {(displayETA.distance / 1000).toFixed(1)} km
          </Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaLabel}>Dự kiến đến lúc:</Text>
          <Text style={[styles.etaValue, styles.arrivalTime]}>{arrivalTimeStr}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center horizontally
    gap: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    gap: 8,
  },
  etaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  etaItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaLabel: {
    fontSize: 14,
    color: '#666',
  },
  etaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  etaTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  arrivalTime: {
    color: '#42A5F5',
    fontSize: 16,
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0E0',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF5350',
    marginLeft: 6,
  },
  refreshing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  refreshingText: {
    fontSize: 12,
    color: '#999',
  },
});

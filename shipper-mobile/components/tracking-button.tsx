import { useTracking } from '@/hooks/use-tracking';
import { Order } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TrackingButtonProps {
  order: Order;
  onETAUpdate?: (eta: any) => void;
}

export default function TrackingButton({ order, onETAUpdate }: TrackingButtonProps) {
  const { isTracking, isConnected, eta, error, startTracking, stopTracking } = useTracking({
    orderId: order.orderId,
    autoStart: false,
    onETAUpdate: (data) => {
      onETAUpdate?.(data.eta);
    },
  });

  // Only show for orders that are being delivered
  if (order.status !== 'picking' && order.status !== 'delivering') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Tracking Button */}
      <TouchableOpacity
        style={[
          styles.button,
          isTracking ? styles.buttonActive : styles.buttonInactive,
        ]}
        onPress={isTracking ? stopTracking : startTracking}
        disabled={!isConnected && !isTracking}
      >
        {!isConnected && !isTracking ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={isTracking ? 'location' : 'location-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.buttonText}>
              {isTracking ? 'Đang theo dõi' : 'Bắt đầu theo dõi'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ETA Display */}
      {isTracking && eta && (
        <View style={styles.etaContainer}>
          <Ionicons name="time-outline" size={16} color="#42A5F5" />
          <Text style={styles.etaText}>
            Còn {eta.text} • {(eta.distance / 1000).toFixed(1)} km
          </Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={16} color="#EF5350" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#66BB6A',
  },
  buttonInactive: {
    backgroundColor: '#42A5F5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  etaText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '500',
  },
});

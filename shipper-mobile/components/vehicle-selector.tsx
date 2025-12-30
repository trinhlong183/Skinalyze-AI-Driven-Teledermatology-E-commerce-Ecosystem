import { VehicleType } from '@/services/location-tracking.api';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VehicleSelectorProps {
  selectedVehicle: VehicleType;
  onVehicleChange: (vehicle: VehicleType) => void;
  disabled?: boolean;
}

/**
 * Vehicle Selector Component
 * Cho phép shipper chọn loại phương tiện (bike hoặc car)
 */
export default function VehicleSelector({
  selectedVehicle,
  onVehicleChange,
  disabled = false,
}: VehicleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phương tiện:</Text>
      
      <View style={styles.buttonGroup}>
        {/* Bike Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedVehicle === 'bike' && styles.buttonActive,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => !disabled && onVehicleChange('bike')}
          disabled={disabled}
        >
          <Ionicons
            name="bicycle"
            size={20}
            color={selectedVehicle === 'bike' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.buttonText,
              selectedVehicle === 'bike' && styles.buttonTextActive,
            ]}
          >
            Xe máy
          </Text>
        </TouchableOpacity>

        {/* Car Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedVehicle === 'car' && styles.buttonActive,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => !disabled && onVehicleChange('car')}
          disabled={disabled}
        >
          <Ionicons
            name="car"
            size={20}
            color={selectedVehicle === 'car' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.buttonText,
              selectedVehicle === 'car' && styles.buttonTextActive,
            ]}
          >
            Ô tô
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  buttonTextActive: {
    color: '#fff',
  },
});

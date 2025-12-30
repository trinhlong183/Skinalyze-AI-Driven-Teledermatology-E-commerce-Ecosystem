import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import CustomAlert from '@/components/CustomAlert'; // Import CustomAlert

interface FacialSkinCameraProps {
  // Update type to allow Promise so we can wait for analysis to finish
  onCapture?: (imageUri: string) => Promise<void> | void; 
  onClose: () => void;
  initialFacing?: 'front' | 'back';
  title?: string;
}

export default function FacialSkinCamera({ 
  onCapture, 
  onClose, 
  initialFacing = 'front',
  title = 'Position your face in the frame'
}: FacialSkinCameraProps) {
  const [facing] = useState<CameraType>(initialFacing);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };
  
  const theme = useThemeColor ? useThemeColor() : { primaryColor: '#007AFF' };
  const primaryColor = theme.primaryColor || '#007AFF';

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Camera not ready',
        type: 'error',
        onConfirm: hideAlert
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!photo) {
        throw new Error('Failed to capture image');
      }

      if (onCapture) {
        // IMPORTANT: Await the parent function. 
        // This keeps the spinner active while analysis happens,
        // and ensures we hit the finally block afterwards.
        await onCapture(photo.uri);
      }

    } catch (error: any) {
      console.error('Error taking picture:', error);
      // Show alert if analysis fails or capture fails
      setAlertConfig({
        visible: true,
        title: 'Capture Failed',
        message: error.message || 'An unexpected error occurred.',
        type: 'error',
        onConfirm: hideAlert
      });
    } finally {
      // CRITICAL FIX: This ensures the button stops spinning 
      // regardless of whether the analysis succeeded or failed.
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      />
      
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Scan Frame Guide */}
        <View style={styles.scanGuideContainer}>
          <View style={styles.scanGuide}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
            onPress={takePicture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={primaryColor} />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Integrate Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText="OK"
      />
    </View>
  );
}

const CORNER_SIZE = 40;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50, // Adjusted for better safe area spacing
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  closeButton: {
    padding: 10,
    pointerEvents: 'auto',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  scanGuideContainer: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    width: '84%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuide: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 24,
    borderColor: '#fff',
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 24,
    borderColor: '#fff',
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 24,
    borderColor: '#fff',
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 24,
    borderColor: '#fff',
  },
  scanHint: {
    position: 'absolute',
    bottom: -30,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    pointerEvents: 'auto',
  },
  captureButtonDisabled: {
    opacity: 0.8,
    backgroundColor: '#e0e0e0',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  message: {
    textAlign: 'center',
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
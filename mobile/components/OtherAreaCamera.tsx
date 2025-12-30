import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
// Update the import path to where your CustomAlert file is located
import CustomAlert from '@/components/CustomAlert'; 

interface OtherAreaCameraProps {
  // Updated type to Promise<void> to ensure we can await the service call
  onCapture?: (imageUri: string) => Promise<void> | void; 
  onClose: () => void;
  title?: string;
}

export default function OtherAreaCamera({ 
  onCapture, 
  onClose,
  title = 'Hold the camera close for best image quality and detection accuracy'
}: OtherAreaCameraProps) {
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // State for Custom Alert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'error' | 'success' | 'warning' | 'info',
  });

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        title: 'Camera Error',
        message: 'Camera is not ready. Please try again.',
        type: 'error'
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
        // We await here so we can catch errors thrown by the Service
        await onCapture(photo.uri);
      }

    } catch (error: any) {
      console.error('Error taking picture or analyzing:', error);
      
      let errorTitle = 'Capture Failed';
      let errorMessage = 'An unexpected error occurred while processing the image.';
      let errorType: 'error' | 'warning' = 'error';

      // CHECK FOR SPECIFIC FACE DETECTION ERROR
      const errorString = error?.message || String(error);
      if (errorString.includes('No face detected')) {
        errorTitle = 'No Face Detected';
        errorMessage = 'We could not detect a face in this photo. Please ensure the face is clearly visible, well-lit, and centered in the frame.';
        errorType = 'warning'; // Warning is often friendlier for user-error instructions
      }

      setAlertConfig({
        visible: true,
        title: errorTitle,
        message: errorMessage,
        type: errorType
      });

    } finally {
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

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
            onPress={takePicture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Integrated Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={hideAlert}
        confirmText="Try Again"
      />
    </View>
  );
}

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
    paddingTop: 50,
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  closeButton: {
    padding: 4,
    pointerEvents: 'auto',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 20,
    flex: 1,
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
    opacity: 0.8, // Changed to 0.8 so the loader is visible clearly
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
import OrderService from '@/services/order.service';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Picture {
  uri: string;
  name: string;
  type: string;
}

export default function UploadPicturesScreen() {
  const params = useLocalSearchParams();
  const shippingLogId = params.id as string;

  const [pictures, setPictures] = useState<Picture[]>([]);
  const [uploading, setUploading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập camera');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    if (pictures.length >= 5) {
      Alert.alert('Đã đủ ảnh', 'Bạn chỉ có thể upload tối đa 5 ảnh');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPictures([
        ...pictures,
        {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg',
        },
      ]);
    }
  };

  const pickFromGallery = async () => {
    if (pictures.length >= 5) {
      Alert.alert('Đã đủ ảnh', 'Bạn chỉ có thể upload tối đa 5 ảnh');
      return;
    }

    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - pictures.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPictures = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: `photo_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
      }));
      setPictures([...pictures, ...newPictures].slice(0, 5));
    }
  };

  const removePicture = (index: number) => {
    setPictures(pictures.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (pictures.length === 0) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp hoặc chọn ít nhất 1 ảnh');
      return;
    }

    try {
      setUploading(true);

      console.log('📤 Uploading pictures:', pictures.length);
      await OrderService.uploadFinishedPictures(shippingLogId, pictures);

      Alert.alert(
        'Thành công',
        'Đã upload ảnh hoàn thành đơn hàng',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error uploading pictures:', error);
      Alert.alert('Lỗi', 'Không thể upload ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Chụp ảnh hoàn thành</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={24} color="#42A5F5" />
          <View style={styles.instructionText}>
            <Text style={styles.instructionTitle}>Hướng dẫn</Text>
            <Text style={styles.instructionBody}>
              Chụp ảnh bằng chứng đã giao hàng thành công (hàng đã đến tay khách, chữ ký, v.v.)
            </Text>
            <Text style={styles.instructionBody}>
              • Tối đa 5 ảnh{'\n'}
              • Ảnh rõ nét, đầy đủ thông tin
            </Text>
          </View>
        </View>

        {/* Picture Grid */}
        {pictures.length > 0 && (
          <View style={styles.pictureGrid}>
            {pictures.map((picture, index) => (
              <View key={index} style={styles.pictureItem}>
                <Image source={{ uri: picture.uri }} style={styles.pictureImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePicture(index)}
                >
                  <Ionicons name="close-circle" size={28} color="#EF5350" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {pictures.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có ảnh nào</Text>
            <Text style={styles.emptySubtext}>Chụp hoặc chọn ảnh từ thư viện</Text>
          </View>
        )}

        {/* Picture Count */}
        <Text style={styles.pictureCount}>
          {pictures.length}/5 ảnh
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={takePhoto}
            disabled={uploading}
          >
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={styles.actionButtonText}>Chụp ảnh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={pickFromGallery}
            disabled={uploading}
          >
            <Ionicons name="images" size={28} color="#fff" />
            <Text style={styles.actionButtonText}>Thư viện</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (pictures.length === 0 || uploading) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={pictures.length === 0 || uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadButtonText}>Đang upload...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>
                Hoàn thành và Upload ({pictures.length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionBody: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  pictureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  pictureItem: {
    width: '47%',
    aspectRatio: 1,
    position: 'relative',
  },
  pictureImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  pictureCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraButton: {
    backgroundColor: '#42A5F5',
  },
  galleryButton: {
    backgroundColor: '#66BB6A',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

import orderService from "@/services/order.service";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompleteBatchScreen() {
  const { batchCode } = useLocalSearchParams<{ batchCode: string }>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Lỗi", "Cần cấp quyền truy cập camera");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: false,
        });
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 10 - photos.length,
        });
      }

      if (!result.canceled) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        if (photos.length + newPhotos.length > 10) {
          Alert.alert("Thông báo", "Tối đa 10 ảnh");
          return;
        }
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chụp ít nhất 1 ảnh bằng chứng");
      return;
    }

    if (!batchCode) {
      Alert.alert("Lỗi", "Không tìm thấy mã batch");
      return;
    }

    Alert.alert(
      "Xác nhận",
      "Xác nhận đã hoàn thành tất cả đơn hàng trong batch này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setSubmitting(true);

              // Step 1: Upload photos to server and get URLs
              console.log("📤 Uploading batch completion photos...");
              const photoObjects = photos.map((uri, index) => ({
                uri,
                name: `batch-${batchCode}-proof-${index + 1}.jpg`,
                type: "image/jpeg",
              }));

              const uploadResult = await orderService.uploadBatchPhotos(
                batchCode,
                photoObjects
              );

              console.log("✅ Photos uploaded:", uploadResult);
              console.log("✅ Photo URLs:", uploadResult.urls);

              // Step 2: Complete batch with uploaded photo URLs
              const completionData = {
                completionPhotos: uploadResult.urls,
                completionNote:
                  note || "Đã hoàn thành giao tất cả đơn trong batch",
                codCollected: true, // You can add UI for this later
              };

              console.log("📤 Completing batch with data:", completionData);
              const completionResult = await orderService.completeBatch(
                batchCode,
                completionData
              );
              console.log("✅ Batch completion result:", completionResult);

              Alert.alert("Thành công", "Đã hoàn thành batch", [
                {
                  text: "OK",
                  onPress: () => {
                    router.back();
                    router.back(); // Go back to batch list
                  },
                },
              ]);
            } catch (error: any) {
              console.error("Error completing batch:", error);
              Alert.alert("Lỗi", error.message || "Không thể hoàn thành batch");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hoàn thành Batch</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Batch Info */}
        <View style={styles.infoCard}>
          <Ionicons name="layers" size={24} color="#2196F3" />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Mã Batch</Text>
            <Text style={styles.infoValue}>{batchCode}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.instructionText}>
            Chụp ảnh bằng chứng đã hoàn thành giao tất cả đơn hàng trong batch
            này
          </Text>
        </View>

        {/* Photo Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bằng chứng hoàn thành (Tối đa 10 ảnh)
          </Text>
          <Text style={styles.photoCount}>Đã chọn: {photos.length}/10</Text>

          {/* Photo Grid */}
          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF5350" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Upload Buttons */}
          {photos.length < 10 && (
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, styles.galleryButton]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Thư viện</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Note Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú (Tùy chọn)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Nhập ghi chú về quá trình giao batch..."
            placeholderTextColor="#999"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Xác nhận hoàn thành</Text>
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E3F2FD",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: "#F57C00",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  photoCount: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
  },
  galleryButton: {
    backgroundColor: "#9C27B0",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  noteInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

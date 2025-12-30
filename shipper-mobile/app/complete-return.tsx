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

export default function CompleteReturnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Lỗi", "Cần cấp quyền truy cập camera để chụp ảnh!");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh!");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
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
      Alert.alert("Thông báo", "Vui lòng chụp ít nhất 1 ảnh chứng minh");
      return;
    }

    if (!note.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập ghi chú về tình trạng hàng");
      return;
    }

    Alert.alert("Xác nhận", "Xác nhận đã nhận hàng trả về kho?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        onPress: async () => {
          try {
            setSubmitting(true);

            // Step 1: Upload photos
            console.log("📤 Uploading return completion photos...");
            const photoObjects = photos.map((uri, index) => ({
              uri,
              name: `return-${id}-proof-${index + 1}.jpg`,
              type: "image/jpeg",
            }));

            const uploadResult =
              await orderService.uploadReturnCompletionPhotos(
                id!,
                photoObjects
              );

            console.log("✅ Photos uploaded:", uploadResult);

            // Step 2: Complete return with photo URLs
            const completionData = {
              completionNote: note,
              returnCompletionPhotos: uploadResult.photoUrls,
            };

            console.log("📤 Completing return with data:", completionData);
            const result = await orderService.completeReturnRequest(
              id!,
              completionData
            );
            console.log("✅ Return completed:", result);

            Alert.alert("Thành công", "Đã hoàn thành xử lý trả hàng", [
              {
                text: "OK",
                onPress: () => {
                  router.back();
                  router.back(); // Go back to return requests list
                },
              },
            ]);
          } catch (error: any) {
            console.error("Error completing return:", error);
            Alert.alert(
              "Lỗi",
              error.message || "Không thể hoàn thành xử lý trả hàng"
            );
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Hoàn thành trả hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionRow}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.instructionTitle}>Hướng dẫn</Text>
          </View>
          <Text style={styles.instructionText}>
            • Chụp ảnh hàng trả về (tình trạng bao bì, sản phẩm)
          </Text>
          <Text style={styles.instructionText}>
            • Nhập ghi chú về tình trạng hàng khi nhận về
          </Text>
          <Text style={styles.instructionText}>
            • Xác nhận hoàn thành để cập nhật trạng thái
          </Text>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Ảnh chứng minh</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Bắt buộc</Text>
            </View>
          </View>

          {/* Photo Grid */}
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF5350" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Photo Buttons */}
            {photos.length < 10 && (
              <>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => pickImage(true)}
                >
                  <Ionicons name="camera" size={32} color="#4CAF50" />
                  <Text style={styles.addPhotoText}>Chụp ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={() => pickImage(false)}
                >
                  <Ionicons name="images" size={32} color="#4CAF50" />
                  <Text style={styles.addPhotoText}>Thư viện</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.photoHint}>Đã chọn {photos.length}/10 ảnh</Text>
        </View>

        {/* Note Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Ghi chú tình trạng hàng</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Bắt buộc</Text>
            </View>
          </View>

          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: Hàng nguyên vẹn, đúng như khách hàng mô tả..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          <Text style={styles.noteHint}>
            Mô tả chi tiết tình trạng hàng khi nhận về kho
          </Text>
        </View>

        {/* Preview Info */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Thông tin xác nhận</Text>
          <View style={styles.previewRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.previewText}>
              Cập nhật trạng thái: COMPLETED
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Ionicons name="cube" size={16} color="#4CAF50" />
            <Text style={styles.previewText}>ShippingLog: RETURNED</Text>
          </View>
          <View style={styles.previewRow}>
            <Ionicons name="time" size={16} color="#4CAF50" />
            <Text style={styles.previewText}>
              Thời gian: {new Date().toLocaleString("vi-VN")}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (submitting || photos.length === 0 || !note.trim()) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || photos.length === 0 || !note.trim()}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitButtonText}>Đang xử lý...</Text>
            </>
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
  instructionsCard: {
    backgroundColor: "#E3F2FD",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
  },
  instructionText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  requiredBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF5350",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4CAF50",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  photoHint: {
    marginTop: 12,
    fontSize: 12,
    color: "#999",
  },
  noteInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noteHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#999",
  },
  previewCard: {
    backgroundColor: "#E8F5E9",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: "#666",
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

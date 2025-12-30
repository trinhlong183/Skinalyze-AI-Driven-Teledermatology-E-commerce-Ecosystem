import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ghnService, { Ward } from "@/services/ghnService";

interface WardPickerProps {
  districtId: number | null;
  selectedWardCode: string;
  onWardSelect: (wardCode: string, wardName: string) => void;
  primaryColor: string;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

export const WardPicker: React.FC<WardPickerProps> = ({
  districtId,
  selectedWardCode,
  onWardSelect,
  primaryColor,
  disabled = false,
  placeholder = "Chọn Phường/Xã",
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedWard = wards.find((w) => w.WardCode === selectedWardCode);

  useEffect(() => {
    if (districtId && modalVisible) {
      fetchWards();
    }
  }, [districtId, modalVisible]);

  const fetchWards = async () => {
    if (!districtId) return;

    try {
      setLoading(true);
      const data = await ghnService.getWards(districtId);
      setWards(data);
    } catch (error: any) {
      console.error("Failed to fetch wards:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWards = wards.filter((ward) =>
    ward.WardName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (ward: Ward) => {
    onWardSelect(ward.WardCode, ward.WardName);
    setModalVisible(false);
    setSearchQuery("");
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          disabled && styles.pickerButtonDisabled,
        ]}
        onPress={() => !disabled && districtId && setModalVisible(true)}
        disabled={disabled || !districtId}
      >
        <Ionicons
          name="business-outline"
          size={18}
          color="#666"
          style={styles.icon}
        />
        <Text
          style={[styles.pickerText, !selectedWard && styles.placeholderText]}
        >
          {selectedWard ? selectedWard.WardName : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={13} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Phường/Xã</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={styles.loadingText}>Đang tải...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredWards}
                keyExtractor={(item) => item.WardCode}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.wardItem,
                      selectedWardCode === item.WardCode && [
                        styles.wardItemSelected,
                        { backgroundColor: `${primaryColor}15` },
                      ],
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.wardText,
                        selectedWardCode === item.WardCode && {
                          color: primaryColor,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {item.WardName}
                    </Text>
                    {selectedWardCode === item.WardCode && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={primaryColor}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Không tìm thấy phường/xã
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  pickerButtonError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 10,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#999",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    margin: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  wardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  wardItemSelected: {
    backgroundColor: "#F0F8FF",
  },
  wardText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
});

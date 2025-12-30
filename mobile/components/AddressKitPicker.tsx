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
import userService, { Province, District, Commune } from "@/services/userService";

interface AddressKitPickerProps {
  selectedProvinceCode: string;
  selectedDistrictCode: string;
  selectedCommuneCode: string;
  onProvinceSelect: (province: Province) => void;
  onDistrictSelect: (district: District) => void;
  onCommuneSelect: (commune: Commune) => void;
  primaryColor: string;
  error?: {
    city?: string;
    district?: string;
    wardOrSubDistrict?: string;
  };
}

export const AddressKitPicker: React.FC<AddressKitPickerProps> = ({
  selectedProvinceCode,
  selectedDistrictCode,
  selectedCommuneCode,
  onProvinceSelect,
  onDistrictSelect,
  onCommuneSelect,
  primaryColor,
  error,
}) => {
  // Modal states
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [communeModalVisible, setCommuneModalVisible] = useState(false);

  // Data states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  // Search states
  const [provinceSearch, setProvinceSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [communeSearch, setCommuneSearch] = useState("");

  // Selected items
  const selectedProvince = provinces.find((p) => p.code === selectedProvinceCode);
  const selectedDistrict = districts.find((d) => d.code === selectedDistrictCode);
  const selectedCommune = communes.find((c) => c.code === selectedCommuneCode);

  // Fetch provinces on mount
  useEffect(() => {
    if (provinceModalVisible && provinces.length === 0) {
      fetchProvinces();
    }
  }, [provinceModalVisible]);

  // Fetch districts when province is selected
  useEffect(() => {
    if (selectedProvinceCode) {
      fetchDistricts(selectedProvinceCode);
    }
  }, [selectedProvinceCode]);

  // Fetch communes when district is selected
  useEffect(() => {
    if (selectedDistrictCode) {
      console.log("🔄 District changed to:", selectedDistrictCode);
      fetchCommunes(selectedDistrictCode);
    }
  }, [selectedDistrictCode]);

  const fetchProvinces = async () => {
    try {
      setLoadingProvinces(true);
      const data = await userService.getProvinces();
      console.log("📍 Provinces fetched:", data.length);
      setProvinces(data);
    } catch (error) {
      console.error("Failed to fetch provinces:", error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchDistricts = async (provinceCode: string) => {
    try {
      setLoadingDistricts(true);
      console.log("🏙️ Fetching districts for province:", provinceCode);
      const data = await userService.getDistricts(provinceCode);
      console.log("📍 Districts fetched:", data.length);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to fetch districts:", error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchCommunes = async (districtCode: string) => {
    try {
      setLoadingCommunes(true);
      console.log("🏘️ Fetching communes for district:", districtCode);
      const data = await userService.getWardsByDistrict(districtCode);
      console.log("📍 Communes fetched:", data.length, "communes:", data);
      setCommunes(data);
    } catch (error) {
      console.error("Failed to fetch communes:", error);
      setCommunes([]);
    } finally {
      setLoadingCommunes(false);
    }
  };

  // Filter functions
  const filteredProvinces = provinces.filter((p) =>
    p.name.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const filteredCommunes = communes.filter((c) =>
    c.name.toLowerCase().includes(communeSearch.toLowerCase())
  );

  // Handle selections
  const handleProvinceSelect = (province: Province) => {
    console.log("✅ Province selected:", province);
    onProvinceSelect(province);
    setProvinceModalVisible(false);
    setProvinceSearch("");
    // Clear dependent data
    setDistricts([]);
    setCommunes([]);
  };

  const handleDistrictSelect = (district: District) => {
    console.log("✅ District selected:", district);
    onDistrictSelect(district);
    setDistrictModalVisible(false);
    setDistrictSearch("");
    // Clear dependent data
    setCommunes([]);
  };

  const handleCommuneSelect = (commune: Commune) => {
    console.log("✅ Commune selected:", commune);
    onCommuneSelect(commune);
    setCommuneModalVisible(false);
    setCommuneSearch("");
  };

  // Render picker button
  const renderPickerButton = (
    icon: string,
    label: string,
    value: string | undefined,
    onPress: () => void,
    disabled: boolean,
    error?: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          disabled && styles.pickerButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Ionicons name={icon as any} size={20} color="#666" style={styles.icon} />
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value || `Choose ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  // Render modal
  const renderModal = (
    visible: boolean,
    title: string,
    data: any[],
    loading: boolean,
    searchValue: string,
    onSearchChange: (text: string) => void,
    onClose: () => void,
    onSelect: (item: any) => void,
    selectedCode: string,
    getItemKey: (item: any) => string,
    getItemName: (item: any) => string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              value={searchValue}
              onChangeText={onSearchChange}
            />
            {searchValue.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => getItemKey(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    selectedCode === getItemKey(item) && [
                      styles.listItemSelected,
                      { backgroundColor: `${primaryColor}15` },
                    ],
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      selectedCode === getItemKey(item) && [
                        styles.listItemTextSelected,
                        { color: primaryColor },
                      ],
                    ]}
                  >
                    {getItemName(item)}
                  </Text>
                  {selectedCode === getItemKey(item) && (
                    <Ionicons name="checkmark" size={20} color={primaryColor} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {/* Province Picker */}
      {renderPickerButton(
        "location-outline",
        "Province",
        selectedProvince?.name_with_type || selectedProvince?.name,
        () => setProvinceModalVisible(true),
        false,
        error?.city
      )}

      {/* District Picker */}
      {renderPickerButton(
        "map-outline",
        "District",
        selectedDistrict?.name_with_type || selectedDistrict?.name,
        () => setDistrictModalVisible(true),
        !selectedProvinceCode,
        error?.district
      )}

      {/* Commune Picker */}
      {renderPickerButton(
        "business-outline",
        "Commune",
        selectedCommune?.name_with_type || selectedCommune?.name,
        () => setCommuneModalVisible(true),
        !selectedDistrictCode,
        error?.wardOrSubDistrict
      )}

      {/* Province Modal */}
      {renderModal(
        provinceModalVisible,
        "Province",
        filteredProvinces,
        loadingProvinces,
        provinceSearch,
        setProvinceSearch,
        () => setProvinceModalVisible(false),
        handleProvinceSelect,
        selectedProvinceCode,
        (item) => item.code,
        (item) => item.name_with_type
      )}

      {/* District Modal */}
      {renderModal(
        districtModalVisible,
        "District",
        filteredDistricts,
        loadingDistricts,
        districtSearch,
        setDistrictSearch,
        () => setDistrictModalVisible(false),
        handleDistrictSelect,
        selectedDistrictCode,
        (item) => item.code,
        (item) => item.name_with_type
      )}

      {/* Commune Modal */}
      {renderModal(
        communeModalVisible,
        "Commune",
        filteredCommunes,
        loadingCommunes,
        communeSearch,
        setCommuneSearch,
        () => setCommuneModalVisible(false),
        handleCommuneSelect,
        selectedCommuneCode,
        (item) => item.code,
        (item) => item.name_with_type
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
  },
  placeholderText: {
    color: "#999",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  listItemSelected: {
    borderLeftWidth: 4,
  },
  listItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    flex: 1,
  },
  listItemTextSelected: {
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
});
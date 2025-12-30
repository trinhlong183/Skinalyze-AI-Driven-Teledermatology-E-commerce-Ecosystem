import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Address } from "@/services/authService";

type Props = {
  visible: boolean;
  addresses: Address[];
  onSelectAddress: (address: Address) => void;
  onEnterManually: () => void;
  onCancel: () => void;
  primaryColor: string;
  title?: string;
  subtitle?: string;
};

export default function AddressPickerModal({
  visible,
  addresses,
  onSelectAddress,
  onEnterManually,
  onCancel,
  primaryColor,
  title = "Select Address",
  subtitle = "Choose a saved address or enter manually",
}: Props) {
  const formatAddress = (address: Address): string => {
    return [
      address.streetLine1,
      address.streetLine2,
      address.street,
      address.wardOrSubDistrict,
      address.district,
      address.city,
    ]
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons
                name="location-outline"
                size={24}
                color={primaryColor}
              />
              <View style={styles.headerText}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>{subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Address List */}
          <ScrollView
            style={styles.addressList}
            showsVerticalScrollIndicator={false}
          >
            {addresses.map((address, index) => (
              <TouchableOpacity
                key={address.addressId || index}
                style={[
                  styles.addressCard,
                  { borderColor: `${primaryColor}20` },
                ]}
                onPress={() => onSelectAddress(address)}
                activeOpacity={0.7}
              >
                <View style={styles.addressCardContent}>
                  <View
                    style={[
                      styles.addressIcon,
                      { backgroundColor: `${primaryColor}15` },
                    ]}
                  >
                    <Ionicons
                      name="home-outline"
                      size={20}
                      color={primaryColor}
                    />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressMainText}>
                      {address.streetLine1}
                    </Text>
                    <Text style={styles.addressSecondaryText} numberOfLines={2}>
                      {[
                        address.wardOrSubDistrict,
                        address.district,
                        address.city,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#999"
                  />
                </View>
              </TouchableOpacity>
            ))}

            {/* Enter Manually Option */}
            <TouchableOpacity
              style={[
                styles.manualEntryCard,
                { borderColor: primaryColor, borderStyle: "dashed" },
              ]}
              onPress={onEnterManually}
              activeOpacity={0.7}
            >
              <View style={styles.manualEntryContent}>
                <View
                  style={[
                    styles.manualIcon,
                    { backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={20}
                    color={primaryColor}
                  />
                </View>
                <Text style={[styles.manualEntryText, { color: primaryColor }]}>
                  Enter Address Manually
                </Text>
                <Ionicons name="chevron-forward" size={20} color={primaryColor} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  closeButton: {
    padding: 4,
  },
  addressList: {
    padding: 20,
    paddingTop: 12,
  },
  addressCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addressInfo: {
    flex: 1,
  },
  addressMainText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  addressSecondaryText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  manualEntryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 2,
  },
  manualEntryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  manualIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  manualEntryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    margin: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});
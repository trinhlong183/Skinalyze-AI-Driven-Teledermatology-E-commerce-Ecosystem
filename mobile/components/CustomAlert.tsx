import React from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string; // (Optional, default "OK")
  cancelText?: string; // (Optional. Cancel button)
  onConfirm: () => void;
  onCancel?: () => void; // (Optional)
  type?: "success" | "error" | "warning" | "info";
};
export default function CustomAlert({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = "warning",
}: Props) {
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const confirmLabel = confirmText || t("common.ok");
  const cancelLabel = cancelText || t("common.cancel");
  const getConfig = () => {
    switch (type) {
      case "success":
        return { color: "#4CAF50", icon: "check-circle-outline" };
      case "error":
        return { color: "#d9534f", icon: "alert-circle-outline" };
      case "warning":
        return { color: "#FF9800", icon: "alert-outline" };
      case "info":
      default:
        return { color: primaryColor, icon: "information-outline" };
    }
  };

  const config = getConfig();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={50}
            color={config.color}
          />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>

          <View style={styles.buttonRow}>
            {cancelText && onCancel && (
              <Pressable
                style={[styles.button, styles.buttonCancel]}
                onPress={onCancel}
              >
                <Text style={styles.textStyleCancel}>{cancelLabel}</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: config.color },
                !cancelText && { width: "100%" }, // If 1 button then full width
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.textStyleConfirm}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "85%",
  },
  modalTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  modalText: {
    marginBottom: 24,
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  textStyleCancel: {
    color: "#333",
    fontWeight: "bold",
  },
  textStyleConfirm: {
    color: "white",
    fontWeight: "bold",
  },
});

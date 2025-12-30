import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { SubscriptionPaymentResponse } from "@/services/customerSubscriptionService";
import paymentService from "@/services/paymentService";

const POLLING_INTERVAL_MS = 5000;

type Props = {
  visible: boolean;
  onClose: (didPay: boolean) => void;
  paymentData: SubscriptionPaymentResponse | null;
};

// Thêm trạng thái PARTIAL_REFUND
type ModalStatus =
  | "PENDING"
  | "CHECKING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_REFUND";

export default function SubscriptionPaymentModal({
  visible,
  onClose,
  paymentData,
}: Props) {
  const [status, setStatus] = useState<ModalStatus>("PENDING");
  const [paidAmount, setPaidAmount] = useState<number>(0); // State lưu số tiền đã trả

  const pollingInterval = useRef<number | null>(null);

  const paymentInfo = paymentData?.paymentInfo;
  const bankingInfo = paymentInfo?.bankingInfo;

  // Logic Polling
  useEffect(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    if (visible && paymentInfo?.paymentCode) {
      setStatus("PENDING");
      setPaidAmount(0);

      const checkStatus = async () => {
        // Dừng check nếu đã chuyển sang trạng thái kết thúc (trừ PENDING/CHECKING)
        if (
          status === "COMPLETED" ||
          status === "FAILED" ||
          status === "PARTIAL_REFUND"
        )
          return;

        try {
          const result = await paymentService.checkPaymentStatus(
            paymentInfo.paymentCode
          );
          const apiStatus = result.status.toUpperCase();

          // === CASE 1: SUCCESS ===
          if (apiStatus === "COMPLETED") {
            setStatus("COMPLETED");
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            setTimeout(() => onClose(true), 2000);
          }
          // === CASE 2: FAILED / EXPIRED ===
          else if (apiStatus === "EXPIRED" || apiStatus === "FAILED") {
            if (pollingInterval.current) clearInterval(pollingInterval.current);

            // Check Partial Refund
            const actualPaid = Number(result.paidAmount || 0);

            if (apiStatus === "FAILED" && actualPaid > 0) {
              // ==> HIỂN THỊ CẢNH BÁO CAM
              setPaidAmount(actualPaid);
              setStatus("PARTIAL_REFUND");
            } else {
              // ==> HIỂN THỊ LỖI ĐỎ
              setStatus("FAILED");
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      };

      pollingInterval.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [visible, paymentInfo?.paymentCode]);

  const renderStatusContent = () => {
    // 1. Success
    if (status === "COMPLETED") {
      return (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={60}
            color="#28a745"
          />
          <Text style={styles.statusTitle}>Payment Successful!</Text>
          <Text style={styles.statusMessage}>
            Your subscription is now active.
          </Text>
        </View>
      );
    }

    // 2. Partial Refund (MỚI)
    if (status === "PARTIAL_REFUND") {
      return (
        <View style={styles.warningCard}>
          <View style={styles.warningIconContainer}>
            <MaterialCommunityIcons name="alert" size={48} color="#F57C00" />
          </View>

          <Text style={styles.warningTitle}>Insufficient Payment</Text>

          <Text style={styles.warningText}>
            The order required{" "}
            <Text style={styles.boldText}>
              {Number(bankingInfo?.amount || 0).toLocaleString("vi-VN")} VND
            </Text>{" "}
            but we received{" "}
            <Text style={styles.boldText}>
              {paidAmount.toLocaleString("vi-VN")} VND
            </Text>
            .{"\n\n"}
            Don't worry!{" "}
            <Text style={styles.boldText}>
              {paidAmount.toLocaleString("vi-VN")} VND
            </Text>{" "}
            has been refunded to your Wallet.
          </Text>

          <Pressable style={styles.closeButton} onPress={() => onClose(false)}>
            <Text style={styles.closeButtonText}>Close & Try Again</Text>
          </Pressable>
        </View>
      );
    }

    // 3. Failed
    if (status === "FAILED") {
      return (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={60}
            color="#d9534f"
          />
          <Text style={styles.statusTitle}>Payment Failed or Expired</Text>
          <Text style={styles.statusMessage}>
            Please close this and try again.
          </Text>
          <Pressable style={styles.closeButton} onPress={() => onClose(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      );
    }

    // 4. Pending / Checking
    return (
      <View style={styles.statusBox}>
        {status === "CHECKING" ? (
          <ActivityIndicator size="large" />
        ) : (
          <Ionicons name="time-outline" size={40} color="#666" />
        )}
        <Text style={styles.statusTitle}>
          {status === "CHECKING"
            ? "Verifying Payment..."
            : "Waiting for Payment"}
        </Text>
        <Text style={styles.statusMessage}>
          We are checking your transaction...
        </Text>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Nút đóng góc trên */}
          <Pressable style={styles.closeIcon} onPress={() => onClose(false)}>
            <Ionicons name="close-circle" size={30} color="#ccc" />
          </Pressable>

          <ScrollView>
            <Text style={styles.modalTitle}>Complete Your Purchase</Text>

            {/* Chỉ hiện QR khi đang chờ */}
            {bankingInfo && (status === "PENDING" || status === "CHECKING") && (
              <>
                <Image
                  style={styles.qrCode}
                  source={{ uri: bankingInfo.qrCodeUrl }}
                  resizeMode="contain"
                />
                <View style={styles.infoCard}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={styles.valueAmount}>
                      {Number(bankingInfo.amount || 0).toLocaleString("vi-VN")}{" "}
                      VND
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Bank:</Text>
                    <Text style={styles.value}>{bankingInfo.bankName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Account:</Text>
                    <Text style={styles.value}>
                      {bankingInfo.accountNumber}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.contentLabel}>REQUIRED Content:</Text>
                  <View style={styles.contentBox}>
                    <Text style={styles.valueCode}>
                      {paymentInfo?.paymentCode}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Render Status (Success / Failed / Partial Refund) */}
            {renderStatusContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... (Giữ nguyên các styles cũ)
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  qrCode: {
    width: 250,
    height: 250,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    alignSelf: "center",
  },
  infoCard: {
    backgroundColor: "#f5f5ff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: { fontSize: 15, color: "#666" },
  value: { fontSize: 15, fontWeight: "600" },
  valueAmount: { fontSize: 16, fontWeight: "bold", color: "#007bff" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  contentLabel: { fontSize: 15, color: "#666", marginTop: 8 },
  contentBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    alignItems: "center",
  },
  valueCode: { fontSize: 18, fontWeight: "bold", color: "#d9534f" },

  statusBox: {
    alignItems: "center",
    paddingVertical: 30,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // === STYLES WARNING CARD (Partial Refund) ===
  warningCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  warningIconContainer: {
    marginBottom: 16,
    backgroundColor: "#FFF8E1",
    padding: 16,
    borderRadius: 50,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F57C00",
    marginBottom: 12,
    textAlign: "center",
  },
  warningText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: "bold",
    color: "#333",
  },
});

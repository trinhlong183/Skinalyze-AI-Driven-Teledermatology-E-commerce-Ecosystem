import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Image,
  Clipboard,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useAuth } from "@/hooks/useAuth";
import paymentService from "@/services/paymentService";
import * as FileSystem from "expo-file-system/legacy";
import {
  writeAsStringAsync,
  EncodingType,
  cacheDirectory,
} from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import CustomAlert from "@/components/CustomAlert";

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

interface BankingInfo {
  accountName: string;
  accountNumber: string;
  amount: number;
  bankName: string;
  note: string;
  qrCodeUrl: string;
  transferContent: string;
}

interface PaymentInfo {
  paymentCode: string;
  amount: number;
  expiredAt: string;
  paymentMethod: string;
  paymentType: string;
  bankingInfo: BankingInfo;
}

export default function TopUpScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    confirmText: string = "OK",
    onConfirm: () => void = () => {},
    cancelText?: string,
    onCancel?: () => void
  ) => {
    console.log("[showAlert] Called with:", { type, title, message });
    setAlertConfig({
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertVisible(false);
        onConfirm();
      },
      onCancel: onCancel
        ? () => {
            setAlertVisible(false);
            onCancel();
          }
        : undefined,
    });
    setAlertVisible(true);
    console.log("[showAlert] alertVisible set to true");
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setDisplayAmount(value.toLocaleString("vi-VN"));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("vi-VN");
  };

  const handleAmountChange = (text: string) => {
    // Remove all non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, "");

    // Update raw amount
    setAmount(numericValue);

    // Format for display
    if (numericValue) {
      const formatted = parseInt(numericValue).toLocaleString("vi-VN");
      setDisplayAmount(formatted);
    } else {
      setDisplayAmount("");
    }
  };

  const handleTopUp = async () => {
    const amountValue = parseInt(amount);

    if (!amountValue || amountValue < 10000) {
      showAlert("error", "Lỗi", "Số tiền tối thiểu là 10,000 VND");
      return;
    }

    if (amountValue > 50000000) {
      showAlert("error", "Lỗi", "Số tiền tối đa là 50,000,000 VND");
      return;
    }

    if (!user?.userId) {
      showAlert("error", "Lỗi", "Không tìm thấy thông tin người dùng");
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.createTopUpPayment(
        user.userId,
        amountValue
      );

      console.log("Payment response:", response);

      // Check if we have banking info (for banking method)
      if (response.bankingInfo && response.paymentCode && response.expiredAt) {
        setPaymentInfo({
          paymentCode: response.paymentCode,
          amount: response.amount,
          expiredAt: response.expiredAt,
          paymentMethod: response.paymentMethod,
          paymentType: response.paymentType,
          bankingInfo: response.bankingInfo,
        });
      }
      // Otherwise check for checkout URL (for other payment methods)
      else if (response.checkoutUrl) {
        showAlert(
          "success",
          "Thành công",
          "Đang chuyển đến trang thanh toán...",
          "OK",
          () => {
            // TODO: Open WebView or external browser with checkoutUrl
            refreshUser();
            router.back();
          }
        );
      } else {
        showAlert("error", "Lỗi", "Không thể tạo giao dịch thanh toán");
      }
    } catch (error: any) {
      showAlert("error", "Lỗi", error.message || "Có lỗi xảy ra khi nạp tiền");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    showAlert(
      "success",
      "Đã sao chép",
      `${label} đã được sao chép vào clipboard`
    );
  };

  const formatExpiredTime = (expiredAt: string) => {
    const date = new Date(expiredAt);
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const checkPaymentStatus = async () => {
    if (!paymentInfo?.paymentCode) {
      console.log("[checkPaymentStatus] No payment code found");
      return;
    }

    console.log(
      "[checkPaymentStatus] Checking payment:",
      paymentInfo.paymentCode
    );
    setCheckingPayment(true);

    try {
      const status = await paymentService.checkPaymentStatus(
        paymentInfo.paymentCode
      );
      console.log("[checkPaymentStatus] Status response:", status);

      if (status.status === "completed") {
        const paidAmount =
          typeof status.paidAmount === "string"
            ? parseFloat(status.paidAmount)
            : status.paidAmount || 0;

        console.log("Payment completed! paidAmount:", paidAmount);

        showAlert(
          "success",
          "Thanh toán thành công",
          `Số tiền ${formatCurrency(
            Math.round(paidAmount)
          )} VND đã được nạp vào ví của bạn`,
          "OK",
          () => {
            setPaymentInfo(null);
            refreshUser();
            router.back();
          }
        );
      } else if (status.status === "pending") {
        showAlert(
          "warning",
          "Đang chờ xác nhận",
          "Giao dịch chưa hoàn tất. Vui lòng kiểm tra lại sau ít phút.",
          "Kiểm tra lại",
          () => {
            // Wait 3 seconds then check again
            setTimeout(() => checkPaymentStatus(), 3000);
          },
          "Hủy"
        );
      } else if (status.status === "expired") {
        showAlert(
          "error",
          "Giao dịch hết hạn",
          "Giao dịch đã hết hạn. Vui lòng tạo giao dịch mới.",
          "OK",
          () => {
            setPaymentInfo(null);
          }
        );
      } else {
        showAlert(
          "error",
          "Giao dịch thất bại",
          "Không thể xác nhận thanh toán. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Check payment error:", error);
      showAlert(
        "error",
        "Lỗi",
        "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.",
        "Thử lại",
        () => checkPaymentStatus(),
        "Hủy"
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  const downloadQRCode = async () => {
    const qrUrl = paymentInfo?.bankingInfo?.qrCodeUrl;

    if (!qrUrl) {
      console.log("[downloadQRCode] No QR code URL found");
      return;
    }

    try {
      setLoading(true);

      // 1. Xin quyền
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        showAlert(
          "warning",
          "Cần quyền truy cập",
          "Vui lòng cấp quyền thư viện ảnh."
        );
        return;
      }

      // 2. Tạo đường dẫn file (Dùng cacheDirectory để tránh lỗi type documentDirectory)
      // FileSystem.cacheDirectory có thể null theo type, nên cần fallback string rỗng
      const cacheDir = FileSystem.cacheDirectory || "";
      const filename = `QR_${paymentInfo.paymentCode}_${Date.now()}.png`;
      const fileUri = `${cacheDir}${filename}`;

      console.log("[downloadQRCode] Downloading to:", fileUri);

      // 3. Tải file
      const downloadRes = await FileSystem.downloadAsync(qrUrl, fileUri);

      if (downloadRes.status !== 200) {
        throw new Error("Download failed status: " + downloadRes.status);
      }

      // 4. Lưu vào Gallery
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

      // 5. Tạo Album (Xử lý riêng cho Android/iOS)
      try {
        if (Platform.OS === "android") {
          await MediaLibrary.createAlbumAsync("Skinalyze", asset, false);
        } else {
          await MediaLibrary.createAlbumAsync("Skinalyze", asset);
        }
      } catch (e) {
        // Lỗi tạo album không nên chặn luồng chính, vì ảnh đã lưu được rồi (createAssetAsync)
        console.log("Album creation warning:", e);
      }

      showAlert("success", "Thành công", "Mã QR đã được lưu vào thư viện ảnh.");
    } catch (error: any) {
      console.error("[downloadQRCode] Error:", error);
      showAlert("error", "Lỗi", `Không thể tải mã QR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // If payment info exists, show banking details
  if (paymentInfo) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setPaymentInfo(null);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chuyển khoản</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* QR Code Card */}
          <View style={styles.card}>
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons name="qr-code" size={32} color={primaryColor} />
            </View>

            <Text style={styles.sectionTitle}>Quét mã QR để thanh toán</Text>

            <View style={styles.qrCodeWrapper}>
              <Image
                source={{ uri: paymentInfo.bankingInfo.qrCodeUrl }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.downloadButton,
                { backgroundColor: `${primaryColor}15` },
              ]}
              onPress={downloadQRCode}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : (
                <>
                  <Ionicons name="download" size={18} color={primaryColor} />
                  <Text
                    style={[styles.downloadButtonText, { color: primaryColor }]}
                  >
                    Tải mã QR về máy
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>Hoặc chuyển khoản thủ công</Text>
          </View>

          {/* Banking Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin chuyển khoản</Text>

            {/* Bank Name */}
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="business" size={18} color="#666" />
                <Text style={styles.infoLabel}>Ngân hàng</Text>
              </View>
              <Text style={styles.infoValue}>
                {paymentInfo.bankingInfo.bankName}
              </Text>
            </View>

            {/* Account Number */}
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="card" size={18} color="#666" />
                <Text style={styles.infoLabel}>Số tài khoản</Text>
              </View>
              <View style={styles.infoRight}>
                <Text style={styles.infoValue}>
                  {paymentInfo.bankingInfo.accountNumber}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(
                      paymentInfo.bankingInfo.accountNumber,
                      "Số tài khoản"
                    )
                  }
                  style={[
                    styles.copyButton,
                    { backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons name="copy" size={14} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Name */}
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="person" size={18} color="#666" />
                <Text style={styles.infoLabel}>Chủ tài khoản</Text>
              </View>
              <Text style={styles.infoValue}>
                {paymentInfo.bankingInfo.accountName}
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="cash" size={18} color="#666" />
                <Text style={styles.infoLabel}>Số tiền</Text>
              </View>
              <View style={styles.infoRight}>
                <Text style={[styles.infoValue, styles.amountValue]}>
                  {formatCurrency(paymentInfo.amount)} VND
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(paymentInfo.amount.toString(), "Số tiền")
                  }
                  style={[
                    styles.copyButton,
                    { backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons name="copy" size={14} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Transfer Content */}
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="chatbox" size={18} color="#666" />
                <Text style={styles.infoLabel}>Nội dung</Text>
              </View>
              <View style={styles.infoRight}>
                <Text style={[styles.infoValue, styles.transferContent]}>
                  {paymentInfo.bankingInfo.transferContent}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(
                      paymentInfo.bankingInfo.transferContent,
                      "Nội dung chuyển khoản"
                    )
                  }
                  style={[
                    styles.copyButton,
                    { backgroundColor: `${primaryColor}15` },
                  ]}
                >
                  <Ionicons name="copy" size={14} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Important Notes */}
          <View
            style={[styles.infoCard, { backgroundColor: `${primaryColor}08` }]}
          >
            <View style={styles.noteRow}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.noteText}>
                {paymentInfo.bankingInfo.note}
              </Text>
            </View>
            <View style={styles.noteRow}>
              <Ionicons name="time" size={20} color={primaryColor} />
              <Text style={styles.noteText}>
                Vui lòng thanh toán trước:{" "}
                <Text style={styles.expiredTime}>
                  {formatExpiredTime(paymentInfo.expiredAt)}
                </Text>
              </Text>
            </View>
            <View style={styles.noteRow}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={primaryColor}
              />
              <Text style={styles.noteText}>
                Số dư sẽ được cập nhật tự động sau khi chuyển khoản thành công
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.doneButton,
              { backgroundColor: primaryColor },
              checkingPayment && styles.buttonDisabled,
            ]}
            onPress={checkPaymentStatus}
            disabled={checkingPayment}
            activeOpacity={0.8}
          >
            {checkingPayment ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.doneButtonText}>Đang kiểm tra...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.doneButtonText}>Đã chuyển khoản</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Custom Alert */}
        <CustomAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nạp tiền vào ví</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Input Card */}
        <View style={styles.card}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <Ionicons name="wallet" size={32} color={primaryColor} />
          </View>

          <Text style={styles.label}>Số tiền nạp</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { borderColor: primaryColor }]}
              value={displayAmount}
              onChangeText={handleAmountChange}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#CCC"
            />
            <Text style={styles.currency}>VND</Text>
          </View>

          {displayAmount && (
            <Text style={styles.formattedAmount}>{displayAmount} đồng</Text>
          )}
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chọn nhanh</Text>

          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickButton,
                  amount === value.toString() && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
                onPress={() => handleQuickAmount(value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickButtonText,
                    amount === value.toString() && styles.quickButtonTextActive,
                  ]}
                >
                  {formatCurrency(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View
          style={[styles.infoCard, { backgroundColor: `${primaryColor}08` }]}
        >
          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle"
              size={20}
              color={primaryColor}
            />
            <Text style={styles.infoText}>
              Số tiền nạp tối thiểu: 10,000 VND
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle"
              size={20}
              color={primaryColor}
            />
            <Text style={styles.infoText}>
              Số tiền nạp tối đa: 50,000,000 VND
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={primaryColor} />
            <Text style={styles.infoText}>
              Giao dịch được bảo mật bởi VNPay
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.topUpButton,
            { backgroundColor: primaryColor },
            (!amount || parseInt(amount) < 10000 || loading) &&
              styles.buttonDisabled,
          ]}
          onPress={handleTopUp}
          disabled={!amount || parseInt(amount) < 10000 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.topUpButtonText}>Nạp tiền ngay</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  input: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    borderBottomWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 200,
  },
  currency: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
  },
  formattedAmount: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  quickButtonTextActive: {
    color: "#FFFFFF",
  },
  infoCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    lineHeight: 18,
  },
  bottomContainer: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  qrCodeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginVertical: 16,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  orText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "700",
  },
  infoRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  amountValue: {
    fontSize: 16,
    color: "#34C759",
  },
  transferContent: {
    fontSize: 15,
    color: "#FF9500",
    fontWeight: "800",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    lineHeight: 18,
  },
  expiredTime: {
    fontWeight: "800",
    color: "#FF3B30",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

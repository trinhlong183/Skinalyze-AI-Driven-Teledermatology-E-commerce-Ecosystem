import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

import paymentService, {
  PaymentStatusResponse,
} from "@/services/paymentService";
import appointmentService from "@/services/appointmentService";
import CustomAlert from "@/components/CustomAlert";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";

const POLLING_INTERVAL_MS = 5000;

interface BankingInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  qrCodeUrl: string;
}

type ScreenStatus =
  | "WAITING"
  | "SUCCESS"
  | "EXPIRED"
  | "FAILED"
  | "PARTIAL_REFUND";

export default function PaymentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const { primaryColor } = useThemeColor();
  const { t } = useTranslation("translation", { keyPrefix: "paymentScreen" });

  const [generalAlert, setGeneralAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    confirmText: undefined as string | undefined,
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    confirmText?: string
  ) => {
    setGeneralAlert({ visible: true, title, message, type, confirmText });
  };

  const closeAlert = () =>
    setGeneralAlert((prev) => ({ ...prev, visible: false }));

  // ---  Parse Data ---
  const bankingInfo: BankingInfo = useMemo(() => {
    try {
      return JSON.parse((params.bankingInfo as string) || "{}");
    } catch (e) {
      console.error("Failed to parse bankingInfo:", e);
      return {} as BankingInfo;
    }
  }, [params.bankingInfo]);

  const paymentCode = params.paymentCode as string;
  const appointmentId = params.appointmentId as string;

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [screenStatus, setScreenStatus] = useState<ScreenStatus>("WAITING");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // QR Error Handling
  const [qrLoadError, setQrLoadError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Popup & Cancel logic
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [leaveAction, setLeaveAction] = useState<any>(null);

  const pollingInterval = useRef<number | null>(null);
  // ---  Logic Countdown Timer ---
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!params.expiredAt) return null;
      const expiration = new Date(params.expiredAt as string);
      const now = new Date();
      const diff = expiration.getTime() - now.getTime();

      if (diff <= 0) {
        if (screenStatus === "WAITING") {
          setScreenStatus("EXPIRED");
        }
        return null;
      }
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    };

    setTimeLeft(calculateTimeLeft());
    const countdownTimer = setInterval(() => {
      const newTime = calculateTimeLeft();
      if (newTime === null) {
        clearInterval(countdownTimer);
      } else {
        setTimeLeft(newTime);
      }
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, [params.expiredAt, screenStatus]);

  // ---  Logic Polling  ---
  useEffect(() => {
    const stopPolling = () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      setIsChecking(false);
    };

    const checkStatus = async () => {
      if (screenStatus !== "WAITING") {
        stopPolling();
        return;
      }

      const expiration = new Date(params.expiredAt as string);
      if (new Date() > expiration) {
        setScreenStatus("EXPIRED");
        stopPolling();
        return;
      }

      if (isChecking || !paymentCode) return;

      try {
        setIsChecking(true);
        const result: PaymentStatusResponse =
          await paymentService.checkPaymentStatus(paymentCode);

        const status = result.status.toUpperCase();

        // === CASE 1: SUCCESS ===
        if (status === "COMPLETED") {
          stopPolling();
          setScreenStatus("SUCCESS");
          router.replace({
            pathname: "/(stacks)/PaymentSuccessScreen",
            params: {
              appointmentId: appointmentId || undefined,
              orderId: params.orderId || undefined,
              paymentCode: paymentCode,
            },
          });
        }
        // === CASE 2: FAILED OR EXPIRED ===
        else if (status === "FAILED" || status === "EXPIRED") {
          stopPolling();

          // Check partial refund condition
          const actualPaid = Number(result.paidAmount || 0);

          if (status === "FAILED" && actualPaid > 0) {
            setPaidAmount(actualPaid);
            setScreenStatus("PARTIAL_REFUND");
          } else {
            setScreenStatus(status === "EXPIRED" ? "EXPIRED" : "FAILED");
            showAlert(
              t("alerts.paymentFailedTitle"),
              t("alerts.paymentFailedMessage", {
                status: result.status.toLowerCase(),
              })
            );
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
    pollingInterval.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
    return () => stopPolling();
  }, [paymentCode, params.expiredAt, router, screenStatus]);

  // --- 5. Logic Block Back Button ---
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (screenStatus !== "WAITING" || !pollingInterval.current) {
        return;
      }

      e.preventDefault();
      setLeaveAction(e.data.action);
      setIsAlertVisible(true);
    });
    return unsubscribe;
  }, [navigation, screenStatus]);

  // --- Handlers ---
  const handleAlertCancel = () => {
    setIsAlertVisible(false);
    setLeaveAction(null);
  };

  const handleAlertConfirm = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    try {
      await appointmentService.cancelPendingReservation(appointmentId);
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
    }

    setIsCancelling(false);
    setIsAlertVisible(false);

    if (leaveAction) {
      navigation.dispatch(leaveAction);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showAlert(
        t("alerts.copyTitle"),
        t("alerts.copyMessage", { label }),
        "success"
      );
    } catch (error) {
      showAlert(
        t("alerts.copyErrorTitle"),
        t("alerts.copyErrorMessage"),
        "error"
      );
    }
  };

  const handleQrError = () => {
    setQrLoadError(true);
  };

  const downloadQRCode = async () => {
    const qrUrl = bankingInfo?.qrCodeUrl;

    if (!qrUrl) {
      console.log("[downloadQRCode] No QR code URL found");
      showAlert(t("alerts.qrErrorTitle"), t("alerts.qrErrorMissing"), "error");
      setIsDownloading(false);
      return;
    }

    try {
      setIsDownloading(true);

      // 1. Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        showAlert(
          t("alerts.permissionTitle"),
          t("alerts.permissionMessage"),
          "warning"
        );
        setIsDownloading(false);
        return;
      }

      // 2. Create file path (Use cacheDirectory to avoid documentDirectory type issues)
      const cacheDir = FileSystem.cacheDirectory || "";
      const filename = `payment_qr_${paymentCode}_${Date.now()}.png`;
      const fileUri = `${cacheDir}${filename}`;

      console.log("[downloadQRCode] Downloading to:", fileUri);

      // 3. Download file
      const downloadRes = await FileSystem.downloadAsync(qrUrl, fileUri);

      if (downloadRes.status !== 200) {
        throw new Error("Download failed status: " + downloadRes.status);
      }

      // 4. Save to Gallery
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

      // 5. Create Album (Handle Android/iOS separately)
      try {
        if (Platform.OS === "android") {
          await MediaLibrary.createAlbumAsync(
            "Skinalyze Payments",
            asset,
            false
          );
        } else {
          await MediaLibrary.createAlbumAsync("Skinalyze Payments", asset);
        }
      } catch (e) {
        // Album creation error should not block main flow, as image is already saved
        console.log("Album creation warning:", e);
      }

      showAlert(
        t("alerts.successTitle"),
        t("alerts.successMessage"),
        "success"
      );
    } catch (error: any) {
      console.error("[downloadQRCode] Error:", error);
      showAlert(
        t("alerts.qrErrorTitle"),
        t("alerts.downloadError", { message: error.message }),
        "error"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const shareQRCode = async (uri?: string) => {
    try {
      const fileUri = uri || (await downloadQRToTemp());
      if (fileUri) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: t("qr.shareDialogTitle"),
        });
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      showAlert(
        t("alerts.shareErrorTitle"),
        t("alerts.shareErrorMessage"),
        "error"
      );
    }
  };

  const downloadQRToTemp = async (): Promise<string | null> => {
    if (!bankingInfo.qrCodeUrl) return null;

    try {
      const filename = `temp_qr_${Date.now()}.png`;
      const downloadResult = await FileSystem.downloadAsync(
        bankingInfo.qrCodeUrl,
        FileSystem.cacheDirectory + filename
      );

      return downloadResult.status === 200 ? downloadResult.uri : null;
    } catch (error) {
      console.error("Error downloading QR to temp:", error);
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("title")}</Text>
        <View style={styles.headerBackButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CASE: PARTIAL REFUND */}
        {screenStatus === "PARTIAL_REFUND" && (
          <View style={styles.centerContainer}>
            <View style={styles.warningCard}>
              <View style={styles.warningIconContainer}>
                <MaterialCommunityIcons
                  name="alert"
                  size={48}
                  color="#F57C00"
                />
              </View>

              <Text style={styles.warningTitle}>
                {t("partialRefund.title")}
              </Text>
              <Text style={styles.warningText}>
                {t("partialRefund.message", {
                  required: Number(bankingInfo.amount).toLocaleString("vi-VN"),
                  received: paidAmount.toLocaleString("vi-VN"),
                })}
              </Text>

              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.back()}
              >
                <Text style={styles.buttonTextPrimary}>
                  {t("partialRefund.bookAgain")}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push("/(stacks)/ProfileScreen")}
              >
                <Text style={styles.buttonTextSecondary}>
                  {t("partialRefund.checkWallet")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* CASE: EXPIRED / FAILED */}
        {(screenStatus === "EXPIRED" || screenStatus === "FAILED") && (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="timer-off"
              size={80}
              color="#757575"
            />
            <Text style={styles.title}>{t("expired.title")}</Text>
            <Text style={styles.instructions}>{t("expired.message")}</Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{t("expired.goBack")}</Text>
            </Pressable>
          </View>
        )}

        {/* CASE: WAITING */}
        {screenStatus === "WAITING" && (
          <>
            <Text style={styles.instructions}>{t("waiting.instructions")}</Text>

            {/* QR Code Logic  */}
            <View style={styles.qrContainer}>
              {bankingInfo.qrCodeUrl && !qrLoadError ? (
                <>
                  <Image
                    style={styles.qrCode}
                    source={{ uri: bankingInfo.qrCodeUrl }}
                    resizeMode="contain"
                    onError={handleQrError}
                  />

                  {/* QR Action Buttons */}
                  <View style={styles.qrActionButtons}>
                    <Pressable
                      style={[
                        styles.qrActionButton,
                        { backgroundColor: primaryColor },
                      ]}
                      onPress={downloadQRCode}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <MaterialCommunityIcons
                          name="download"
                          size={20}
                          color="white"
                        />
                      )}
                      <Text style={styles.qrActionButtonText}>
                        {isDownloading
                          ? t("actions.downloading")
                          : t("actions.download")}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.qrActionButton, styles.shareButton]}
                      onPress={() => shareQRCode()}
                    >
                      <MaterialCommunityIcons
                        name="share"
                        size={20}
                        color={primaryColor}
                      />
                      <Text
                        style={[
                          styles.qrActionButtonText,
                          { color: primaryColor },
                        ]}
                      >
                        {t("actions.share")}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={80} color="#CCC" />
                  <Text style={styles.qrPlaceholderText}>
                    {t("qr.notAvailable")}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{timeLeft || "..."}</Text>
              <Text style={styles.timerLabel}>{t("timer.label")}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>{t("infoCard.title")}</Text>

              <View style={styles.row}>
                <Text style={styles.label}>{`${t("infoCard.amount")}:`}</Text>
                <Text style={styles.valueAmount}>
                  {Number(bankingInfo.amount || 0).toLocaleString("vi-VN")} VND
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>{`${t("infoCard.bank")}:`}</Text>
                <Text style={styles.value}>{bankingInfo.bankName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {`${t("infoCard.accountName")}:`}
                </Text>
                <Text style={styles.value}>{bankingInfo.accountName}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>
                  {`${t("infoCard.accountNumber")}:`}
                </Text>
                <View style={styles.copyableValueContainer}>
                  <Text style={styles.value} selectable>
                    {bankingInfo.accountNumber}
                  </Text>
                  <Pressable
                    onPress={() =>
                      copyToClipboard(
                        bankingInfo.accountNumber,
                        t("infoCard.accountNumber")
                      )
                    }
                    style={styles.copyButton}
                  >
                    <MaterialCommunityIcons
                      name="content-copy"
                      size={20}
                      color="#666"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.contentLabel}>{t("infoCard.required")}</Text>
              <View style={styles.contentBox}>
                <Text style={styles.valueCode} selectable>
                  {paymentCode}
                </Text>
                <Pressable
                  onPress={() =>
                    copyToClipboard(paymentCode, t("infoCard.transferContent"))
                  }
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={24}
                    color="#d9534f"
                  />
                </Pressable>
              </View>

              <Text style={styles.note}>{t("infoCard.note")}</Text>
            </View>

            <View style={styles.statusContainer}>
              {isChecking && <ActivityIndicator size="small" />}
              <Text style={styles.statusText}>
                {isChecking ? t("status.checking") : t("status.waiting")}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <CustomAlert
        visible={isAlertVisible}
        title={t("alerts.leaveTitle")}
        message={t("alerts.leaveMessage")}
        confirmText={
          isCancelling ? t("alerts.cancelling") : t("alerts.confirmCancel")
        }
        cancelText={t("alerts.stay")}
        onConfirm={handleAlertConfirm}
        onCancel={handleAlertCancel}
      />

      <CustomAlert
        visible={generalAlert.visible}
        title={generalAlert.title}
        message={generalAlert.message}
        confirmText={generalAlert.confirmText}
        onConfirm={closeAlert}
        type={generalAlert.type}
      />

      {isCancelling && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {t("alerts.cancellingOverlay")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  // Content Styles
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
    textAlign: "center",
  },
  instructions: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: "hidden",
    padding: 16,
  },
  qrCode: {
    width: 240,
    height: 240,
    alignSelf: "center",
  },
  qrActionButtons: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  qrActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  shareButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#007bff",
  },
  qrActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  qrPlaceholderText: {
    marginTop: 10,
    color: "#888",
  },
  timerBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#d9534f",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginTop: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },
  valueAmount: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#007bff",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  contentLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  contentBox: {
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  valueCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d9534f",
    letterSpacing: 1,
  },
  note: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  statusContainer: {
    flexDirection: "row",
    marginTop: 24,
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "500",
  },
  // Warning Styles
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  warningCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
  // Buttons
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#007bff",
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007bff",
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
  },
  backButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  copyableValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: {
    color: "#333",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});

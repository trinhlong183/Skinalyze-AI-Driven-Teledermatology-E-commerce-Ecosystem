import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import shippingLogService, {
  ShippingLogTrackingData,
} from "@/services/shippingLogService";
import tokenService from "@/services/tokenService";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert"; // Import CustomAlert

export default function ShippingTrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isAuthenticated } = useAuth();
  const { primaryColor } = useThemeColor();

  const [trackingData, setTrackingData] =
    useState<ShippingLogTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (orderId && isAuthenticated) {
      loadTrackingData();
    }
  }, [orderId, isAuthenticated]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await tokenService.getToken();
      if (!token) {
        setTrackingData(null);
        return;
      }

      const data = await shippingLogService.getShippingTracking(
        orderId || "",
        token
      );
      setTrackingData(data);
    } catch (err: any) {
      console.error("Error loading shipping tracking:", err);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrackingData();
    setRefreshing(false);
  };

  const handleCallStaff = () => {
    if (!trackingData?.shippingStaff) return;

    setAlertConfig({
      visible: true,
      title: t("shippingTracking.callStaff"),
      message: t("shippingTracking.callStaffMessage", {
        name: trackingData.shippingStaff.fullName,
      }),
      type: "info",
      confirmText: t("shippingTracking.call"),
      cancelText: t("shippingTracking.cancel"),
      onCancel: hideAlert,
      onConfirm: () => {
        hideAlert();
        const phoneNumber = trackingData.shippingStaff!.phone;
        Linking.openURL(`tel:${phoneNumber}`);
      },
    });
  };

  if (loading && !trackingData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("shippingTracking.title")}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>
            {t("shippingTracking.loading")}
          </Text>
        </View>
      </View>
    );
  }

  if (!trackingData && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("shippingTracking.title")}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="cube-outline" size={64} color="#999" />
          <Text style={styles.noDataTitle}>{t("shippingTracking.noData")}</Text>
          <Text style={styles.noDataDesc}>
            {t("shippingTracking.noDataDesc")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={loadTrackingData}
          >
            <Text style={styles.retryButtonText}>
              {t("shippingTracking.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!trackingData) {
    return null;
  }

  const statusColor = shippingLogService.getStatusColor(trackingData.status);
  const statusLabel = shippingLogService.getStatusLabel(trackingData.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("shippingTracking.title")}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("shippingTracking.orderId")}
          </Text>
          <View style={styles.orderIdCard}>
            <Ionicons name="receipt-outline" size={24} color={primaryColor} />
            <Text style={styles.orderId}>{trackingData.orderId}</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("shippingTracking.status")}
          </Text>
          <View style={styles.statusCard}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Ionicons name="cube-outline" size={20} color="#FFF" />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <Text style={styles.shippingMethodBadge}>
              {trackingData.shippingMethod === "GHN"
                ? t("shippingTracking.ghnMethod")
                : t("shippingTracking.internalMethod")}
            </Text>
          </View>
        </View>

        {/* GHN Order Code */}
        {trackingData.ghnOrderCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("shippingTracking.ghnCode")}
            </Text>
            <View style={styles.ghnCodeCard}>
              <Ionicons name="barcode-outline" size={24} color={primaryColor} />
              <Text style={styles.ghnCode}>{trackingData.ghnOrderCode}</Text>
            </View>
          </View>
        )}

        {/* GHN Tracking Info */}
        {trackingData.ghnTracking && (
          <>
            {/* Current Status & Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("shippingTracking.trackingInfo")}
              </Text>
              <View style={styles.trackingInfoCard}>
                <View style={styles.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={primaryColor}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>
                      {t("shippingTracking.currentLocation")}
                    </Text>
                    <Text style={styles.infoValue}>
                      {trackingData.ghnTracking.currentLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={primaryColor}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>
                      {t("shippingTracking.expectedDelivery")}
                    </Text>
                    <Text style={styles.infoValue}>
                      {shippingLogService.formatDateTime(
                        trackingData.ghnTracking.expectedDeliveryTime
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={primaryColor}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>
                      {t("shippingTracking.ghnStatus")}
                    </Text>
                    <Text style={styles.infoValue}>
                      {shippingLogService.getStatusLabel(
                        trackingData.ghnTracking.status
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tracking Logs */}
            {trackingData.ghnTracking.logs &&
              trackingData.ghnTracking.logs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t("shippingTracking.trackingHistory")}
                  </Text>
                  <View style={styles.logsContainer}>
                    {trackingData.ghnTracking.logs.map((log, index) => (
                      <View key={index} style={styles.logItem}>
                        <View style={styles.logTimeline}>
                          <View
                            style={[
                              styles.logDot,
                              index === 0 && {
                                backgroundColor: primaryColor,
                                width: 12,
                                height: 12,
                              },
                            ]}
                          />
                          {index <
                            trackingData.ghnTracking!.logs.length - 1 && (
                            <View style={styles.logLine} />
                          )}
                        </View>
                        <View style={styles.logContent}>
                          <Text
                            style={[
                              styles.logStatus,
                              index === 0 && {
                                color: primaryColor,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {shippingLogService.getStatusLabel(log.status)}
                          </Text>
                          <Text style={styles.logTime}>
                            {shippingLogService.formatDateTime(log.time)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
          </>
        )}

        {/* Shipping Staff Info */}
        {trackingData.shippingStaff && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("shippingTracking.shippingStaff")}
            </Text>
            <View style={styles.staffCard}>
              <View style={styles.staffAvatar}>
                <Ionicons name="person" size={32} color="#FFF" />
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>
                  {trackingData.shippingStaff.fullName}
                </Text>
                <Text style={styles.staffPhone}>
                  {trackingData.shippingStaff.phone}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: primaryColor }]}
                onPress={handleCallStaff}
              >
                <Ionicons name="call" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Note for Internal Shipping */}
        {trackingData.shippingMethod === "INTERNAL" && (
          <View style={styles.noteCard}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.noteText}>
              {t("shippingTracking.internalNote")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Integrate Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  noDataTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  noDataDesc: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderIdCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  orderId: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  statusCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  shippingMethodBadge: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  ghnCodeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  ghnCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "monospace",
  },
  trackingInfoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 12,
  },
  logsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  logItem: {
    flexDirection: "row",
    gap: 12,
  },
  logTimeline: {
    alignItems: "center",
    paddingTop: 4,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CCC",
  },
  logLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E5E5",
    marginTop: 4,
    marginBottom: 4,
    minHeight: 24,
  },
  logContent: {
    flex: 1,
    paddingBottom: 16,
  },
  logStatus: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  logTime: {
    fontSize: 13,
    color: "#666",
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  staffPhone: {
    fontSize: 14,
    color: "#666",
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    lineHeight: 20,
  },
});
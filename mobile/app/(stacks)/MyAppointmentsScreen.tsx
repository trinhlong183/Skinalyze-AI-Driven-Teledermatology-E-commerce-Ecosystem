import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import customerService from "@/services/customerService";
import appointmentService from "@/services/appointmentService";
import {
  AppointmentStatus,
  AppointmentType,
  AppointmentWithRelations,
} from "@/types/appointment.type";

type FilterStatus = AppointmentStatus | "ALL";

const statusTranslationKeys: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING_PAYMENT]: "pendingPayment",
  [AppointmentStatus.SCHEDULED]: "scheduled",
  [AppointmentStatus.IN_PROGRESS]: "inProgress",
  [AppointmentStatus.COMPLETED]: "completed",
  [AppointmentStatus.CANCELLED]: "cancelled",
  [AppointmentStatus.NO_SHOW]: "noShow",
  [AppointmentStatus.INTERRUPTED]: "interrupted",
  [AppointmentStatus.DISPUTED]: "disputed",
  [AppointmentStatus.SETTLED]: "settled",
};

const statusMeta: Record<AppointmentStatus, { color: string; icon: string }> = {
  [AppointmentStatus.PENDING_PAYMENT]: {
    color: "#FB8C00",
    icon: "time-outline",
  },
  [AppointmentStatus.SCHEDULED]: {
    color: "#1E88E5",
    icon: "calendar",
  },
  [AppointmentStatus.IN_PROGRESS]: {
    color: "#D81B60",
    icon: "videocam",
  },
  [AppointmentStatus.COMPLETED]: {
    color: "#43A047",
    icon: "checkmark-circle",
  },
  [AppointmentStatus.CANCELLED]: {
    color: "#757575",
    icon: "close-circle",
  },
  [AppointmentStatus.NO_SHOW]: {
    color: "#E53935",
    icon: "alert-circle",
  },
  [AppointmentStatus.INTERRUPTED]: {
    color: "#FFB300",
    icon: "warning",
  },
  [AppointmentStatus.DISPUTED]: {
    color: "#F57C00",
    icon: "help-circle",
  },
  [AppointmentStatus.SETTLED]: {
    color: "#43A047",
    icon: "checkmark-done",
  },
};

const appointmentTypeKeys: Record<AppointmentType, string> = {
  [AppointmentType.NEW_PROBLEM]: "newProblem",
  [AppointmentType.FOLLOW_UP]: "followUp",
};

const statusOrder: FilterStatus[] = [
  "ALL",
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.INTERRUPTED,
  AppointmentStatus.DISPUTED,
];

const defaultStatusMeta = { color: "#546E7A", icon: "help-circle" };

const formatDate = (isoDate: string, fallback = "N/A") => {
  if (!isoDate) {
    return fallback;
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTimeRange = (
  start: string,
  end?: string | null,
  fallback = "N/A"
) => {
  if (!start) {
    return fallback;
  }
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  if (Number.isNaN(startDate.getTime())) {
    return fallback;
  }
  const startText = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (!endDate || Number.isNaN(endDate.getTime())) {
    return startText;
  }
  const endText = endDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${startText} - ${endText}`;
};

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { primaryColor } = useThemeColor();
  const { user, isAuthenticated } = useAuth();
  const notAvailableLabel = t("common.notAvailable");

  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("ALL");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusFilters = useMemo(() => {
    return statusOrder.map((status) => {
      if (status === "ALL") {
        return { key: status, label: t("appointments.status.all") };
      }
      const translationKey = statusTranslationKeys[status as AppointmentStatus];
      return {
        key: status,
        label: translationKey
          ? t(`appointments.status.${translationKey}`)
          : String(status),
      };
    });
  }, [t]);

  const getStatusLabel = useCallback(
    (status: FilterStatus | AppointmentStatus | string) => {
      if (status === "ALL") {
        return t("appointments.status.all");
      }
      if (status === AppointmentStatus.SETTLED) {
        return t("appointments.status.completed");
      }
      const translationKey = statusTranslationKeys[status as AppointmentStatus];
      return translationKey
        ? t(`appointments.status.${translationKey}`)
        : String(status);
    },
    [t]
  );

  const getTypeLabel = useCallback(
    (type: AppointmentType | null | undefined) => {
      if (!type) {
        return t("appointments.cards.unknown");
      }
      const translationKey = appointmentTypeKeys[type];
      return translationKey
        ? t(`appointments.types.${translationKey}`)
        : type.replace(/_/g, " ");
    },
    [t]
  );

  useEffect(() => {
    let isActive = true;

    const loadCustomer = async () => {
      if (!isAuthenticated || !user?.userId) {
        setCustomerId(null);
        setAppointments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const customer = await customerService.getCustomerProfile(user.userId);
        if (!isActive) {
          return;
        }
        if (!customer?.customerId) {
          setError(t("appointments.customerNotFound"));
          setCustomerId(null);
          setAppointments([]);
        } else {
          setError(null);
          setCustomerId(customer.customerId);
        }
      } catch (err) {
        console.error("Failed to load customer profile:", err);
        if (isActive) {
          setError(t("appointments.error"));
          setCustomerId(null);
          setAppointments([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, user?.userId, t]);

  const fetchAppointments = useCallback(
    async (status: FilterStatus, showSpinner = true) => {
      if (!customerId) {
        return;
      }

      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const requestStatus: AppointmentStatus | undefined =
          status === "ALL"
            ? undefined
            : status === AppointmentStatus.COMPLETED
            ? undefined
            : (status as AppointmentStatus);

        const data = await appointmentService.getCustomerAppointments(
          customerId,
          requestStatus
        );

        const normalized = data || [];
        const filtered =
          status === "ALL"
            ? normalized
            : status === AppointmentStatus.COMPLETED
            ? normalized.filter(
                (item) =>
                  item.appointmentStatus === AppointmentStatus.COMPLETED ||
                  item.appointmentStatus === AppointmentStatus.SETTLED
              )
            : normalized.filter(
                (item) =>
                  item.appointmentStatus === (status as AppointmentStatus)
              );

        setAppointments(filtered);
        setError(null);
      } catch (err) {
        console.error("Failed to load appointments:", err);
        setError(t("appointments.error"));
      } finally {
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [customerId, t]
  );

  useEffect(() => {
    if (!customerId || !isFocused) {
      return;
    }
    fetchAppointments(selectedStatus, true);
  }, [customerId, selectedStatus, isFocused, fetchAppointments]);

  const handleRefresh = useCallback(async () => {
    if (!customerId) {
      return;
    }
    await fetchAppointments(selectedStatus, false);
  }, [customerId, fetchAppointments, selectedStatus]);

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={statusFilters}
        keyExtractor={(item) => item.key.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === item.key && {
                backgroundColor: primaryColor,
              },
            ]}
            onPress={() => setSelectedStatus(item.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStatus === item.key && styles.filterButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderAppointmentItem = ({
    item,
  }: {
    item: AppointmentWithRelations;
  }) => {
    const meta = statusMeta[item.appointmentStatus] || defaultStatusMeta;
    const dermatologistName =
      item.dermatologist?.user?.fullName || t("appointments.cards.unknown");
    const dermatologistPhotoUrl = item.dermatologist?.user?.photoUrl;
    const typeLabel = getTypeLabel(item.appointmentType);
    const timeRange = formatTimeRange(
      item.startTime,
      item.endTime,
      notAvailableLabel
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/(stacks)/AppointmentDetailScreen",
            params: { appointmentId: item.appointmentId },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              {dermatologistPhotoUrl ? (
                <Image
                  source={{ uri: dermatologistPhotoUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="medkit" size={22} color={primaryColor} />
                </View>
              )}
            </View>
            <View>
              <Text style={styles.sectionLabel}>
                {t("appointments.cards.dermatologist")}
              </Text>
              <Text style={styles.doctorName}>{dermatologistName}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: hexToRgba(meta.color, 0.15) },
            ]}
          >
            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>
              {getStatusLabel(item.appointmentStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>{t("appointments.cards.time")}</Text>
            <Text style={styles.infoValue}>{timeRange}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="albums-outline" size={16} color="#666" />
            <Text style={styles.infoLabel}>{t("appointments.cards.type")}</Text>
            <Text style={styles.infoValue}>{typeLabel}</Text>
          </View>
          {item.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>
                {t("appointments.cards.notes")}
              </Text>
              <Text style={styles.noteText}>{item.note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.footerDate, { color: primaryColor }]}>
            {formatDate(item.startTime, notAvailableLabel)}
          </Text>
          <View style={styles.detailButton}>
            <Text style={[styles.detailText, { color: primaryColor }]}>
              {t("appointments.viewDetails")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={primaryColor} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#d0d0d0" />
      <Text style={styles.emptyText}>
        {selectedStatus === "ALL"
          ? t("appointments.emptyAll")
          : t("appointments.emptyStatus", {
              status: getStatusLabel(selectedStatus),
            })}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Ionicons name="lock-closed" size={48} color="#b0b0b0" />
        <Text style={styles.centeredText}>
          {t("appointments.loginRequired")}
        </Text>
      </View>
    );
  }

  if (loading && appointments.length === 0) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("appointments.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("appointments.title")}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#B45309" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {renderStatusFilter()}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.appointmentId}
        renderItem={renderAppointmentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerPlaceholder: {
    width: 32,
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ededed",
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f3ff",
  },
  sectionLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    marginTop: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    marginRight: 6,
    minWidth: 68,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  noteBox: {
    marginTop: 6,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  noteLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
    fontWeight: "600",
  },
  noteText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 16,
    paddingTop: 12,
  },
  footerDate: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
  },
  centeredContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8D5",
  },
  errorText: {
    marginLeft: 8,
    color: "#B45309",
    fontSize: 13,
    flex: 1,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import treatmentRoutineService from "@/services/treatmentRoutineService";
import {
  RoutineStatus,
  TreatmentRoutine,
} from "@/types/treatment-routine.type";

type FilterStatus = RoutineStatus | "ALL";

const statusOrder: FilterStatus[] = [
  "ALL",
  RoutineStatus.ACTIVE,
  RoutineStatus.COMPLETED,
  RoutineStatus.CANCELLED,
];

const statusMeta: Record<RoutineStatus, { color: string; icon: string }> = {
  [RoutineStatus.ACTIVE]: {
    color: "#22C55E",
    icon: "pulse",
  },
  [RoutineStatus.COMPLETED]: {
    color: "#3B82F6",
    icon: "checkmark-circle",
  },
  [RoutineStatus.CANCELLED]: {
    color: "#EF4444",
    icon: "close-circle",
  },
};

const defaultStatusMeta = { color: "#64748B", icon: "help-circle" };

const formatDate = (isoDate: string, fallback: string) => {
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

export default function MyRoutinesScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { primaryColor } = useThemeColor();
  const { isAuthenticated, user } = useAuth();
  const notAvailableLabel = t("common.notAvailable");

  const [allRoutines, setAllRoutines] = useState<TreatmentRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("ALL");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusFilters = useMemo(() => {
    return statusOrder.map((status) => {
      if (status === "ALL") {
        return { key: status, label: t("routines.status.all") };
      }
      return {
        key: status,
        label: t(`routines.status.${status.toLowerCase()}`),
      };
    });
  }, [t]);

  const getStatusLabel = useCallback(
    (status: FilterStatus | RoutineStatus) => {
      if (status === "ALL") {
        return t("routines.status.all");
      }
      return t(`routines.status.${status.toLowerCase()}`);
    },
    [t]
  );

  useEffect(() => {
    let isActive = true;

    const loadCustomer = async () => {
      if (!isAuthenticated || !user?.userId) {
        setCustomerId(null);
        setAllRoutines([]);
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
          setError(t("routines.customerNotFound"));
          setCustomerId(null);
          setAllRoutines([]);
        } else {
          setError(null);
          setCustomerId(customer.customerId);
        }
      } catch (err) {
        console.error("Failed to load customer profile:", err);
        if (isActive) {
          setError(t("routines.error"));
          setCustomerId(null);
          setAllRoutines([]);
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

  const fetchRoutines = useCallback(
    async (showSpinner = true, statusFilter?: RoutineStatus) => {
      if (!customerId) {
        return;
      }

      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await treatmentRoutineService.getCustomerRoutines(
          customerId,
          undefined,
          statusFilter
        );
        setAllRoutines(data || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load routines:", err);
        setError(t("routines.error"));
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
    const statusFilter = selectedStatus === "ALL" ? undefined : selectedStatus;
    fetchRoutines(true, statusFilter as RoutineStatus | undefined);
  }, [customerId, isFocused, fetchRoutines, selectedStatus]);

  const handleRefresh = useCallback(async () => {
    if (!customerId) {
      return;
    }
    const statusFilter = selectedStatus === "ALL" ? undefined : selectedStatus;
    await fetchRoutines(false, statusFilter as RoutineStatus | undefined);
  }, [customerId, fetchRoutines, selectedStatus]);

  const filteredRoutines = useMemo(() => {
    return allRoutines;
  }, [allRoutines]);

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

  const renderRoutineItem = ({ item }: { item: TreatmentRoutine }) => {
    const meta = statusMeta[item.status] || defaultStatusMeta;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(stacks)/TreatmentRoutineDetailScreen",
            params: { routineId: item.routineId },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.routineName}>{item.routineName}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: hexToRgba(meta.color, 0.15) },
            ]}
          >
            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>{t("routines.cards.created")}</Text>
            <Text style={styles.infoValue}>
              {formatDate(item.createdAt, notAvailableLabel)}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text></Text>
          <View style={styles.detailButton}>
            <Text style={[styles.detailText, { color: primaryColor }]}>
              {t("routines.viewDetails")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={primaryColor} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color="#d0d7e1" />
      <Text style={styles.emptyText}>
        {selectedStatus === "ALL"
          ? t("routines.emptyAll")
          : t("routines.emptyStatus", {
              status: getStatusLabel(selectedStatus),
            })}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Ionicons name="lock-closed" size={48} color="#b0b8c4" />
        <Text style={styles.centeredText}>{t("routines.loginRequired")}</Text>
      </View>
    );
  }

  if (loading && allRoutines.length === 0) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("routines.loading")}</Text>
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
        <Text style={styles.headerTitle}>{t("routines.title")}</Text>
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
        data={filteredRoutines}
        keyExtractor={(item) => item.routineId}
        renderItem={renderRoutineItem}
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
    backgroundColor: "#f5f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e4eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerPlaceholder: {
    width: 32,
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e4eb",
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e9edf5",
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 13,
    color: "#475569",
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
  routineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 12,
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
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 8,
    marginRight: 6,
    minWidth: 70,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eef1f7",
    marginTop: 16,
    paddingTop: 12,
  },
  footerStatus: {
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
    color: "#6b7280",
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
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#64748B",
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

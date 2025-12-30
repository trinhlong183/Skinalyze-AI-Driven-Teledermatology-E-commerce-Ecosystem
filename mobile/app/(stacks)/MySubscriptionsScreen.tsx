import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import customerSubscriptionService from "@/services/customerSubscriptionService";
import dermatologistService from "@/services/dermatologistService";
import { CustomerSubscription } from "@/types/customerSubscription.type";
import { Dermatologist } from "@/types/dermatologist.type";

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

export default function MySubscriptionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { primaryColor } = useThemeColor();
  const { isAuthenticated } = useAuth();

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(
    []
  );
  const [dermatologists, setDermatologists] = useState<
    Record<string, Dermatologist>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "inactive">("active");

  const filterOptions = useMemo(
    () => [
      { key: "active" as const, label: t("mySubscriptions.filters.active") },
      {
        key: "inactive" as const,
        label: t("mySubscriptions.filters.inactive"),
      },
    ],
    [t]
  );

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((item) =>
      filter === "active" ? item.isActive : !item.isActive
    );
  }, [filter, subscriptions]);

  const fetchSubscriptions = useCallback(
    async (showSpinner = true) => {
      if (!isAuthenticated) {
        setSubscriptions([]);
        setDermatologists({});
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data =
          await customerSubscriptionService.getMyActiveSubscriptions();

        setSubscriptions(data);
        setError(null);

        const uniqueDermatologistIds = Array.from(
          new Set(
            data
              .map((item) => {
                const planDermatologistId =
                  (item.subscriptionPlan as any)?.dermatologistId ??
                  (item.subscriptionPlan as any)?.dermatologist
                    ?.dermatologistId;
                return (
                  item.dermatologist?.dermatologistId || planDermatologistId
                );
              })
              .filter((id): id is string => Boolean(id))
          )
        );

        if (uniqueDermatologistIds.length === 0) {
          setDermatologists({});
        } else {
          const dermatologistEntries = await Promise.all(
            uniqueDermatologistIds.map(async (id) => {
              try {
                const dermatologist =
                  await dermatologistService.getDermatologistById(id);
                return [id, dermatologist] as const;
              } catch (err) {
                console.error(
                  `Failed to fetch dermatologist with id ${id}:`,
                  err
                );
                return null;
              }
            })
          );

          const dermatologistMap: Record<string, Dermatologist> = {};
          dermatologistEntries.forEach((entry) => {
            if (!entry) {
              return;
            }
            const [id, dermatologist] = entry;
            dermatologistMap[id] = dermatologist;
          });

          setDermatologists(dermatologistMap);
        }
      } catch (err) {
        console.error("Failed to load subscriptions:", err);
        setError(t("mySubscriptions.error"));
        setSubscriptions([]);
        setDermatologists({});
      } finally {
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [isAuthenticated, t]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptions(true);
    }, [fetchSubscriptions])
  );

  const handleRefresh = useCallback(async () => {
    await fetchSubscriptions(false);
  }, [fetchSubscriptions]);

  const renderSubscription = ({ item }: { item: CustomerSubscription }) => {
    const fallback = t("common.notAvailable");
    const planName =
      item.subscriptionPlan?.planName || t("mySubscriptions.unknownPlan");

    const dermatologistId =
      item.dermatologist?.dermatologistId ||
      (item.subscriptionPlan as any)?.dermatologistId ||
      (item.subscriptionPlan as any)?.dermatologist?.dermatologistId;
    const dermatologist = dermatologistId
      ? dermatologists[dermatologistId]
      : undefined;
    const dermatologistName = dermatologist?.user?.fullName;
    const dermatologistPhotoUrl = dermatologist?.user?.photoUrl;

    const sessionsLabel = t("mySubscriptions.sessionsRemaining", {
      count: item.sessionsRemaining,
    });

    if (!item.isActive) {
      const expiredOn = t("mySubscriptions.expiredOn", {
        date: formatDate(item.endDate, fallback),
      });

      return (
        <View style={[styles.card, styles.cardInactive]}>
          <View style={styles.cardHeader}>
            <Text style={styles.planName}>{planName}</Text>
            <View style={styles.inactiveBadge}>
              <Ionicons name="pause" size={14} color="#475569" />
              <Text style={styles.inactiveBadgeText}>
                {t("mySubscriptions.inactiveTag")}
              </Text>
            </View>
          </View>

          <View style={styles.dermatologistRow}>
            <View style={styles.avatarWrapper}>
              {dermatologistPhotoUrl ? (
                <Image
                  source={{ uri: dermatologistPhotoUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: hexToRgba(primaryColor, 0.08) },
                  ]}
                >
                  <Ionicons name="medkit" size={20} color={primaryColor} />
                </View>
              )}
            </View>
            <View>
              <Text style={styles.sectionLabel}>
                {t("mySubscriptions.dermatologist")}
              </Text>
              <Text style={styles.dermatologistName}>
                {dermatologistName ||
                  t("mySubscriptions.fallbackDermatologist")}
              </Text>
            </View>
          </View>

          <Text style={styles.expiredText}>{expiredOn}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="refresh" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>
              {t("mySubscriptions.sessionsRemainingLabel")}
            </Text>
            <Text style={styles.infoValue}>{sessionsLabel}</Text>
          </View>

          <TouchableOpacity
            style={styles.viewPlanButtonInactive}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(stacks)/SubscriptionPlanDetailScreen",
                params: { planId: item.subscriptionPlan?.planId },
              })
            }
          >
            <Text style={styles.viewPlanTextInactive}>
              {t("mySubscriptions.viewPlan")}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#334155" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.planName}>{planName}</Text>
          <View
            style={[
              styles.sessionsBadge,
              { backgroundColor: hexToRgba(primaryColor, 0.15) },
            ]}
          >
            <Ionicons
              name="repeat"
              size={16}
              color={primaryColor}
              style={styles.sessionsIcon}
            />
            <Text style={[styles.sessionsText, { color: primaryColor }]}>
              {sessionsLabel}
            </Text>
          </View>
        </View>

        <View style={styles.dermatologistRow}>
          <View style={styles.avatarWrapper}>
            {dermatologistPhotoUrl ? (
              <Image
                source={{ uri: dermatologistPhotoUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: hexToRgba(primaryColor, 0.12) },
                ]}
              >
                <Ionicons name="medkit" size={20} color={primaryColor} />
              </View>
            )}
          </View>
          <View>
            <Text style={styles.sectionLabel}>
              {t("mySubscriptions.dermatologist")}
            </Text>
            <Text style={styles.dermatologistName}>
              {dermatologistName || t("mySubscriptions.fallbackDermatologist")}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748B" />
          <Text style={styles.infoLabel}>{t("mySubscriptions.startDate")}</Text>
          <Text style={styles.infoValue}>
            {formatDate(item.startDate, fallback)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#64748B" />
          <Text style={styles.infoLabel}>{t("mySubscriptions.endDate")}</Text>
          <Text style={styles.infoValue}>
            {formatDate(item.endDate, fallback)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.viewPlanButton, { backgroundColor: primaryColor }]}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/(stacks)/SubscriptionPlanDetailScreen",
              params: { planId: item.subscriptionPlan?.planId },
            })
          }
        >
          <Text style={styles.viewPlanText}>
            {t("mySubscriptions.viewPlan")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="albums-outline" size={64} color="#d0d7e1" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Ionicons name="lock-closed" size={48} color="#b0b8c4" />
        <Text style={styles.centeredText}>
          {t("mySubscriptions.loginRequired")}
        </Text>
      </View>
    );
  }

  if (loading && subscriptions.length === 0) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("mySubscriptions.loading")}</Text>
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
          <Ionicons name="arrow-back" size={24} color="#1F2933" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("mySubscriptions.title")}</Text>
      </View>

      <View style={styles.filterContainer}>
        {filterOptions.map((option) => {
          const isSelected = filter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                isSelected && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(option.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isSelected && styles.filterButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubscription}
        contentContainerStyle={
          filteredSubscriptions.length === 0
            ? styles.flatListEmptyContent
            : styles.flatListContent
        }
        ListEmptyComponent={
          !loading
            ? () =>
                renderEmptyState(
                  filter === "active"
                    ? t("mySubscriptions.empty")
                    : t("mySubscriptions.emptyInactive")
                )
            : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
            colors={[primaryColor]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  centeredContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centeredText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5E6B7A",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5E6B7A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2F8",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2933",
  },
  flatListContent: {
    padding: 20,
    paddingBottom: 32,
  },
  flatListEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2933",
    marginRight: 12,
  },
  sessionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sessionsIcon: {
    marginRight: 6,
  },
  sessionsText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dermatologistRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    color: "#8895A7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dermatologistName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#5E6B7A",
    marginHorizontal: 8,
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2933",
    fontWeight: "500",
  },
  viewPlanButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  viewPlanText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5E6B7A",
    textAlign: "center",
  },
  errorText: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    fontSize: 14,
  },
  cardInactive: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  inactiveBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 6,
  },
  expiredText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  viewPlanButtonInactive: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  viewPlanTextInactive: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
});

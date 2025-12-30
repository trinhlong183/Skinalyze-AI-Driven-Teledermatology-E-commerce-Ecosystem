import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  StatusBar,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dermatologistService from "@/services/dermatologistService";
import { Dermatologist } from "@/types/dermatologist.type";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import ToTopButton from "@/components/ToTopButton";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert";

export default function DermatologistListScreen() {
  const [dermatologists, setDermatologists] = useState<Dermatologist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToTop, setShowToTop] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation("translation", {
    keyPrefix: "dermatologistList",
  });
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchDermatologists();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const fetchDermatologists = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dermatologistService.getDermatologistList();
      setDermatologists(data);
    } catch (err: any) {
      const errorMessage = err?.message || t("errors.fetch");
      setError(errorMessage);
      setAlertMessage(errorMessage);
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowToTop(offsetY > 200);
  };

  const handlePressDermatologist = (id: string) => {
    router.push({
      pathname: "/(stacks)/DermatologistDetailScreen",
      params: { dermatologistId: id },
    });
  };

  const renderItem = ({ item }: { item: Dermatologist }) => {
    const fullName = item.user?.fullName || t("fallbacks.dermatologist");
    const specialties =
      item.specialization?.join(", ") || t("fallbacks.specialist");
    const ratingNumber =
      item.averageRating !== undefined && item.averageRating !== null
        ? Number(item.averageRating)
        : null;
    const ratingText =
      ratingNumber !== null && !Number.isNaN(ratingNumber)
        ? t("rating.withCount", {
            rating: ratingNumber.toFixed(1),
            count: item?.totalReviews ?? 0,
          })
        : t("rating.noRatings");
    const avatarUrl = item.user?.photoUrl;

    const experienceLabel = t("experienceLabel", {
      years: item.yearsOfExperience || item.yearsOfExp || 0,
    });

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          style={styles.doctorCard}
          onPress={() => handlePressDermatologist(item.dermatologistId)}
          activeOpacity={0.7}
        >
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatarWrapper,
                { borderColor: `${primaryColor}30` },
              ]}
            >
              <Image
                style={styles.avatar}
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: primaryColor },
                ]}
              >
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.specialty} numberOfLines={1}>
              {specialties}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="briefcase" size={14} color={primaryColor} />
                <Text style={[styles.statText, { color: primaryColor }]}>
                  {experienceLabel}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text style={styles.statText} numberOfLines={1}>
                  {ratingText}
                </Text>
              </View>
            </View>

            {/* Price Tag */}
            {!!item.defaultSlotPrice && (
              <View
                style={[
                  styles.priceTag,
                  { backgroundColor: `${primaryColor}10` },
                ]}
              >
                <Ionicons name="cash-outline" size={14} color={primaryColor} />
                <Text style={[styles.priceText, { color: primaryColor }]}>
                  {t("priceLabel", {
                    price: item.defaultSlotPrice.toLocaleString(),
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <View style={styles.actionButton}>
            <Ionicons name="chevron-forward" size={24} color={primaryColor} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View
            style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]}
          />
          <View
            style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]}
          />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <View
            style={[
              styles.loadingIcon,
              { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
        <CustomAlert
          visible={alertVisible}
          title={t("alert.title")}
          message={alertMessage || t("errors.fetch")}
          onConfirm={() => setAlertVisible(false)}
          onCancel={() => setAlertVisible(false)}
          type="error"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

        <View style={styles.backgroundPattern}>
          <View
            style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]}
          />
          <View
            style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]}
          />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>{t("errors.title")}</Text>
          <Text style={styles.errorText}>{error || t("errors.fetch")}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={fetchDermatologists}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t("actions.retry")}</Text>
          </TouchableOpacity>
        </View>
        <CustomAlert
          visible={alertVisible}
          title={t("alert.title")}
          message={alertMessage || t("errors.fetch")}
          onConfirm={() => setAlertVisible(false)}
          onCancel={() => setAlertVisible(false)}
          type="error"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View
          style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]}
        />
        <View
          style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]}
        />
      </View>

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: `${primaryColor}15` },
            ]}
          >
            <Ionicons name="people" size={20} color={primaryColor} />
          </View>
          <Text style={styles.headerTitle}>{t("title")}</Text>
        </View>

        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Stats Card */}
      {dermatologists.length > 0 && (
        <Animated.View
          style={[
            styles.statsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.statCardItem}>
            <View
              style={[
                styles.statCardIcon,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons name="medical" size={20} color={primaryColor} />
            </View>
            <View>
              <Text style={styles.statCardValue}>{dermatologists.length}</Text>
              <Text style={styles.statCardLabel}>
                {t("stats.availableLabel")}
              </Text>
            </View>
          </View>

          <View style={styles.statCardDivider} />

          <View style={styles.statCardItem}>
            <View style={[styles.statCardIcon, { backgroundColor: "#F0F9FF" }]}>
              <Ionicons name="star" size={20} color="#2196F3" />
            </View>
            <View>
              <Text style={styles.statCardValue}>
                {t("stats.verifiedValue")}
              </Text>
              <Text style={styles.statCardLabel}>
                {t("stats.verifiedLabel")}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Dermatologist List */}
      <FlatList
        ref={flatListRef}
        data={dermatologists}
        renderItem={renderItem}
        keyExtractor={(item) => item.dermatologistId}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: `${primaryColor}10` },
              ]}
            >
              <Ionicons name="people-outline" size={56} color={primaryColor} />
            </View>
            <Text style={styles.emptyTitle}>{t("empty.title")}</Text>
            <Text style={styles.emptySubtitle}>{t("empty.subtitle")}</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: primaryColor }]}
              onPress={fetchDermatologists}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>{t("actions.refresh")}</Text>
            </TouchableOpacity>
          </Animated.View>
        }
      />

      {/* Scroll to Top Button */}
      <ToTopButton
        visible={showToTop}
        onPress={() =>
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
        }
      />
      <CustomAlert
        visible={alertVisible}
        title={t("alert.title")}
        message={alertMessage || t("errors.fetch")}
        onConfirm={() => setAlertVisible(false)}
        onCancel={() => setAlertVisible(false)}
        type="error"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -150,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    left: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statCardDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarWrapper: {
    position: "relative",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backgroundColor: "#F0F0F0",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  specialty: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 6,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    flexShrink: 1,
    minWidth: 0,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  priceText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFE8E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

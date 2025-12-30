import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dermatologistService, {
  Specialization,
} from "@/services/dermatologistService";
import ReviewDermaInfor from "@/components/ReviewDermaInfor";
import { Dermatologist } from "@/types/dermatologist.type";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert"; // Make sure path is correct

const { width } = Dimensions.get("window");

export default function DermatologistDetailScreen() {
  const [dermatologist, setDermatologist] = useState<Dermatologist | null>(
    null
  );
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [patientCount, setPatientCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [specializationsLoading, setSpecializationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { primaryColor } = useThemeColor();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const { dermatologistId } = useLocalSearchParams<{
    dermatologistId: string;
  }>();

  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    onConfirm: () => void;
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
    if (!dermatologistId) {
      setError(t("dermatologistDetail.errors.noId"));
      setIsLoading(false);
      return;
    }

    const fetchDermatologistDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await dermatologistService.getDermatologistById(
          dermatologistId
        );
        setDermatologist(data);

        // Fetch specializations
        fetchSpecializations();
        fetchPatientCount();
      } catch (err: any) {
        const errorMessage =
          err?.message || t("dermatologistDetail.errors.fetch");
        setError(errorMessage);
        
        // Use CustomAlert instead of native Alert
        setAlertConfig({
          visible: true,
          title: t("common.error"),
          message: errorMessage,
          type: "error",
          onConfirm: hideAlert
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSpecializations = async () => {
      try {
        setSpecializationsLoading(true);
        const data = await dermatologistService.getSpecializations(
          dermatologistId
        );
        setSpecializations(data);
      } catch (err: any) {
        console.error("Error fetching specializations:", err);
        // Don't show error alert, just log it as per original logic
      } finally {
        setSpecializationsLoading(false);
      }
    };

    const fetchPatientCount = async () => {
      try {
        const count = await dermatologistService.getPatientCount(
          dermatologistId
        );
        setPatientCount(count);
      } catch (err) {
        console.error("Error fetching patient count:", err);
      }
    };

    fetchDermatologistDetail();
  }, [dermatologistId]);

  useEffect(() => {
    if (!isLoading && dermatologist) {
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
  }, [isLoading, dermatologist]);

  // Animated header background
  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (isLoading) {
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
          <Text style={styles.loadingText}>
            {t("dermatologistDetail.loading")}
          </Text>
        </View>
      </View>
    );
  }

  if (error || !dermatologist) {
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
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>
            {t("dermatologistDetail.errors.general")}
          </Text>
          <Text style={styles.errorText}>
            {error || t("dermatologistDetail.errors.notFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>
              {t("dermatologistDetail.goBack")}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Render CustomAlert even in error state if triggered */}
        <CustomAlert 
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          confirmText={t("common.ok")}
        />
      </View>
    );
  }

  const fullName =
    dermatologist.user?.fullName || t("dermatologistDetail.fallbacks.doctor");
  const specialties =
    dermatologist.specialization?.join(", ") ||
    t("dermatologistDetail.fallbacks.specialist");
  const avatarUrl = dermatologist.user?.photoUrl;
  const price = dermatologist.defaultSlotPrice;
  const yearsExp =
    dermatologist.yearsOfExperience || dermatologist.yearsOfExp || 0;

  const averageRating = dermatologist.averageRating || "N/A";

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

      {/* Animated Header */}
      <Animated.View
        style={[styles.animatedHeader, { opacity: headerBackgroundOpacity }]}
      >
        <View style={styles.animatedHeaderContent}>
          <Text style={styles.animatedHeaderTitle} numberOfLines={1}>
            {fullName}
          </Text>
        </View>
      </Animated.View>

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.avatarSection}>
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
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.doctorName}>{fullName}</Text>
            <Text style={styles.specialty}>{specialties}</Text>

            <View style={styles.experienceChip}>
              <Ionicons name="briefcase" size={16} color={primaryColor} />
              <Text style={[styles.experienceText, { color: primaryColor }]}>
                {t("dermatologistDetail.header.experience", {
                  count: yearsExp,
                })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: "#F0F9FF" }]}>
              <Ionicons name="star" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{averageRating}</Text>
            <Text style={styles.statLabel}>
              {t("dermatologistDetail.header.rating")}
            </Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="people" size={24} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>
              {patientCount > 0 ? `${patientCount}+` : "0"}
            </Text>
            <Text style={styles.statLabel}>
              {t("dermatologistDetail.header.patients")}
            </Text>
          </View>

          <View style={styles.statBox}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${primaryColor}10` },
              ]}
            >
              <Ionicons name="calendar" size={24} color={primaryColor} />
            </View>
            <Text style={styles.statValue}>{yearsExp}</Text>
            <Text style={styles.statLabel}>
              {t("dermatologistDetail.header.yearsExpShort")}
            </Text>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardHeaderIcon,
                { backgroundColor: `${primaryColor}10` },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={styles.cardTitle}>
              {t("dermatologistDetail.sections.about")}
            </Text>
          </View>
          <Text style={styles.bioText}>{dermatologist.about}</Text>
        </Animated.View>

        {/* Specializations & Certifications */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[styles.cardHeaderIcon, { backgroundColor: "#FCE4EC" }]}
            >
              <Ionicons name="medal" size={20} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>
              {t("dermatologistDetail.sections.specializations")}
            </Text>
          </View>

          {specializationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={styles.certificationsLoadingText}>
                {t("dermatologistDetail.sections.certificationsLoading")}
              </Text>
            </View>
          ) : specializations.length > 0 ? (
            <View style={styles.certificationsContainer}>
              {specializations.map((spec) => (
                <View
                  key={spec.specializationId}
                  style={[
                    styles.certificateCard,
                    { borderLeftColor: primaryColor },
                  ]}
                >
                  {/* Certificate Image */}
                  {spec.certificateImageUrl && (
                    <Image
                      source={{ uri: spec.certificateImageUrl }}
                      style={styles.certificateImage}
                      resizeMode="cover"
                    />
                  )}

                  {/* Certificate Details */}
                  <View style={styles.certificateDetails}>
                    <View style={styles.certificateHeader}>
                      <View
                        style={[
                          styles.levelBadge,
                          { backgroundColor: `${primaryColor}15` },
                        ]}
                      >
                        <Ionicons
                          name="ribbon"
                          size={14}
                          color={primaryColor}
                        />
                        <Text
                          style={[styles.levelText, { color: primaryColor }]}
                        >
                          {spec.level}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.certificateName}>
                      {spec.specializationName}
                    </Text>
                    <Text style={styles.certificateSpecialty}>
                      {spec.specialty}
                    </Text>

                    {spec.description && (
                      <Text style={styles.certificateDescription}>
                        {spec.description}
                      </Text>
                    )}

                    <View style={styles.certificateInfo}>
                      <View style={styles.infoRow}>
                        <Ionicons name="business" size={14} color="#666" />
                        <Text style={styles.infoText}>
                          {spec.issuingAuthority}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar" size={14} color="#666" />
                        <Text style={styles.infoText}>
                          {t("dermatologistDetail.labels.issued")}{" "}
                          {new Date(spec.issueDate).toLocaleDateString(locale, {
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      {spec.expiryDate && (
                        <View style={styles.infoRow}>
                          <Ionicons name="time" size={14} color="#666" />
                          <Text style={styles.infoText}>
                            {t("dermatologistDetail.labels.expires")}{" "}
                            {new Date(spec.expiryDate).toLocaleDateString(
                              locale,
                              {
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySpecializations}>
              <Ionicons name="medal-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>
                {t("dermatologistDetail.sections.noCertifications")}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ReviewDermaInfor
            dermatologistId={dermatologistId}
            primaryColor={primaryColor}
          />
        </Animated.View>

        {/* Pricing */}
        <Animated.View
          style={[
            styles.pricingCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.pricingHeader}>
            <View>
              <Text style={styles.pricingLabel}>
                {t("dermatologistDetail.pricing.label")}
              </Text>
              <Text style={[styles.pricingValue, { color: primaryColor }]}>
                {price
                  ? `${price.toLocaleString()} VND`
                  : t("dermatologistDetail.pricing.contact")}
              </Text>
              <Text style={styles.pricingSubtext}>
                {t("dermatologistDetail.pricing.perSession")}
              </Text>
            </View>
            <View
              style={[
                styles.pricingIcon,
                { backgroundColor: `${primaryColor}15` },
              ]}
            >
              <Ionicons name="cash" size={32} color={primaryColor} />
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* View Plans Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.secondaryButton,
              { borderColor: primaryColor },
            ]}
            onPress={() => {
              router.push({
                pathname: "/(stacks)/SubscriptionPlanListScreen",
                params: {
                  dermatologistId: dermatologistId,
                  doctorName: fullName,
                },
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="albums" size={22} color={primaryColor} />
            <View style={styles.actionButtonContent}>
              <Text style={[styles.actionButtonTitle, { color: primaryColor }]}>
                {t("dermatologistDetail.actions.subscriptionPlans")}
              </Text>
              <Text style={styles.actionButtonSubtitle}>
                {t("dermatologistDetail.actions.viewPackages")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={primaryColor} />
          </TouchableOpacity>

          {/* Book Appointment Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: primaryColor },
            ]}
            onPress={() => {
              router.push({
                pathname: "/(stacks)/BookingCalendarScreen",
                params: {
                  dermatologistId: dermatologistId,
                },
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={22} color="#FFFFFF" />
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitlePrimary}>
                {t("dermatologistDetail.actions.bookAppointment")}
              </Text>
              <Text style={styles.actionButtonSubtitlePrimary}>
                {t("dermatologistDetail.actions.viewTimeSlots")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Integrate CustomAlert at the root of the component */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText={t("common.ok")}
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
    height: 400,
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
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  animatedHeaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  animatedHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 20,
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
  profileHeader: {
    backgroundColor: "#FFFFFF",
    marginTop: 90,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarSection: {
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    padding: 3,
    marginBottom: 16,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 57,
    backgroundColor: "#F0F0F0",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  doctorName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  specialty: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
    marginBottom: 16,
    textAlign: "center",
  },
  experienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  experienceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  bioText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 24,
  },

  specializationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specializationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#FAFAFA",
  },
  specializationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  certificationsContainer: {
    gap: 16,
  },
  certificateCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    overflow: "hidden",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  certificateImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#E0E0E0",
  },
  certificateDetails: {
    padding: 16,
  },
  certificateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  certificateName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  certificateSpecialty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  certificateDescription: {
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
    marginBottom: 12,
  },
  certificateInfo: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
  },
  certificationsLoadingText: {
    fontSize: 14,
    color: "#666",
  },
  emptySpecializations: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  pricingCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pricingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginBottom: 6,
  },
  pricingValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  pricingSubtext: {
    fontSize: 13,
    color: "#999",
  },
  pricingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsContainer: {
    marginHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  actionButtonTitlePrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  actionButtonSubtitlePrimary: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.8,
  },
});
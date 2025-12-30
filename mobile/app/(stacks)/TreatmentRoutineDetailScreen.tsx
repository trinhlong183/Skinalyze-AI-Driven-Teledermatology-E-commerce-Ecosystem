import React, { useState, useEffect, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Linking,
  StatusBar,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import treatmentRoutineService from "@/services/treatmentRoutineService";
import productService from "@/services/productService";

import { TreatmentRoutine } from "@/types/treatment-routine.type";
import { RoutineDetail, RoutineProductItem } from "@/types/routine-detail.type";
import CustomAlert from "@/components/CustomAlert";

const formatDate = (isoDate: string, fallback: string) => {
  if (!isoDate) return fallback;
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short", // Changed to Short Month (e.g., 28 Oct 2025)
    year: "numeric",
  });
};

const STEP_ORDER: Record<string, number> = {
  morning: 1,
  noon: 2,
  evening: 3,
  oral: 4,
  other: 5,
};

// Map icon and colors (labels injected via i18n)
const getStepConfig = (type?: string, labels?: Record<string, string>) => {
  switch (type) {
    case "morning":
      return {
        label: labels?.morning || "Morning Routine",
        iconName: "weather-sunny",
        iconLib: MaterialCommunityIcons,
        color: "#fff7ed",
        iconColor: "#f59e0b",
      };
    case "noon":
      return {
        label: labels?.noon || "Noon Routine",
        iconName: "sun",
        iconLib: Feather,
        color: "#f0f9ff",
        iconColor: "#0ea5e9",
      };
    case "evening":
      return {
        label: labels?.evening || "Evening Routine",
        iconName: "weather-night",
        iconLib: MaterialCommunityIcons,
        color: "#eef2ff",
        iconColor: "#6366f1",
      };
    case "oral":
      return {
        label: labels?.oral || "Oral Medication",
        iconName: "pill",
        iconLib: MaterialCommunityIcons,
        color: "#fef2f2",
        iconColor: "#ef4444",
      };
    default:
      return {
        label: labels?.other || "Other / Extra",
        iconName: "star-four-points-outline",
        iconLib: MaterialCommunityIcons,
        color: "#f5f3ff",
        iconColor: "#8b5cf6",
      };
  }
};

type AlertType = "success" | "error" | "warning" | "info";
type ProductRowLabels = {
  formatDose: (value: string) => string;
  externalLinkMissing: string;
  externalLinkError: string;
  infoTitle: string;
  errorTitle: string;
};

const ProductItemRow = ({
  item,
  onShowAlert,
  labels,
}: {
  item: RoutineProductItem;
  onShowAlert: (title: string, message: string, type?: AlertType) => void;
  labels: ProductRowLabels;
}) => {
  const router = useRouter();
  const [productImage, setProductImage] = useState<string | null>(null);

  // --- NEW: Fetch Product Image Logic ---
  useEffect(() => {
    let isMounted = true;

    const fetchProductImage = async () => {
      // Only fetch if it's an internal product and has an ID
      if (!item.isExternal && item.productId) {
        try {
          const productData = await productService.getProductById(
            item.productId
          );
          if (isMounted && productData?.productImages?.length > 0) {
            setProductImage(productData.productImages[0]);
          }
        } catch (err) {
          // Silently fail or log error (don't break UI)
          console.log(`Failed to fetch image for ${item.productId}`, err);
        }
      }
    };

    fetchProductImage();

    return () => {
      isMounted = false;
    };
  }, [item.productId, item.isExternal]);

  const handlePress = async () => {
    if (item.isExternal) {
      if (item.externalLink) {
        const supported = await Linking.canOpenURL(item.externalLink);
        if (supported) {
          await Linking.openURL(item.externalLink);
        } else {
          onShowAlert(labels.errorTitle, labels.externalLinkError, "error");
        }
      } else {
        onShowAlert(labels.infoTitle, labels.externalLinkMissing, "info");
      }
    } else {
      if (item.productId) {
        router.push({
          pathname: "/(stacks)/ProductDetailScreen",
          params: { productId: item.productId },
        });
      }
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        pressed && styles.pressedCard,
      ]}
      onPress={handlePress}
    >
      {/* Icon Box OR Product Image */}
      <View
        style={[
          styles.iconBox,
          item.isExternal ? styles.iconExternal : styles.iconInternal,
        ]}
      >
        {productImage ? (
          // IF we have an image from API -> Show
          <Image
            source={{ uri: productImage }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          // ELSE -> Show default Icon
          <>
            {item.isExternal ? (
              <Feather name="external-link" size={20} color="#64748b" />
            ) : (
              <MaterialCommunityIcons
                name="flask-outline"
                size={20}
                color="#0ea5e9"
              />
            )}
          </>
        )}
      </View>

      {/* Main Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.productName}</Text>

        <View style={styles.metaRow}>
          {item.usage && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {labels.formatDose(item.usage)}
              </Text>
            </View>
          )}
          {item.frequency && (
            <Text style={styles.metaText}>• {item.frequency}</Text>
          )}
        </View>

        {/* Doctor's Note */}
        {item.note && <Text style={styles.doctorNote}>📝 {item.note}</Text>}
      </View>

      <Feather name="chevron-right" size={20} color="#cbd5e1" />
    </Pressable>
  );
};

// Component: Routine Section (Morning/Noon...)
const RoutineSection = ({
  data,
  labels,
  onShowAlert,
}: {
  data: RoutineDetail;
  labels: {
    emptyProducts: string;
    sectionLabels: Record<string, string>;
    productRow: ProductRowLabels;
  };
  onShowAlert: (title: string, message: string, type?: AlertType) => void;
}) => {
  const config = getStepConfig(data.stepType, labels.sectionLabels);

  // Logic: Use description as Title if 'other', else use default label
  const title =
    data.stepType === "other" && data.description
      ? data.description
      : config.label;

  const IconComponent = config.iconLib;

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={[styles.sectionHeader, { backgroundColor: config.color }]}>
        <View style={styles.headerTitleRow}>
          <IconComponent
            name={config.iconName as any}
            size={24}
            color={config.iconColor}
          />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {/* General Instruction for this time of day */}
        {data.content ? (
          <Text style={styles.sectionContentNote}>{data.content}</Text>
        ) : null}
      </View>

      {/* Product List */}
      <View style={styles.productList}>
        {data.products?.map((product, index) => (
          <ProductItemRow
            key={product.routineDetailProductId || index}
            item={product}
            labels={labels.productRow}
            onShowAlert={onShowAlert}
          />
        ))}
        {(!data.products || data.products.length === 0) && (
          <Text style={styles.emptyProductsText}>{labels.emptyProducts}</Text>
        )}
      </View>
    </View>
  );
};

// --- 3. MAIN SCREEN ---

export default function TreatmentRoutineDetailScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { t } = useTranslation();

  const translate = (key: string, options?: Record<string, any>) =>
    t(`treatmentRoutineDetail.${key}`, options);

  const [routine, setRoutine] = useState<TreatmentRoutine | null>(null);
  const [details, setDetails] = useState<RoutineDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
  }>({ visible: false, title: "", message: "", type: "info" });

  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, visible: false }));

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = "info"
  ) => setAlertState({ visible: true, title, message, type });

  useEffect(() => {
    if (!routineId) {
      setErrorKey("noId");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [routineData, detailsData] = await Promise.all([
          treatmentRoutineService.getRoutineById(routineId),
          treatmentRoutineService.getDetailsForRoutine(routineId),
        ]);
        setRoutine(routineData);
        setDetails(detailsData);
        setErrorKey(null);
      } catch (err) {
        console.error("Failed to load routine details:", err);
        setErrorKey("loadFailed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [routineId]);

  const sectionLabels = useMemo(
    () => ({
      morning: translate("sections.morning"),
      noon: translate("sections.noon"),
      evening: translate("sections.evening"),
      oral: translate("sections.oral"),
      other: translate("sections.other"),
    }),
    [t]
  );

  const productRowLabels = useMemo(
    () => ({
      formatDose: (value: string) => translate("dose", { value }),
      externalLinkMissing: translate("externalLinkMissing"),
      externalLinkError: translate("externalLinkError"),
      infoTitle: translate("infoTitle"),
      errorTitle: translate("errorTitle"),
    }),
    [t]
  );

  const processedDetails = useMemo(() => {
    if (!details) return [];
    return details
      .filter((item) => item.isActive) // 1. Only Active
      .sort((a, b) => {
        // 2. Sort by Order
        const orderA = STEP_ORDER[a.stepType || "other"] || 99;
        const orderB = STEP_ORDER[b.stepType || "other"] || 99;
        return orderA - orderB;
      });
  }, [details]);

  const statusLabel = translate(`statuses.${routine?.status}`, {
    defaultValue: routine?.status,
  });

  // --- Render ---
  if (isLoading) {
    return (
      <ActivityIndicator size="large" color="#007bff" style={styles.center} />
    );
  }

  if (errorKey || !routine) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color="#d9534f"
        />
        <Text style={styles.errorText}>
          {translate(errorKey ?? "notFound")}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>{translate("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#007bff" />
          <Text style={styles.backButtonText}>{translate("back")}</Text>
        </Pressable>

        {/* Routine Header Info */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{routine.routineName}</Text>
          <View style={styles.metaInfoRow}>
            <View style={styles.metaTag}>
              <Feather name="calendar" size={12} color="#64748b" />
              <Text style={styles.metaText}>
                {translate("created", {
                  date: formatDate(routine.createdAt, t("common.notAvailable")),
                })}
              </Text>
            </View>
            <View style={[styles.metaTag, { backgroundColor: "#dcfce7" }]}>
              <Text
                style={[
                  styles.metaText,
                  { color: "#166534", fontWeight: "bold" },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.subTitle}>{translate("subtitle")}</Text>
        </View>

        {/* Routine Sections List */}
        {processedDetails.length > 0 ? (
          processedDetails.map((item) => (
            <RoutineSection
              key={item.routineDetailId}
              data={item}
              labels={{
                emptyProducts: translate("emptyProducts"),
                sectionLabels,
                productRow: productRowLabels,
              }}
              onShowAlert={showAlert}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-text-off-outline"
              size={48}
              color="#cbd5e1"
            />
            <Text style={styles.emptyStateText}>
              {translate("emptyDetails")}
            </Text>
          </View>
        )}
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onConfirm={closeAlert}
        onCancel={closeAlert}
        type={alertState.type}
      />
    </SafeAreaView>
  );
}

// --- 4. STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Navigation
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 4,
    fontWeight: "500",
  },

  // Screen Header
  header: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  metaInfoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
  },

  // Errors & Empty States
  errorText: {
    fontSize: 16,
    color: "#d9534f",
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9534f",
    borderRadius: 8,
  },
  retryText: {
    color: "#d9534f",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
    padding: 20,
  },
  emptyStateText: {
    color: "#94a3b8",
    marginTop: 10,
    fontSize: 16,
  },

  // Section Styles
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 10,
    textTransform: "capitalize",
  },
  sectionContentNote: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
    paddingLeft: 34,
  },
  productList: {
    padding: 0,
  },
  emptyProductsText: {
    padding: 16,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 13,
  },

  // Product Card Styles
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  pressedCard: {
    backgroundColor: "#f8fafc",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden", // Ensure image respects border radius
  },
  iconInternal: {
    backgroundColor: "#e0f2fe",
  },
  iconExternal: {
    backgroundColor: "#f1f5f9",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  badge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803d",
  },

  doctorNote: {
    fontSize: 12,
    color: "#d97706",
    marginTop: 2,
    fontStyle: "italic",
  },
});

// File: app/(stacks)/PaymentSuccessScreen.tsx

import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Services & Types
import appointmentService from "@/services/appointmentService";
import orderService from "@/services/orderService";
import tokenService from "@/services/tokenService";
import paymentService from "@/services/paymentService"; // Added for payment status
import { AppointmentWithRelations } from "@/types/appointment.type";
import { Order } from "@/services/orderService";
import { PaymentStatusResponse } from "@/services/paymentService"; // Added
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import { PaymentType } from "@/types/payment.type";

type DisplayPaymentType = PaymentType | "other";

// --- Helpers ---
// (Helpers remain unchanged)
const formatTime = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
const formatDate = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "--";
  }
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const normalizeNumberParam = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
// --- End Helpers ---

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { t: tPayment } = useTranslation("translation", {
    keyPrefix: "paymentSuccess",
  });
  const { primaryColor, isDarkMode } = useThemeColor();
  const tintedPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.1),
    [primaryColor]
  );
  const subtleBorder = useMemo(
    () => hexToRgba(primaryColor, 0.15),
    [primaryColor]
  );
  const secondaryTextColor = isDarkMode ? "#d0d0d0" : "#666666";

  // Updated params: Include paymentCode and subscription metadata
  const {
    appointmentId,
    orderId,
    paymentCode,
    paymentType: paymentTypeParam,
    planId: planIdParam,
    planName: planNameParam,
    amount: amountParam,
    durationInDays: durationInDaysParam,
    totalSessions: totalSessionsParam,
  } = useLocalSearchParams<{
    appointmentId?: string;
    orderId?: string;
    paymentCode?: string;
    paymentType?: string;
    planId?: string;
    planName?: string;
    amount?: string;
    durationInDays?: string;
    totalSessions?: string;
  }>();

  const [appointment, setAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(
    null
  ); // Added
  const [isLoading, setIsLoading] = useState(true);
  const inferredPaymentType = useMemo<DisplayPaymentType>(() => {
    if (
      paymentTypeParam &&
      Object.values(PaymentType).includes(paymentTypeParam as PaymentType)
    ) {
      return paymentTypeParam as PaymentType;
    }
    if (appointmentId) return PaymentType.BOOKING;
    if (orderId) return PaymentType.ORDER;
    return "other";
  }, [paymentTypeParam, appointmentId, orderId]);
  const [paymentType, setPaymentType] =
    useState<DisplayPaymentType>(inferredPaymentType);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    planId: planIdParam ?? null,
    planName: planNameParam ?? "",
    amount: normalizeNumberParam(amountParam),
    durationInDays: normalizeNumberParam(durationInDaysParam),
    totalSessions: normalizeNumberParam(totalSessionsParam),
  });

  useEffect(() => {
    setPaymentType(inferredPaymentType);
  }, [inferredPaymentType]);

  useEffect(() => {
    setSubscriptionInfo({
      planId: planIdParam ?? null,
      planName: planNameParam ?? "",
      amount: normalizeNumberParam(amountParam),
      durationInDays: normalizeNumberParam(durationInDaysParam),
      totalSessions: normalizeNumberParam(totalSessionsParam),
    });
  }, [
    planIdParam,
    planNameParam,
    amountParam,
    durationInDaysParam,
    totalSessionsParam,
  ]);

  useEffect(() => {
    let isActive = true;

    const fetchAppointmentDetails = async () => {
      try {
        setIsLoading(true);
        setAppointment(null);
        setPaymentData(null);
        setOrder(null);
        if (!appointmentId) {
          return;
        }
        const data = await appointmentService.getAppointmentById(appointmentId);
        if (!isActive) return;
        setAppointment(data);
        setPaymentType(PaymentType.BOOKING);
      } catch (error) {
        if (isActive) {
          console.error("Failed to load appointment:", error);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    const fetchPaymentDetails = async () => {
      if (!paymentCode) {
        if (isActive) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setAppointment(null);
        const paymentStatus = await paymentService.checkPaymentStatus(
          paymentCode
        );
        if (!isActive) return;
        setPaymentData(paymentStatus);

        if (paymentStatus.paymentType === "order") {
          setPaymentType(PaymentType.ORDER);
          const orderIdToUse = paymentStatus.order?.orderId || orderId;
          if (orderIdToUse) {
            try {
              const token = await tokenService.getToken();
              if (!token) {
                throw new Error(
                  "Authentication token not found. Please log in again."
                );
              }
              const data = await orderService.getOrderById(orderIdToUse, token);
              if (!isActive) return;
              setOrder(data);
            } catch (error) {
              if (isActive) {
                console.error("Failed to load order:", error);
              }
            }
          }
        } else if (paymentStatus.paymentType === "subscription") {
          setPaymentType(PaymentType.SUBSCRIPTION);
          setSubscriptionInfo((prev) => ({
            ...prev,
            amount: prev.amount ?? paymentStatus.amount,
          }));
        } else if (paymentStatus.paymentType === "booking") {
          setPaymentType(PaymentType.BOOKING);
        } else {
          setPaymentType("other");
        }
      } catch (error) {
        if (isActive) {
          console.error("Failed to load payment details:", error);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (appointmentId) {
      fetchAppointmentDetails();
    } else {
      fetchPaymentDetails();
    }

    return () => {
      isActive = false;
    };
  }, [appointmentId, orderId, paymentCode]);

  // Navigation handler (customized per payment type)
  const goToNext = () => {
    if (paymentType === PaymentType.BOOKING) {
      router.replace({ pathname: "/(tabs)/ScheduleScreen" });
      return;
    }

    if (paymentType === PaymentType.ORDER) {
      router.replace({ pathname: "/(tabs)/HomeScreen" });
      return;
    }

    router.replace({ pathname: "/(tabs)/HomeScreen" });
  };

  const formatPaymentMethodLabel = (method?: string | null) => {
    if (!method) return tPayment("paymentMethods.subscription");
    const normalized = method.toLowerCase();
    if (normalized === "wallet") return tPayment("paymentMethods.wallet");
    if (normalized === "banking") return tPayment("paymentMethods.banking");
    if (normalized === "cash") return tPayment("paymentMethods.cash");
    return method.toUpperCase();
  };

  const formatAppointmentType = (type?: string | null) => {
    const normalized = type?.toLowerCase();
    if (normalized === "new_problem")
      return tPayment("appointmentType.newProblem");
    if (normalized === "follow_up") return tPayment("appointmentType.followUp");
    return tPayment("appointmentType.default");
  };

  const formatTimeLocalized = (isoDate: string) => {
    if (!isoDate) return t("common.notAvailable");
    return new Date(isoDate).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDateLocalized = (isoDate: string) => {
    if (!isoDate) return t("common.notAvailable");
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Updated renderContent with themed styling and subscription support
  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          size="large"
          color={primaryColor}
          style={{ marginTop: 20 }}
        />
      );
    }

    const labelStyle = [styles.label, { color: secondaryTextColor }];
    const sectionTitleStyle = [
      styles.sectionTitle,
      { color: secondaryTextColor },
    ];
    const infoCardBaseStyle = [
      styles.infoCard,
      {
        backgroundColor: isDarkMode ? "#1b1b24" : "#ffffff",
        borderColor: subtleBorder,
      },
    ];
    const infoCardAccentStyle = [
      styles.infoCard,
      {
        backgroundColor: tintedPrimary,
        borderColor: subtleBorder,
      },
    ];
    const dividerStyle = [styles.divider, { backgroundColor: subtleBorder }];
    const valueStyle = [
      styles.value,
      { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
    ];
    const emailValueStyle = [
      styles.emailValue,
      { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
    ];
    const valueAmountStyle = [styles.valueAmount, { color: primaryColor }];
    const cardTitleStyle = [styles.cardTitle, { color: primaryColor }];
    const errorTextStyle = [
      styles.errorText,
      { color: isDarkMode ? "#ff8080" : "#d9534f" },
    ];

    if (paymentType === PaymentType.BOOKING && !appointment) {
      return (
        <Text style={errorTextStyle}>{tPayment("errors.bookingMissing")}</Text>
      );
    }

    if (paymentType === PaymentType.ORDER && !order) {
      return (
        <Text style={errorTextStyle}>{tPayment("errors.orderMissing")}</Text>
      );
    }

    if (paymentType === PaymentType.SUBSCRIPTION) {
      const amountDisplay = formatCurrency(
        subscriptionInfo.amount ?? paymentData?.amount
      );
      const methodLabel = paymentCode
        ? paymentData?.paymentMethod
          ? formatPaymentMethodLabel(paymentData.paymentMethod)
          : "N/A"
        : "Wallet Balance";

      return (
        <View style={infoCardAccentStyle}>
          <Text style={cardTitleStyle}>
            {tPayment("subscriptionCard.title")}
          </Text>

          <Text style={sectionTitleStyle}>
            {tPayment("subscriptionCard.summary")}
          </Text>

          <View style={styles.row}>
            <Text style={labelStyle}>
              {tPayment("subscriptionCard.planName")}
            </Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.planName ||
                tPayment("subscriptionCard.fallbackPlan")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>
              {tPayment("subscriptionCard.duration")}
            </Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.durationInDays !== undefined
                ? tPayment("subscriptionCard.durationValue", {
                    count: subscriptionInfo.durationInDays,
                  })
                : t("common.notAvailable")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>
              {tPayment("subscriptionCard.totalSessions")}
            </Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.totalSessions !== undefined
                ? subscriptionInfo.totalSessions
                : t("common.notAvailable")}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>
            {tPayment("subscriptionCard.payment")}
          </Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.amountPaid")}</Text>
            <Text style={valueAmountStyle}>{amountDisplay}</Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.method")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {methodLabel || tPayment("paymentMethods.na")}
            </Text>
          </View>
          {paymentCode ? (
            <View style={styles.row}>
              <Text style={labelStyle}>{tPayment("labels.reference")}</Text>
              <Text style={[valueStyle, styles.valuePlain]}>{paymentCode}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (paymentType === "other") {
      return (
        <View style={infoCardAccentStyle}>
          <Text style={cardTitleStyle}>{tPayment("genericCard.title")}</Text>
          <Text style={sectionTitleStyle}>
            {tPayment("genericCard.details")}
          </Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.amountPaid")}</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(paymentData?.amount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.method")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {paymentData?.paymentMethod
                ? formatPaymentMethodLabel(paymentData.paymentMethod)
                : tPayment("paymentMethods.na")}
            </Text>
          </View>
          {paymentCode ? (
            <View style={styles.row}>
              <Text style={labelStyle}>{tPayment("labels.reference")}</Text>
              <Text style={[valueStyle, styles.valuePlain]}>{paymentCode}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (paymentType === PaymentType.BOOKING && appointment) {
      const doctorPhotoUri =
        appointment.dermatologist?.user?.photoUrl?.startsWith("data:")
          ? appointment.dermatologist.user.photoUrl
          : null;

      return (
        <View style={infoCardBaseStyle}>
          <Text style={cardTitleStyle}>{tPayment("bookingCard.title")}</Text>

          <Text style={sectionTitleStyle}>
            {tPayment("bookingCard.consultant")}
          </Text>
          <View style={styles.doctorHeader}>
            <Image
              style={styles.doctorAvatar}
              source={
                doctorPhotoUri
                  ? { uri: doctorPhotoUri }
                  : require("@/assets/images/icon.png")
              }
            />
            <View style={styles.doctorInfo}>
              <Text
                style={[
                  styles.doctorName,
                  { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
                ]}
              >
                {appointment.dermatologist?.user?.fullName ||
                  tPayment("bookingCard.fallbackDoctor")}
              </Text>
            </View>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>
            {tPayment("bookingCard.patient")}
          </Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("bookingCard.name")}</Text>
            <Text style={valueStyle}>
              {appointment.customer?.user?.fullName ||
                tPayment("bookingCard.fallbackPatient")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("bookingCard.email")}</Text>
            <Text style={emailValueStyle}>
              {appointment.customer?.user?.email}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>{tPayment("bookingCard.when")}</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("bookingCard.date")}</Text>
            <Text style={valueStyle}>
              {formatDateLocalized(appointment.startTime)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("bookingCard.time")}</Text>
            <Text style={valueStyle}>
              {`${formatTimeLocalized(
                appointment.startTime
              )} - ${formatTimeLocalized(appointment.endTime)}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("bookingCard.type")}</Text>
            <Text style={valueStyle}>
              {formatAppointmentType(appointment.appointmentType)}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>
            {tPayment("bookingCard.payment")}
          </Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.amountPaid")}</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(
                Number(appointment.payment?.amount || appointment.price)
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.method")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {formatPaymentMethodLabel(
                appointment.payment?.paymentMethod ?? undefined
              )}
            </Text>
          </View>
        </View>
      );
    }

    if (paymentType === PaymentType.ORDER && order) {
      return (
        <View style={infoCardBaseStyle}>
          <Text style={cardTitleStyle}>{tPayment("orderCard.title")}</Text>

          <Text style={sectionTitleStyle}>
            {tPayment("orderCard.orderInfo")}
          </Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("orderCard.orderId")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>{order.orderId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("orderCard.status")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>{order.status}</Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>{tPayment("orderCard.items")}</Text>
          {order.orderItems?.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={labelStyle}>
                {item.product.productName} (x{item.quantity}):
              </Text>
              <Text style={[valueStyle, styles.valuePlain]}>
                {formatCurrency(parseFloat(item.priceAtTime) * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>{tPayment("orderCard.payment")}</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.totalPaid")}</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(
                orderService.calculateOrderTotal(order.orderItems)
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>{tPayment("labels.method")}</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {order.payment?.paymentMethod
                ? formatPaymentMethodLabel(order.payment.paymentMethod)
                : paymentData?.paymentMethod
                ? formatPaymentMethodLabel(paymentData.paymentMethod)
                : tPayment("paymentMethods.banking")}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#0b0d14" : "#f6f7ff" },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={100}
            color="#28a745"
          />
        </View>

        {/* Dynamic Title and Instructions */}
        <Text style={[styles.title, { color: "#28a745" }]}>
          {paymentType === PaymentType.BOOKING
            ? tPayment("titles.booking")
            : paymentType === PaymentType.ORDER
            ? tPayment("titles.order")
            : paymentType === PaymentType.SUBSCRIPTION
            ? tPayment("titles.subscription")
            : tPayment("titles.other")}
        </Text>
        <Text style={[styles.instructions, { color: secondaryTextColor }]}>
          {paymentType === PaymentType.BOOKING
            ? tPayment("messages.booking")
            : paymentType === PaymentType.ORDER
            ? tPayment("messages.order")
            : paymentType === PaymentType.SUBSCRIPTION
            ? tPayment("messages.subscription")
            : tPayment("messages.other")}
        </Text>

        {/* Dynamic Content */}
        {renderContent()}
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: isDarkMode ? "#0f1019" : "#ffffff",
            borderColor: subtleBorder,
          },
        ]}
      >
        <Pressable
          style={[styles.scheduleButton, { backgroundColor: primaryColor }]}
          onPress={goToNext}
        >
          <Text style={styles.scheduleButtonText}>
            {paymentType === PaymentType.BOOKING
              ? tPayment("buttons.schedule")
              : paymentType === PaymentType.ORDER
              ? tPayment("buttons.shopping")
              : tPayment("buttons.home")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- STYLES --- (Unchanged, but ensure they fit both contexts)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 140,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#28a745",
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  infoCard: {
    backgroundColor: "#f5f5ff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subscriptionPlanName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e0e0",
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "right",
  },
  valuePlain: {
    textTransform: "none",
  },
  emailValue: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "none",
    flex: 1,
    textAlign: "right",
  },
  valueAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#007bff",
  },
  errorText: {
    fontSize: 15,
    color: "#d9534f",
    textAlign: "center",
    padding: 10,
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  scheduleButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  scheduleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import subscriptionPlanService from "@/services/subscriptionPlanService";
import SubscriptionPaymentModal from "@/components/SubscriptionPaymentModal";
import CustomAlert from "@/components/CustomAlert";

import { SubscriptionPlan } from "@/types/subscription-plan.type";
import customerSubscriptionService, {
  SubscriptionPaymentResponse,
} from "@/services/customerSubscriptionService";
import userService from "@/services/userService";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import { useCustomAlert } from "@/hooks/useCustomAlert";
import { PaymentType } from "@/types/payment.type";

export default function SubscriptionPlanDetailScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { t } = useTranslation();

  const { primaryColor, isDarkMode } = useThemeColor();
  const {
    alertState,
    showAlert,
    handleConfirm: handleAlertConfirm,
    handleCancel: handleAlertCancel,
  } = useCustomAlert();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentData, setPaymentData] =
    useState<SubscriptionPaymentResponse | null>(null);
  const [isCreatingBankPayment, setIsCreatingBankPayment] = useState(false);
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string>("VND");
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const tintedPrimary = useMemo(
    () => hexToRgba(primaryColor, isDarkMode ? 0.24 : 0.12),
    [primaryColor, isDarkMode]
  );
  const borderPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.35),
    [primaryColor]
  );
  const disabledPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.4),
    [primaryColor]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshWalletBalance = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoadingWallet(true);
    try {
      const data = await userService.getBalance();
      if (!isMountedRef.current) {
        return;
      }

      setWalletBalance(data.balance);
      setWalletCurrency(data.currency);
      setWalletError(null);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
      if (isMountedRef.current) {
        setWalletError(t("subscriptionPlanDetail.errors.walletBalance"));
        setWalletBalance(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingWallet(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!planId) {
      return;
    }

    refreshWalletBalance();
  }, [planId, refreshWalletBalance]);

  useEffect(() => {
    if (!planId) {
      setError(t("subscriptionPlanDetail.errors.noPlanId"));
      setIsLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        setIsLoading(true);

        const data = await subscriptionPlanService.getPlanById(planId);
        if (isMountedRef.current) {
          setPlan(data);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(t("subscriptionPlanDetail.errors.load"));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchPlan();
  }, [planId, t]);

  const handleBankTransferPayment = useCallback(async () => {
    if (!planId) {
      return;
    }

    setIsCreatingBankPayment(true);
    try {
      const response =
        await customerSubscriptionService.createSubscriptionPayment(planId);

      setPaymentData(response);
      setIsModalVisible(true);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("subscriptionPlanDetail.errors.paymentStart");
      showAlert({
        title: t("subscriptionPlanDetail.alerts.paymentErrorTitle"),
        message,
        type: "error",
      });
    } finally {
      setIsCreatingBankPayment(false);
    }
  }, [planId, showAlert, t]);

  const handleBuyWithWallet = useCallback(async () => {
    if (!planId || !plan) {
      return;
    }

    const planPrice = Number(plan.basePrice);
    if (walletBalance !== null && walletBalance < planPrice) {
      showAlert({
        title: t("subscriptionPlanDetail.alerts.insufficientTitle"),
        message: t("subscriptionPlanDetail.alerts.insufficientMessage"),
        type: "warning",
        confirmText: t("subscriptionPlanDetail.alerts.topUp"),
        cancelText: t("common.cancel"),
        onConfirm: () => router.push("/(stacks)/TopUpScreen"),
        onCancel: () => {},
      });
      return;
    }

    setIsProcessingWallet(true);
    try {
      await customerSubscriptionService.createSubscriptionWithWallet(planId);
      const amountParam = planPrice.toString();
      router.replace({
        pathname: "/(stacks)/PaymentSuccessScreen",
        params: {
          paymentType: PaymentType.SUBSCRIPTION,
          planId: plan.planId,
          planName: plan.planName,
          amount: amountParam,
          durationInDays: plan.durationInDays.toString(),
          totalSessions: plan.totalSessions.toString(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("subscriptionPlanDetail.errors.walletPurchase");
      showAlert({
        title: t("subscriptionPlanDetail.alerts.paymentErrorTitle"),
        message,
        type: "error",
      });
    } finally {
      setIsProcessingWallet(false);
    }
  }, [plan, planId, router, showAlert, t, walletBalance]);

  const handleModalClose = (didPay: boolean) => {
    setIsModalVisible(false);
    if (didPay) {
      const paymentCode = paymentData?.paymentInfo.paymentCode;
      const fallbackParams = ((planData) => {
        const fallback: Record<string, string> = {
          paymentType: PaymentType.SUBSCRIPTION,
        };
        if (planData?.planId) fallback.planId = planData.planId;
        if (planData?.planName) fallback.planName = planData.planName;
        if (planData) fallback.amount = Number(planData.basePrice).toString();
        if (planData?.durationInDays)
          fallback.durationInDays = planData.durationInDays.toString();
        if (planData?.totalSessions)
          fallback.totalSessions = planData.totalSessions.toString();
        return fallback;
      })(plan);

      const navigationParams = paymentCode
        ? { paymentCode, ...fallbackParams }
        : fallbackParams;

      setPaymentData(null);
      router.replace({
        pathname: "/(stacks)/PaymentSuccessScreen",
        params: navigationParams,
      });
      return;
    }
    setPaymentData(null);
  };

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }
  if (error || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || t("subscriptionPlanDetail.errors.notFound")}
        </Text>
      </View>
    );
  }

  const planPrice = Number(plan.basePrice);
  const formattedPlanPrice = planPrice.toLocaleString("vi-VN");
  const walletInsufficient =
    walletBalance !== null && walletBalance < planPrice;
  const walletActionDisabled =
    isProcessingWallet ||
    isLoadingWallet ||
    walletBalance === null ||
    walletInsufficient ||
    !!walletError;
  const isPlanActive = plan.isActive;
  const durationText = t("subscriptionPlanDetail.card.days", {
    count: plan.durationInDays,
  });
  const descriptionText =
    plan.planDescription || t("subscriptionPlanDetail.card.noDescription");

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons
            name="shield-checkmark-outline"
            size={50}
            color={primaryColor}
          />
          <Text style={styles.planName}>{plan.planName}</Text>
          {!isPlanActive && (
            <View style={styles.inactiveBadge}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.inactiveBadgeText}>
                {t("subscriptionPlanDetail.badge.inactive")}
              </Text>
            </View>
          )}
          <Text style={[styles.planPrice, { color: primaryColor }]}>
            {formattedPlanPrice} VND
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("subscriptionPlanDetail.card.title")}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>
              {t("subscriptionPlanDetail.card.sessions")}
            </Text>
            <Text style={styles.value}>{plan.totalSessions}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              {t("subscriptionPlanDetail.card.duration")}
            </Text>
            <Text style={styles.value}>{durationText}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>
            {t("subscriptionPlanDetail.card.description")}
          </Text>
          <Text style={styles.description}>{descriptionText}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View
          style={[
            styles.walletSection,
            {
              backgroundColor: tintedPrimary,
              borderColor: borderPrimary,
            },
          ]}
        >
          <View style={styles.walletSummaryRow}>
            <View
              style={[
                styles.walletIconContainer,
                { backgroundColor: hexToRgba(primaryColor, 0.16) },
              ]}
            >
              <Ionicons name="wallet-outline" size={24} color={primaryColor} />
            </View>
            <View style={styles.walletTextContainer}>
              <Text style={styles.walletLabel}>
                {t("subscriptionPlanDetail.wallet.label")}
              </Text>
              {isLoadingWallet ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : walletError ? (
                <Text style={styles.walletErrorText}>{walletError}</Text>
              ) : (
                <Text style={[styles.walletAmount, { color: primaryColor }]}>
                  {walletBalance !== null
                    ? `${walletBalance.toLocaleString(
                        "vi-VN"
                      )} ${walletCurrency}`
                    : "--"}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.refreshButton}
              accessibilityRole="button"
              accessibilityLabel={t(
                "subscriptionPlanDetail.wallet.refreshAccessibility"
              )}
              onPress={refreshWalletBalance}
            >
              <Ionicons name="refresh" size={18} color={primaryColor} />
            </Pressable>
          </View>

          {!isLoadingWallet &&
            !walletError &&
            walletInsufficient &&
            isPlanActive && (
              <Text style={styles.walletHint}>
                {t("subscriptionPlanDetail.wallet.notEnough")}
              </Text>
            )}

          {walletError && (
            <Pressable
              onPress={refreshWalletBalance}
              style={styles.retryButton}
            >
              <Text style={[styles.retryText, { color: primaryColor }]}>
                {t("subscriptionPlanDetail.wallet.retry")}
              </Text>
            </Pressable>
          )}

          {isPlanActive ? (
            <Pressable
              style={[
                styles.walletButton,
                { backgroundColor: primaryColor },
                walletActionDisabled && [
                  styles.walletButtonDisabled,
                  { backgroundColor: disabledPrimary },
                ],
              ]}
              onPress={handleBuyWithWallet}
              disabled={walletActionDisabled}
            >
              {isProcessingWallet ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.walletButtonText}>
                  {t("subscriptionPlanDetail.actions.useWallet")}
                </Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.inactiveMessage}>
              {t("subscriptionPlanDetail.inactiveMessage")}
            </Text>
          )}
        </View>

        {isPlanActive && (
          <Pressable
            style={[
              styles.bankButton,
              {
                backgroundColor: hexToRgba(
                  primaryColor,
                  isDarkMode ? 0.35 : 0.18
                ),
                borderColor: primaryColor,
              },
              isCreatingBankPayment && styles.bankButtonDisabled,
            ]}
            onPress={handleBankTransferPayment}
            disabled={isCreatingBankPayment}
          >
            {isCreatingBankPayment ? (
              <ActivityIndicator color={primaryColor} />
            ) : (
              <Text style={[styles.bankButtonText, { color: primaryColor }]}>
                {t("subscriptionPlanDetail.actions.payBank")}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <SubscriptionPaymentModal
        visible={isModalVisible}
        onClose={handleModalClose}
        paymentData={paymentData}
      />
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={handleAlertConfirm}
        onCancel={alertState.cancelText ? handleAlertCancel : undefined}
        type={alertState.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#d9534f", fontSize: 16 },
  scrollContent: { paddingBottom: 24 },
  header: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#1A1A1A",
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  inactiveBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#B91C1C",
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: { fontSize: 16, color: "#666" },
  value: { fontSize: 16, fontWeight: "bold", color: "#222" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  description: { fontSize: 15, color: "#333", lineHeight: 22, marginTop: 4 },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    gap: 16,
  },
  walletSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  walletSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  walletTextContainer: { flex: 1 },
  walletLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  walletAmount: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
    color: "#1A1A1A",
  },
  walletErrorText: { fontSize: 14, color: "#d9534f", marginTop: 4 },
  walletHint: { fontSize: 13, color: "#d17a00", marginBottom: 12 },
  refreshButton: {
    padding: 8,
    borderRadius: 10,
  },
  retryButton: { alignSelf: "flex-start", marginBottom: 12 },
  retryText: { fontSize: 13, fontWeight: "600" },
  walletButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  walletButtonDisabled: { opacity: 0.6 },
  walletButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  bankButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  bankButtonDisabled: { opacity: 0.6 },
  bankButtonText: { fontSize: 16, fontWeight: "bold" },
  inactiveMessage: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
  },
});

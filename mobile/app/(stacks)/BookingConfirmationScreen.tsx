import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import AppointmentPurposeCard from "@/components/AppointmentPurposeCard";
import CustomAlert from "@/components/CustomAlert";
import { AuthContext } from "@/contexts/AuthContext";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import appointmentService from "@/services/appointmentService";
import customerService from "@/services/customerService";
import customerSubscriptionService from "@/services/customerSubscriptionService";
import dermatologistService from "@/services/dermatologistService";
import skinAnalysisService, {
  SkinAnalysisResult,
} from "@/services/skinAnalysisService";
import treatmentRoutineService from "@/services/treatmentRoutineService";
import userService from "@/services/userService";
import {
  AppointmentType,
  CreateAppointmentDto,
} from "@/types/appointment.type";
import { Customer } from "@/types/customer.type";
import { CustomerSubscription } from "@/types/customerSubscription.type";
import { Dermatologist } from "@/types/dermatologist.type";
import { SkinAnalysis } from "@/types/skin-analysis.type";
import { TreatmentRoutine } from "@/types/treatment-routine.type";

const fallbackLocale = "en-US";

const formatTime = (isoDate: string | undefined, locale: string) => {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleTimeString(locale || fallbackLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDate = (isoDate: string | undefined, locale: string) => {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString(locale || fallbackLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dermatologistId?: string | string[];
    startTime?: string | string[];
    endTime?: string | string[];
    price?: string | string[];
    slotId?: string | string[];
  }>();

  const dermatologistId = Array.isArray(params.dermatologistId)
    ? params.dermatologistId[0]
    : params.dermatologistId;
  const startTime = Array.isArray(params.startTime)
    ? params.startTime[0]
    : params.startTime;
  const endTime = Array.isArray(params.endTime)
    ? params.endTime[0]
    : params.endTime;
  const rawPrice = Array.isArray(params.price) ? params.price[0] : params.price;

  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "bookingConfirmation",
  });

  const { user, isLoading: isAuthLoading } = useContext(AuthContext);
  const { primaryColor } = useThemeColor();

  const subtleBackground = useMemo(
    () => hexToRgba(primaryColor, 0.05),
    [primaryColor]
  );
  const cardBorder = useMemo(
    () => hexToRgba(primaryColor, 0.12),
    [primaryColor]
  );
  const optionTint = useMemo(
    () => hexToRgba(primaryColor, 0.12),
    [primaryColor]
  );
  const optionDescActive = useMemo(
    () => hexToRgba(primaryColor, 0.8),
    [primaryColor]
  );
  const iconInactiveColor = useMemo(
    () => hexToRgba(primaryColor, 0.6),
    [primaryColor]
  );
  const confirmDisabledColor = useMemo(
    () => hexToRgba(primaryColor, 0.4),
    [primaryColor]
  );

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [doctor, setDoctor] = useState<Dermatologist | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(
    []
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.NEW_PROBLEM
  );
  const [analyses, setAnalyses] = useState<SkinAnalysisResult[]>([]);
  const [routines, setRoutines] = useState<TreatmentRoutine[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null
  );
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(
    null
  );
  const [note, setNote] = useState<string>("");
  const previousAnalysisIdsRef = useRef<string[]>([]);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const formatGender = useCallback(
    (isMale: boolean | undefined | null) => {
      if (isMale === undefined || isMale === null)
        return t("labels.notAvailable");
      return isMale ? t("labels.genderMale") : t("labels.genderFemale");
    },
    [t]
  );

  const updateSelectedRoutine = useCallback(
    (routinesData: TreatmentRoutine[]) => {
      const newIds = routinesData.map((routine) => routine.routineId);
      setSelectedRoutineId((current) => {
        if (current && newIds.includes(current)) {
          return current;
        }
        return routinesData.length > 0 ? routinesData[0].routineId : null;
      });
    },
    []
  );

  const updateSelectedAnalysis = useCallback(
    (analysesData: SkinAnalysisResult[]) => {
      const newIds = analysesData.map((analysis) => analysis.analysisId);
      const previousIds = previousAnalysisIdsRef.current;
      const addedIds = newIds.filter((id) => !previousIds.includes(id));

      setSelectedAnalysisId((current) => {
        if (previousIds.length === 0) {
          if (current && newIds.includes(current)) {
            return current;
          }
          return analysesData.length > 0 ? analysesData[0].analysisId : null;
        }

        if (addedIds.length > 0) {
          return addedIds[0];
        }

        if (current && newIds.includes(current)) {
          return current;
        }

        return analysesData.length > 0 ? analysesData[0].analysisId : null;
      });

      previousAnalysisIdsRef.current = newIds;
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!dermatologistId) {
      return;
    }

    if (!user?.userId) {
      if (!isAuthLoading) {
        setAlertState({
          visible: true,
          title: t("errors.title"),
          message: t("errors.auth"),
          type: "error",
        });
      }
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      const [doctorData, subsData, walletData] = await Promise.all([
        dermatologistService.getDermatologistById(dermatologistId),
        customerSubscriptionService.getMyActiveSubscriptions(dermatologistId),
        userService.getBalance(),
      ]);

      setDoctor(doctorData);
      const now = new Date();
      const validSubs = subsData.filter((sub) => {
        const end = sub.endDate ? new Date(sub.endDate) : null;
        const hasValidEnd = end && !Number.isNaN(end.getTime()) && end >= now;
        return sub.isActive && hasValidEnd && sub.sessionsRemaining !== 0;
      });
      setSubscriptions(validSubs);
      setWalletBalance(walletData.balance);

      const customerData = await customerService.getCustomerProfile(
        user.userId
      );
      setCustomer(customerData);

      if (customerData?.customerId) {
        const [analysesData, routinesData] = await Promise.all([
          skinAnalysisService.getUserAnalyses(customerData.customerId),
          treatmentRoutineService.getCustomerRoutines(
            customerData.customerId,
            dermatologistId
          ),
        ]);

        setAnalyses(analysesData);
        updateSelectedAnalysis(analysesData);

        setRoutines(routinesData);
        updateSelectedRoutine(routinesData);
      }

      setSelectedOptionId((prev) => {
        const priceNumber = Number(rawPrice || 0);

        const isExistingSubscription = prev
          ? validSubs.some((subscription) => subscription.id === prev)
          : false;

        if (prev === "PAY_NOW" && priceNumber > 0) return prev;
        if (prev === "WALLET") return prev;
        if (prev && isExistingSubscription) return prev;

        if (priceNumber > 0) return "PAY_NOW";
        if (validSubs.length > 0) return validSubs[0].id;
        return "WALLET";
      });
    } catch (error: any) {
      setAlertState({
        visible: true,
        title: t("errors.title"),
        message: t("errors.load"),
        type: "error",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [
    dermatologistId,
    isAuthLoading,
    rawPrice,
    t,
    updateSelectedAnalysis,
    updateSelectedRoutine,
    user?.userId,
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const slotDetails = useMemo(() => {
    const price = Number(rawPrice || 0);
    const locale = i18n.language || fallbackLocale;

    const formattedStart = formatTime(startTime, locale);
    const formattedEnd = formatTime(endTime, locale);

    return {
      date: formatDate(startTime, locale) || t("labels.notAvailable"),
      time:
        formattedStart && formattedEnd
          ? `${formattedStart} - ${formattedEnd}`
          : t("labels.notAvailable"),
      price,
      priceDisplay:
        price > 0
          ? t("labels.price", { value: price.toLocaleString(locale) })
          : t("labels.free"),
    };
  }, [endTime, i18n.language, rawPrice, startTime, t]);

  const handleConfirm = async () => {
    if (!selectedOptionId || !dermatologistId) return;

    const start = new Date(startTime as string);
    if (start < new Date()) {
      setAlertState({
        visible: true,
        title: t("errors.title"),
        message: t("errors.timePassed"),
        type: "error",
        onConfirm: () => router.back(),
      });
      return;
    }

    if (!selectedAnalysisId) {
      setAlertState({
        visible: true,
        title: t("errors.title"),
        message: t("errors.missingAnalysis"),
        type: "warning",
      });
      return;
    }

    if (appointmentType === AppointmentType.FOLLOW_UP && !selectedRoutineId) {
      setAlertState({
        visible: true,
        title: t("errors.title"),
        message: t("errors.missingRoutine"),
        type: "warning",
      });
      return;
    }

    setIsConfirming(true);

    const baseDto: CreateAppointmentDto = {
      dermatologistId,
      startTime: startTime || "",
      endTime: endTime || "",
      appointmentType,
      analysisId: selectedAnalysisId || undefined,
      trackingRoutineId:
        appointmentType === AppointmentType.FOLLOW_UP
          ? selectedRoutineId || undefined
          : undefined,
      note: note || undefined,
    };

    try {
      if (selectedOptionId === "PAY_NOW") {
        const response = await appointmentService.createReservation(baseDto);
        router.replace({
          pathname: "/(stacks)/PaymentScreen",
          params: {
            appointmentId: response.appointmentId,
            paymentCode: response.paymentCode,
            expiredAt: response.expiredAt,
            paymentMethod: response.paymentMethod,
            paymentType: response.paymentType,
            bankingInfo: JSON.stringify(response.bankingInfo),
          },
        });
      } else if (selectedOptionId === "WALLET") {
        if (walletBalance < slotDetails.price) {
          setAlertState({
            visible: true,
            title: t("errors.title"),
            message: t("errors.insufficientBalance"),
            type: "warning",
          });
          setIsConfirming(false);
          return;
        }

        const appointment = await appointmentService.createWalletAppointment(
          baseDto
        );
        router.replace({
          pathname: "/(stacks)/PaymentSuccessScreen",
          params: { appointmentId: appointment.appointmentId },
        });
      } else {
        const appointment =
          await appointmentService.createSubscriptionAppointment({
            ...baseDto,
            customerSubscriptionId: selectedOptionId,
          });
        router.replace({
          pathname: "/(stacks)/PaymentSuccessScreen",
          params: { appointmentId: appointment.appointmentId },
        });
      }
    } catch (error: any) {
      setAlertState({
        visible: true,
        title: t("errors.bookingFailed"),
        message: error?.message || t("errors.generic"),
        type: "error",
      });
      setIsConfirming(false);
    }
  };

  const renderOption = (
    id: string,
    title: string,
    description: string,
    disabled: boolean = false,
    icon?: React.ReactElement<{ color?: string }>
  ) => {
    const isSelected = selectedOptionId === id;
    const backgroundColor = isSelected ? optionTint : "#f5f5f5";
    const borderColor = isSelected ? primaryColor : "#ccc";
    const titleColor = isSelected ? primaryColor : "#333";
    const descriptionColor = isSelected ? optionDescActive : "#666";
    const renderedIcon =
      icon && React.isValidElement(icon)
        ? React.cloneElement(icon, {
            color: disabled
              ? "#999"
              : isSelected
              ? primaryColor
              : iconInactiveColor,
          })
        : null;

    return (
      <Pressable
        key={id}
        style={[
          styles.option,
          { backgroundColor, borderColor },
          disabled && styles.optionDisabled,
        ]}
        onPress={() => !disabled && setSelectedOptionId(id)}
        disabled={disabled}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={[
                styles.optionText,
                { color: titleColor },
                disabled && styles.textDisabled,
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.optionDesc,
                { color: descriptionColor },
                disabled && styles.textDisabled,
              ]}
            >
              {description}
            </Text>
          </View>
          {renderedIcon}
        </View>
      </Pressable>
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: subtleBackground,
        },
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        card: {
          backgroundColor: "#fff",
          borderRadius: 12,
          marginHorizontal: 16,
          marginTop: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: cardBorder,
          elevation: 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 5,
        },
        cardTitle: {
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 12,
          color: "#1e1e1e",
        },
        doctorHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
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
          color: "#222",
        },
        doctorSpec: {
          fontSize: 14,
          color: "#666",
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        label: {
          fontSize: 15,
          color: "#666",
        },
        value: {
          fontSize: 15,
          fontWeight: "bold",
          maxWidth: "60%",
          textAlign: "right",
          color: "#1e1e1e",
        },
        divider: {
          height: 1,
          backgroundColor: "#eee",
          marginVertical: 12,
        },
        option: {
          backgroundColor: "#f5f5f5",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 10,
        },
        optionText: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
        optionDesc: {
          fontSize: 14,
          color: "#666",
        },
        infoText: {
          fontSize: 15,
          color: "#666",
          textAlign: "center",
        },
        footer: {
          padding: 16,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: cardBorder,
        },
        confirmButton: {
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
        },
        confirmButtonDisabled: {
          opacity: 0.9,
        },
        confirmButtonText: {
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
        },
        optionDisabled: {
          opacity: 0.5,
          backgroundColor: "#eee",
          borderColor: "#ddd",
        },
        textDisabled: {
          color: "#999",
        },
        errorText: {
          fontSize: 14,
          color: "#d9534f",
          textAlign: "center",
          marginTop: 8,
          fontStyle: "italic",
        },
      }),
    [cardBorder, subtleBackground]
  );

  if (isLoadingData || isAuthLoading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {doctor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("labels.consultant")}</Text>
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  doctor.user?.photoUrl
                    ? { uri: doctor.user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.user?.fullName}</Text>
                <Text style={styles.doctorSpec}>
                  {doctor.specialization?.join(", ") ||
                    t("labels.dermatologist")}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("labels.appointmentDetails")}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t("labels.date")}</Text>
            <Text style={styles.value}>{slotDetails.date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("labels.time")}</Text>
            <Text style={styles.value}>{slotDetails.time}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t("labels.priceLabel")}</Text>
            <Text style={styles.value}>{slotDetails.priceDisplay}</Text>
          </View>
        </View>

        {user && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("labels.patientInfo")}</Text>
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  user.photoUrl
                    ? { uri: user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{user.fullName}</Text>
                <Text style={styles.doctorSpec}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t("labels.phone")}</Text>
              <Text style={styles.value}>{user.phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("labels.dob")}</Text>
              <Text style={styles.value}>
                {formatDate(user.dob, i18n.language || fallbackLocale) ||
                  t("labels.notAvailable")}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("labels.gender")}</Text>
              <Text style={styles.value}>{formatGender(user.gender)}</Text>
            </View>

            <View style={styles.divider} />

            {customer ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>{t("labels.medicalHistory")}</Text>
                  <Text style={styles.value}>
                    {customer.pastDermatologicalHistory?.join(", ") ||
                      t("labels.noneProvided")}
                  </Text>
                </View>
              </>
            ) : (
              <ActivityIndicator style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        <AppointmentPurposeCard
          appointmentType={appointmentType}
          setAppointmentType={setAppointmentType}
          analyses={analyses}
          selectedAnalysisId={selectedAnalysisId}
          setSelectedAnalysisId={setSelectedAnalysisId}
          routines={routines}
          selectedRoutineId={selectedRoutineId}
          setSelectedRoutineId={setSelectedRoutineId}
          note={note}
          setNote={setNote}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("labels.paymentOption")}</Text>

          {slotDetails.price > 0 &&
            renderOption(
              "PAY_NOW",
              t("labels.bankTransfer"),
              slotDetails.priceDisplay,
              false,
              <MaterialCommunityIcons name="bank-transfer" size={24} />
            )}

          {slotDetails.price >= 0 &&
            renderOption(
              "WALLET",
              t("labels.wallet"),
              t("labels.walletBalance", {
                amount: walletBalance.toLocaleString(
                  i18n.language || fallbackLocale
                ),
              }),
              walletBalance < slotDetails.price,
              <MaterialCommunityIcons name="wallet" size={24} />
            )}

          {slotDetails.price > 0 &&
            subscriptions.map((sub) =>
              renderOption(
                sub.id,
                (sub.subscriptionPlan as any)?.planName ||
                  t("labels.subscription"),
                t("labels.sessionsRemaining", { count: sub.sessionsRemaining })
              )
            )}

          {selectedOptionId === "WALLET" &&
            walletBalance < slotDetails.price && (
              <Text style={styles.errorText}>
                {t("labels.insufficientWallet")}
              </Text>
            )}

          {subscriptions.length === 0 && slotDetails.price === 0 && (
            <Text style={styles.infoText}>{t("labels.freeConsultation")}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            {
              backgroundColor:
                isConfirming || !selectedOptionId
                  ? confirmDisabledColor
                  : primaryColor,
            },
            (isConfirming || !selectedOptionId) && styles.confirmButtonDisabled,
          ]}
          disabled={isConfirming || !selectedOptionId}
          onPress={handleConfirm}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedOptionId === "PAY_NOW"
                ? t("labels.proceedPayment")
                : t("labels.confirmBooking")}
            </Text>
          )}
        </Pressable>
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onConfirm={() => {
          setAlertState((prev) => ({ ...prev, visible: false }));
          if (alertState.onConfirm) {
            alertState.onConfirm();
          }
        }}
      />
    </View>
  );
}

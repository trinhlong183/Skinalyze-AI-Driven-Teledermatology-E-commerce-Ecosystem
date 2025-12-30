import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  TextInput,
  AppState,
  AppStateStatus,
} from "react-native";
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import appointmentService from "@/services/appointmentService";
import ratingService from "@/services/ratingService";
import RatingComponent from "@/components/RatingComponent";
import {
  AppointmentDetailDto,
  InterruptAppointmentDto,
  ReportNoShowDto,
  TerminationReason,
} from "@/types/appointment.type";
import { AppointmentStatus, AppointmentType } from "@/types/appointment.type";
import { CreateRatingDto, Rating } from "@/types/rating.type";
import CustomAlert from "@/components/CustomAlert";
import { Picker } from "@react-native-picker/picker";
import { useThemeColor } from "@/contexts/ThemeColorContext";

const CHECK_IN_WINDOW_MINUTES = 10;
const statusTranslationKeys: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING_PAYMENT]: "pendingPayment",
  [AppointmentStatus.SCHEDULED]: "scheduled",
  [AppointmentStatus.IN_PROGRESS]: "inProgress",
  [AppointmentStatus.COMPLETED]: "completed",
  [AppointmentStatus.CANCELLED]: "cancelled",
  [AppointmentStatus.NO_SHOW]: "noShow",
  [AppointmentStatus.INTERRUPTED]: "interrupted",
  [AppointmentStatus.DISPUTED]: "disputed",
  [AppointmentStatus.SETTLED]: "completed",
};

const statusStyleMeta: Record<
  AppointmentStatus,
  { color: string; icon: string }
> = {
  [AppointmentStatus.PENDING_PAYMENT]: {
    color: "#FB8C00",
    icon: "clock-outline",
  },
  [AppointmentStatus.SCHEDULED]: {
    color: "#007bff",
    icon: "calendar-check",
  },
  [AppointmentStatus.IN_PROGRESS]: {
    color: "#E91E63",
    icon: "video",
  },
  [AppointmentStatus.INTERRUPTED]: {
    color: "#ff9800",
    icon: "alert-octagon",
  },
  [AppointmentStatus.COMPLETED]: {
    color: "#4CAF50",
    icon: "check-decagram",
  },
  [AppointmentStatus.CANCELLED]: {
    color: "#9E9E9E",
    icon: "close-circle",
  },
  [AppointmentStatus.NO_SHOW]: {
    color: "#f44336",
    icon: "account-off",
  },
  [AppointmentStatus.DISPUTED]: {
    color: "#ff7043",
    icon: "gavel",
  },
  [AppointmentStatus.SETTLED]: {
    color: "#4CAF50",
    icon: "check-decagram",
  },
};

const defaultStatusStyle = { color: "#FF9800", icon: "alert-circle" };

const appointmentTypeTranslationKeys: Record<AppointmentType, string> = {
  [AppointmentType.NEW_PROBLEM]: "newProblem",
  [AppointmentType.FOLLOW_UP]: "followUp",
};
const formatTime = (isoDate: string, fallback = "N/A") => {
  if (!isoDate) return fallback;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
const formatDate = (isoDate: string, fallback = "N/A") => {
  if (!isoDate) return fallback;
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

type FeedbackAlertState = {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  confirmText?: string;
};

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDetailDto | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelWarningKey, setCancelWarningKey] = useState<
    "refund" | "noRefund" | null
  >(null);

  // Modal No-Show
  const [isNoShowModalVisible, setIsNoShowModalVisible] = useState(false);
  const [noShowNote, setNoShowNote] = useState("");
  const [isReportingNoShow, setIsReportingNoShow] = useState(false);

  // Modal Interrupt
  const [isInterruptModalVisible, setIsInterruptModalVisible] = useState(false);
  const [interruptReason, setInterruptReason] = useState<TerminationReason>(
    TerminationReason.DOCTOR_ISSUE
  );
  const [interruptNote, setInterruptNote] = useState("");
  const [isReportingInterrupt, setIsReportingInterrupt] = useState(false);

  const [feedbackAlert, setFeedbackAlert] = useState<FeedbackAlertState>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingContent, setRatingContent] = useState("");
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) {
      setErrorKey("appointmentDetail.errors.noId");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await appointmentService.getAppointmentById(appointmentId);
      setAppointment(data);
      setErrorKey(null);
    } catch (err) {
      console.error("Failed to load appointment details:", err);
      setErrorKey("appointmentDetail.errors.load");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointment();
    }, [fetchAppointment])
  );

  // Refetch when returning from background so the join label stays current.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInBackground =
        appState.current === "inactive" || appState.current === "background";
      if (wasInBackground && nextState === "active") {
        fetchAppointment();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchAppointment]);

  // Check condition to show report menu
  const canReport = useMemo(() => {
    if (!appointment) return false;
    const { appointmentStatus, endTime } = appointment;

    if (appointmentStatus === AppointmentStatus.IN_PROGRESS) return true;

    const isPostSessionStatus =
      appointmentStatus === AppointmentStatus.COMPLETED ||
      appointmentStatus === AppointmentStatus.INTERRUPTED ||
      appointmentStatus === AppointmentStatus.SETTLED ||
      appointmentStatus === AppointmentStatus.DISPUTED;

    if (isPostSessionStatus) {
      // Kiểm tra trong vòng 24h sau khi kết thúc
      const endTimeDate = new Date(endTime);
      const now = new Date();
      const diffHours =
        (now.getTime() - endTimeDate.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24;
    }

    return false;
  }, [appointment]);
  const canReportNoShow = useMemo(() => {
    if (!appointment) return false;
    const { appointmentStatus } = appointment;
    if (
      appointmentStatus === AppointmentStatus.INTERRUPTED ||
      appointmentStatus === AppointmentStatus.DISPUTED
    ) {
      return false;
    }
    return canReport;
  }, [appointment, canReport]);

  const getStatusInfo = useCallback(
    (status: AppointmentStatus | string) => {
      const meta =
        statusStyleMeta[status as AppointmentStatus] || defaultStatusStyle;
      const translationKey = statusTranslationKeys[status as AppointmentStatus];
      const translatedText = translationKey
        ? t(`appointments.status.${translationKey}`)
        : undefined;
      return {
        text: translatedText || String(status),
        color: meta.color,
        icon: meta.icon,
      };
    },
    [t]
  );

  const getTypeLabel = useCallback(
    (type: AppointmentType | null | undefined) => {
      if (!type) {
        return t("appointments.cards.unknown");
      }
      const translationKey = appointmentTypeTranslationKeys[type];
      return translationKey
        ? t(`appointments.types.${translationKey}`)
        : type.replace(/_/g, " ");
    },
    [t]
  );

  useEffect(() => {
    if (!canReportNoShow && isNoShowModalVisible) {
      setIsNoShowModalVisible(false);
    }
  }, [canReportNoShow, isNoShowModalVisible]);

  useEffect(() => {
    const status = appointment?.appointmentStatus;

    if (!appointmentId) {
      setExistingRating(null);
      setRatingValue(0);
      setRatingContent("");
      return;
    }

    const isEligibleForRating =
      status === AppointmentStatus.COMPLETED ||
      status === AppointmentStatus.SETTLED;

    if (!isEligibleForRating) {
      setExistingRating(null);
      setRatingValue(0);
      setRatingContent("");
      return;
    }

    let isMounted = true;

    const loadRating = async () => {
      setIsLoadingRating(true);
      try {
        const rating = await ratingService.getMyAppointmentRating(
          appointmentId
        );
        if (!isMounted) {
          return;
        }
        setExistingRating(rating);
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load rating:", error);
          setExistingRating(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRating(false);
        }
      }
    };

    loadRating();

    return () => {
      isMounted = false;
    };
  }, [appointmentId, appointment?.appointmentStatus]);

  useEffect(() => {
    if (existingRating) {
      setRatingValue(existingRating.rating);
      setRatingContent(existingRating.content ?? "");
    } else {
      setRatingValue(0);
      setRatingContent("");
    }
  }, [existingRating]);

  // 2. Xử lý Báo cáo No-Show
  const submitReportNoShow = async () => {
    if (!appointmentId || !canReportNoShow) return;
    setIsReportingNoShow(true);
    try {
      const dto: ReportNoShowDto = { note: noShowNote };
      const result = await appointmentService.reportDoctorNoShow(
        appointmentId,
        dto
      );
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.report.noShowSuccessTitle"),
        message:
          result?.message || t("appointmentDetail.report.noShowSuccessMessage"),
        type: "success",
        confirmText: t("appointmentDetail.actions.close"),
      });

      setIsNoShowModalVisible(false);
      setIsMenuVisible(false);
      fetchAppointment(); // Reload data
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.report.errorTitle"),
        message:
          error?.message || t("appointmentDetail.report.noShowErrorMessage"),
        type: "error",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } finally {
      setIsReportingNoShow(false);
    }
  };

  // 3. Xử lý Báo cáo Interrupt
  const submitReportInterrupt = async () => {
    if (!appointmentId) return;
    setIsReportingInterrupt(true);
    try {
      const dto: InterruptAppointmentDto = {
        reason: interruptReason,
        terminationNote: interruptNote,
      };
      await appointmentService.reportInterrupt(appointmentId, dto);
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.report.interruptSuccessTitle"),
        message: t("appointmentDetail.report.interruptSuccessMessage"),
        type: "success",
        confirmText: t("appointmentDetail.actions.close"),
      });

      setIsInterruptModalVisible(false);
      setIsMenuVisible(false);
      fetchAppointment(); // Reload data
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.report.errorTitle"),
        message:
          error?.message || t("appointmentDetail.report.interruptErrorMessage"),
        type: "error",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } finally {
      setIsReportingInterrupt(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!appointment || !appointmentId) return;
    if (isJoining) return; // (Avoid multiple taps)

    setIsJoining(true);

    try {
      let meetingUrl = appointment.meetingUrl;

      // If no meeting URL but it's joinable time, try to generate one
      if (!meetingUrl) {
        const startTime = new Date(appointment.startTime);
        const checkInTime = new Date(
          startTime.getTime() - CHECK_IN_WINDOW_MINUTES * 60000
        );
        const now = new Date();
        const isJoinableTime = now >= checkInTime;

        if (isJoinableTime) {
          try {
            const result = await appointmentService.generateManualMeetLink(
              appointmentId
            );
            meetingUrl = result.meetLink;
            // Update local state to reflect the new link immediately
            setAppointment((prev) =>
              prev ? { ...prev, meetingUrl: result.meetLink } : prev
            );
          } catch (error) {
            console.error("Failed to generate meet link", error);
            // Continue to error handling below if link generation fails
          }
        }
      }

      if (!meetingUrl) {
        setFeedbackAlert({
          visible: true,
          title: t("appointmentDetail.errors.meetingTitle"),
          message: t("appointmentDetail.errors.noLinkMessage"),
          type: "error",
          confirmText: t("appointmentDetail.actions.close"),
        });
        return;
      }

      if (!appointment.customerJoinedAt) {
        await appointmentService.checkInCustomer(appointmentId);
      }
      await Linking.openURL(meetingUrl);
    } catch (err: any) {
      if (err.message?.includes("check-in")) {
        setFeedbackAlert({
          visible: true,
          title: t("appointmentDetail.errors.checkInTitle"),
          message: err?.message || t("appointmentDetail.errors.checkInMessage"),
          type: "error",
          confirmText: t("appointmentDetail.actions.close"),
        });
      } else {
        setFeedbackAlert({
          visible: true,
          title: t("appointmentDetail.errors.meetingTitle"),
          message: t("appointmentDetail.errors.meetingMessage"),
          type: "error",
          confirmText: t("appointmentDetail.actions.close"),
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewRoutine = (routineId: string) => {
    router.push({
      pathname: "/(stacks)/TreatmentRoutineDetailScreen",
      params: { routineId: routineId },
    });
  };

  const handleOpenCancelModal = () => {
    if (!appointment) return;

    const startTime = new Date(appointment.startTime);
    const now = new Date();
    const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    setCancelWarningKey(hoursDiff > 24 ? "refund" : "noRefund");

    setIsCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (isCancelling || !appointmentId) return;

    setIsCancelling(true);
    try {
      await appointmentService.cancelMyAppointment(appointmentId);
      await fetchAppointment();

      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.cancel.successTitle"),
        message: t("appointmentDetail.cancel.successMessage"),
        type: "success",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.cancel.failureTitle"),
        message: error?.message || t("appointmentDetail.cancel.failureMessage"),
        type: "error",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } finally {
      setIsCancelling(false);
      setIsCancelModalVisible(false);
    }
  };

  const handleSelectRating = useCallback((value: number) => {
    setRatingValue(value);
  }, []);

  const handleSubmitRating = async () => {
    if (!appointmentId) return;

    if (ratingValue <= 0) {
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.rating.errorTitle"),
        message: t("appointmentDetail.rating.missingRating"),
        type: "warning",
        confirmText: t("appointmentDetail.actions.close"),
      });
      return;
    }

    setIsSubmittingRating(true);
    try {
      const payload: CreateRatingDto = {
        appointmentId,
        rating: ratingValue,
        content: ratingContent.trim() || undefined,
      };

      const createdRating = await ratingService.createRating(payload);
      setExistingRating(createdRating);
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.rating.submittedTitle"),
        message: t("appointmentDetail.rating.submittedMessage"),
        type: "success",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } catch (error: any) {
      const normalizedMessage = error?.message?.toString().toLowerCase() ?? "";
      if (normalizedMessage.includes("already")) {
        try {
          const rating = await ratingService.getMyAppointmentRating(
            appointmentId
          );
          setExistingRating(rating);
        } catch (refreshError) {
          console.error("Failed to refresh existing rating:", refreshError);
        }
      }
      setFeedbackAlert({
        visible: true,
        title: t("appointmentDetail.rating.errorTitle"),
        message: error?.message || t("appointmentDetail.rating.errorMessage"),
        type: "error",
        confirmText: t("appointmentDetail.actions.close"),
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" style={styles.center} />;
    }

    if (errorKey || !appointment) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {errorKey ? t(errorKey) : t("appointmentDetail.errors.notFound")}
          </Text>
        </View>
      );
    }

    const statusInfo = getStatusInfo(appointment.appointmentStatus);

    const isJoinableStatus =
      appointment.appointmentStatus === AppointmentStatus.SCHEDULED ||
      appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;

    // Check in time
    const startTime = new Date(appointment.startTime);
    const checkInTime = new Date(
      startTime.getTime() - CHECK_IN_WINDOW_MINUTES * 60000
    );
    const now = new Date();

    // Enable join if current time is within the check-in window
    const isJoinableTime = now >= checkInTime;
    const isCancellable =
      appointment.appointmentStatus === AppointmentStatus.SCHEDULED;
    const hasMeetingUrl = !!appointment.meetingUrl;
    const routineId =
      appointment.createdRoutine?.routineId ||
      appointment.trackingRoutine?.routineId;
    const hasCheckedIn = Boolean(appointment.customerJoinedAt);

    // Allow join if status is valid AND (has link OR is joinable time to generate link)
    const canJoinNow =
      isJoinableStatus &&
      (hasMeetingUrl || isJoinableTime) &&
      (isJoinableTime || hasCheckedIn);

    const canCopyLink =
      appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS &&
      hasCheckedIn &&
      hasMeetingUrl;

    const canRateAppointment =
      appointment.appointmentStatus === AppointmentStatus.COMPLETED ||
      appointment.appointmentStatus === AppointmentStatus.SETTLED;

    const dermatologistName =
      appointment.dermatologist?.user?.fullName ||
      t("appointmentDetail.sections.dermatologist.fallback", {
        defaultValue: t("appointmentDetail.sections.dermatologist.title", {
          defaultValue: "Dermatologist",
        }),
      });

    const joinButtonLabel = !canJoinNow
      ? !isJoinableStatus
        ? t("appointmentDetail.join.unavailable")
        : !isJoinableTime && !hasCheckedIn
        ? t("appointmentDetail.join.joinable", {
            minutes: CHECK_IN_WINDOW_MINUTES,
          })
        : t("appointmentDetail.join.unavailable")
      : hasCheckedIn
      ? t("appointmentDetail.join.rejoin")
      : t("appointmentDetail.join.checkIn");

    return (
      <>
        {/* === TOP BAR  === */}
        <View style={styles.topBar}>
          <Pressable style={styles.topBarButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#007bff" />
            <Text style={styles.backButtonText}>
              {t("appointmentDetail.back")}
            </Text>
          </Pressable>

          {/* Validate show report menu */}
          {canReport && (
            <Pressable
              style={styles.topBarButton}
              onPress={() => setIsMenuVisible(true)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={28}
                color="#333"
              />
            </Pressable>
          )}
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[styles.statusCard, { backgroundColor: statusInfo.color }]}
          >
            <MaterialCommunityIcons
              name={statusInfo.icon as any}
              size={24}
              color="#fff"
            />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>

          {appointment.statusMessage && (
            <View style={styles.statusMessageCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#333"
              />
              <Text style={styles.statusMessageText}>
                {appointment.statusMessage}
              </Text>
            </View>
          )}

          {/* Dermatologist */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("appointmentDetail.sections.dermatologist.title")}
            </Text>
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  appointment.dermatologist?.user?.photoUrl
                    ? { uri: appointment.dermatologist.user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{dermatologistName}</Text>
                {/* (Assuming API does NOT have 'specialization',
                {/* <Text style={styles.doctorSpec}>
                  {appointment.dermatologist?.specialization?.join(", ") || "Specialist"}
                </Text> */}
              </View>
            </View>
          </View>

          {canRateAppointment && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {t("appointmentDetail.rating.title")}
              </Text>
              {isLoadingRating ? (
                <ActivityIndicator
                  style={styles.ratingLoader}
                  color={primaryColor}
                />
              ) : existingRating ? (
                <>
                  <RatingComponent
                    value={existingRating.rating}
                    size={28}
                    readOnly
                    style={styles.ratingStarsRow}
                    accessibilityLabel={t("appointmentDetail.rating.title")}
                  />
                  <Text style={styles.ratingInfoText}>
                    {t("appointmentDetail.rating.alreadyRated")}
                  </Text>
                  {existingRating.content ? (
                    <Text style={styles.ratingContentText}>
                      {existingRating.content}
                    </Text>
                  ) : (
                    <Text style={styles.ratingInfoText}>
                      {t("appointmentDetail.rating.noContent")}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.ratingPromptText}>
                    {t("appointmentDetail.rating.prompt", {
                      name: dermatologistName,
                    })}
                  </Text>
                  <RatingComponent
                    value={ratingValue}
                    onChange={handleSelectRating}
                    size={28}
                    style={styles.ratingStarsRow}
                    accessibilityLabel={t("appointmentDetail.rating.title")}
                  />
                  <TextInput
                    style={styles.ratingInput}
                    placeholder={t("appointmentDetail.rating.placeholder")}
                    placeholderTextColor="#9E9E9E"
                    multiline
                    numberOfLines={4}
                    value={ratingContent}
                    onChangeText={setRatingContent}
                  />
                  <Pressable
                    style={[
                      styles.ratingSubmitButton,
                      { backgroundColor: primaryColor },
                      (ratingValue === 0 || isSubmittingRating) &&
                        styles.ratingSubmitButtonDisabled,
                    ]}
                    onPress={handleSubmitRating}
                    disabled={ratingValue === 0 || isSubmittingRating}
                  >
                    {isSubmittingRating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ratingSubmitButtonText}>
                        {t("appointmentDetail.rating.submit")}
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* Customer Information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("appointmentDetail.sections.patient.title")}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("appointmentDetail.sections.patient.name")}
              </Text>
              <Text style={styles.value}>
                {appointment.customer?.user?.fullName ||
                  t("appointmentDetail.sections.patient.fallback")}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("appointmentDetail.sections.patient.email")}
              </Text>
              <Text style={styles.emailValue}>
                {appointment.customer?.user?.email}
              </Text>
            </View>
          </View>

          {/* Appointment Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("appointmentDetail.sections.details.title")}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("appointmentDetail.sections.details.date")}
              </Text>
              <Text style={styles.value}>
                {formatDate(appointment.startTime, t("common.notAvailable"))}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("appointmentDetail.sections.details.time")}
              </Text>
              <Text style={styles.value}>
                {`${formatTime(
                  appointment.startTime,
                  t("common.notAvailable")
                )} - ${formatTime(
                  appointment.endTime,
                  t("common.notAvailable")
                )}`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t("appointmentDetail.sections.details.type")}
              </Text>
              <Text style={styles.value}>
                {getTypeLabel(appointment.appointmentType as AppointmentType)}
              </Text>
            </View>
            {appointment.note && (
              <View style={styles.noteContainer}>
                <Text style={styles.label}>
                  {t("appointmentDetail.sections.details.note")}
                </Text>
                <Text style={styles.noteText}>{appointment.note}</Text>
              </View>
            )}

            {appointment.medicalNote && (
              <View style={styles.noteContainer}>
                <Text
                  style={[
                    styles.label,
                    { color: "#28a745", fontWeight: "bold" },
                  ]}
                >
                  {t("appointmentDetail.sections.details.medicalNote")}
                </Text>
                <Text
                  style={[
                    styles.noteText,
                    {
                      backgroundColor: "#e8f5e9",
                      borderColor: "#c3e6cb",
                      borderWidth: 1,
                    },
                  ]}
                >
                  {appointment.medicalNote}
                </Text>
              </View>
            )}

            {appointment.adminNote && (
              <View style={styles.noteContainer}>
                <View style={styles.noteHeader}>
                  <MaterialCommunityIcons
                    name="shield-alert"
                    size={18}
                    color="#1b5e20"
                    style={styles.adminNoteIcon}
                  />
                  <Text style={[styles.label, styles.adminNoteLabel]}>
                    {t("appointmentDetail.sections.details.adminNote")}
                  </Text>
                </View>
                <Text style={[styles.noteText, styles.adminNoteText]}>
                  {appointment.adminNote}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        {/* Footer */}
        <View style={styles.footer}>
          {isJoinableStatus && (
            <View style={styles.joinRow}>
              <Pressable
                style={[
                  styles.joinButton,
                  (!canJoinNow || isJoining) && styles.buttonDisabled,
                ]}
                onPress={handleJoinMeeting}
                disabled={!canJoinNow || isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="video-plus"
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.joinButtonText}>{joinButtonLabel}</Text>
                  </>
                )}
              </Pressable>

              {canCopyLink && (
                <Pressable
                  style={styles.copyButton}
                  onPress={async () => {
                    if (!appointment.meetingUrl) return;
                    await Clipboard.setStringAsync(appointment.meetingUrl);
                    setFeedbackAlert({
                      visible: true,
                      title: t("appointmentDetail.join.copiedTitle"),
                      message: t("appointmentDetail.join.copiedMessage"),
                      type: "success",
                      confirmText: t("appointmentDetail.actions.close"),
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={22}
                    color={primaryColor}
                  />
                </Pressable>
              )}
            </View>
          )}

          {routineId && (
            <Pressable
              style={[styles.routineButton, { backgroundColor: primaryColor }]}
              onPress={() => handleViewRoutine(routineId)}
            >
              <MaterialCommunityIcons
                name="clipboard-text"
                size={24}
                color="#fff"
              />
              <Text style={styles.routineButtonText}>
                {t("appointmentDetail.routineButton")}
              </Text>
            </Pressable>
          )}

          {isCancellable && (
            <Pressable
              style={styles.cancelButton}
              onPress={handleOpenCancelModal}
            >
              <MaterialCommunityIcons name="cancel" size={24} color="#fff" />
              <Text style={styles.cancelButtonText}>
                {t("appointmentDetail.cancel.button")}
              </Text>
            </Pressable>
          )}
        </View>

        <CustomAlert
          visible={isCancelModalVisible}
          title={t("appointmentDetail.cancel.title")}
          message={
            cancelWarningKey
              ? t(`appointmentDetail.cancel.${cancelWarningKey}`)
              : ""
          }
          type="warning"
          confirmText={
            isCancelling
              ? t("appointmentDetail.cancel.processing")
              : t("appointmentDetail.cancel.confirm")
          }
          cancelText={t("appointmentDetail.cancel.stay")}
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsCancelModalVisible(false)}
        />

        <CustomAlert
          visible={feedbackAlert.visible}
          title={feedbackAlert.title}
          message={feedbackAlert.message}
          type={feedbackAlert.type}
          confirmText={
            feedbackAlert.confirmText || t("appointmentDetail.actions.close")
          }
          onConfirm={() =>
            setFeedbackAlert((prev) => ({ ...prev, visible: false }))
          }
        />
        {/*  REPORT MENU */}
        <Modal
          transparent={true}
          visible={isMenuVisible}
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>
                {t("appointmentDetail.report.menuTitle")}
              </Text>

              {canReportNoShow && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuVisible(false);
                      setIsNoShowModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="account-cancel"
                      size={24}
                      color="#f44336"
                    />
                    <Text style={styles.menuText}>
                      {t("appointmentDetail.report.noShow")}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsInterruptModalVisible(true);
                }}
              >
                <MaterialCommunityIcons
                  name="alert-octagon"
                  size={24}
                  color="#FF9800"
                />
                <Text style={styles.menuText}>
                  {t("appointmentDetail.report.interrupt")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* REPORT NO-SHOW FORM  */}
        <Modal
          transparent={true}
          visible={isNoShowModalVisible}
          animationType="slide"
          onRequestClose={() => setIsNoShowModalVisible(false)}
        >
          <View style={styles.formModalOverlay}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {t("appointmentDetail.report.noShowTitle")}
              </Text>
              <Text style={styles.formSubtitle}>
                {t("appointmentDetail.report.noShowSubtitle")}
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder={t("appointmentDetail.report.noShowPlaceholder")}
                multiline
                numberOfLines={4}
                value={noShowNote}
                onChangeText={setNoShowNote}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={styles.formButtonCancel}
                  onPress={() => setIsNoShowModalVisible(false)}
                >
                  <Text style={styles.formButtonTextCancel}>
                    {t("appointmentDetail.report.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.formButtonSubmit}
                  onPress={submitReportNoShow}
                  disabled={isReportingNoShow}
                >
                  {isReportingNoShow ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.formButtonTextSubmit}>
                      {t("appointmentDetail.report.submit")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* REPORT INTERRUPT FORM  */}
        <Modal
          transparent={true}
          visible={isInterruptModalVisible}
          animationType="slide"
          onRequestClose={() => setIsInterruptModalVisible(false)}
        >
          <View style={styles.formModalOverlay}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {t("appointmentDetail.report.interruptTitle")}
              </Text>
              <Text style={styles.formSubtitle}>
                {t("appointmentDetail.report.interruptSubtitle")}
              </Text>

              <Text style={styles.label}>
                {t("appointmentDetail.report.reason")}
              </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={interruptReason}
                  onValueChange={(itemValue) => setInterruptReason(itemValue)}
                >
                  <Picker.Item
                    label={t("appointmentDetail.report.doctorIssue")}
                    value={TerminationReason.DOCTOR_ISSUE}
                  />
                  <Picker.Item
                    label={t("appointmentDetail.report.platformIssue")}
                    value={TerminationReason.PLATFORM_ISSUE}
                  />
                  <Picker.Item
                    label={t("appointmentDetail.report.customerIssue")}
                    value={TerminationReason.CUSTOMER_ISSUE}
                  />
                </Picker>
              </View>

              <Text style={styles.label}>
                {t("appointmentDetail.report.details")}
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder={t("appointmentDetail.report.detailsPlaceholder")}
                multiline
                numberOfLines={4}
                value={interruptNote}
                onChangeText={setInterruptNote}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={styles.formButtonCancel}
                  onPress={() => setIsInterruptModalVisible(false)}
                >
                  <Text style={styles.formButtonTextCancel}>
                    {t("appointmentDetail.report.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.formButtonSubmit}
                  onPress={submitReportInterrupt}
                  disabled={isReportingInterrupt}
                >
                  {isReportingInterrupt ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.formButtonTextSubmit}>
                      {t("appointmentDetail.report.submit")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  errorText: {
    fontSize: 16,
    color: "#d9534f",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    textTransform: "capitalize",
  },
  statusMessageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff9c4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffe082",
  },
  statusMessageText: {
    flex: 1,
    marginLeft: 8,
    color: "#5f5f00",
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  doctorSpec: {
    fontSize: 14,
    color: "#666",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "right",
  },
  emailValue: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "none",
    flex: 1,
    textAlign: "right",
  },
  noteContainer: {
    marginTop: 12,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminNoteIcon: {
    marginTop: -1,
  },
  noteText: {
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  adminNoteLabel: {
    color: "#1b5e20",
  },
  adminNoteText: {
    backgroundColor: "#e8f5e9",
    borderColor: "#c8e6c9",
    borderWidth: 1,
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
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  routineButton: {
    flexDirection: "row",
    backgroundColor: "#6f42c1",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  routineButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9E9E9E",
  },
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginLeft: 12,
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#d9534f",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16, // Adjust for status bar if needed
    paddingBottom: 8,
    backgroundColor: "#f5f5ff",
  },
  topBarButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 4,
    fontWeight: "500",
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Menu 3 chấm
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    width: "70%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#555",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },

  // Form Modal (No-show / Interrupt)
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  formSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#444",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
    marginBottom: 20,
    minHeight: 80,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  formButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  formButtonSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#d9534f",
  },
  formButtonTextCancel: {
    color: "#666",
    fontWeight: "600",
  },
  formButtonTextSubmit: {
    color: "#fff",
    fontWeight: "600",
  },
  ratingLoader: {
    marginTop: 12,
  },
  ratingPromptText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
  },
  ratingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 12,
  },
  ratingSubmitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: "#9E9E9E",
  },
  ratingSubmitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  ratingInfoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  ratingContentText: {
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
  },
});

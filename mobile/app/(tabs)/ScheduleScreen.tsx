import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useMemo, useContext } from "react";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from "react-i18next";

import appointmentService from "@/services/appointmentService";
import customerService from "@/services/customerService";
import {
  AppointmentWithRelations,
  AppointmentStatus,
  TerminationReason,
} from "@/types/appointment.type";
import { AuthContext } from "@/contexts/AuthContext";
import { useIsFocused } from "@react-navigation/native";

interface Event {
  id: string;
  title: string;
  time: string;
  status: AppointmentStatus;
  description?: string;
  appointmentId?: string;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

const formatTime = (isoDate: string, locale: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleTimeString(locale || "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const isSettledStatus = (status: AppointmentStatus | string) =>
  (status as string) === "SETTLED";

const getEventIcon = (status: AppointmentStatus | string) => {
  if (isSettledStatus(status)) {
    return "checkmark-circle";
  }
  switch (status) {
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.IN_PROGRESS:
      return "calendar";
    case AppointmentStatus.COMPLETED:
      return "checkmark-circle";
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
    case AppointmentStatus.INTERRUPTED:
    case AppointmentStatus.DISPUTED:
      return "close-circle";
    default:
      return "time-outline";
  }
};

const getEventColor = (status: AppointmentStatus | string) => {
  if (isSettledStatus(status)) {
    return "#4CAF50";
  }
  switch (status) {
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.IN_PROGRESS:
      return "#E91E63";
    case AppointmentStatus.COMPLETED:
      return "#4CAF50";
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return "#9E9E9E";
    case AppointmentStatus.INTERRUPTED:
    case AppointmentStatus.DISPUTED:
      return "#F44336";
    default:
      return "#FF9800";
  }
};

const getEventBadgeText = (
  status: AppointmentStatus | string,
  t: (key: string, options?: Record<string, any>) => string
) => {
  const map: Record<string, string> = {
    COMPLETED: t("schedule.status.completed"),
    SCHEDULED: t("schedule.status.scheduled"),
    IN_PROGRESS: t("schedule.status.inProgress"),
    CANCELLED: t("schedule.status.cancelled"),
    NO_SHOW: t("schedule.status.noShow"),
    SETTLED: t("schedule.status.settled"),
    INTERRUPTED: t("schedule.status.interrupted"),
    DISPUTED: t("schedule.status.disputed"),
  };

  if (isSettledStatus(status) || status === AppointmentStatus.COMPLETED) {
    return map.COMPLETED;
  }

  return map[status as string] || t("schedule.status.default");
};

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";

  const [isLoading, setIsLoading] = useState(true);
  const [apiAppointments, setApiAppointments] = useState<
    AppointmentWithRelations[]
  >([]);
  const isFocused = useIsFocused();

  const visibleAppointments = useMemo(() => {
    return apiAppointments.filter((appointment) => {
      if (appointment.appointmentStatus === AppointmentStatus.PENDING_PAYMENT) {
        return false;
      }
      if (
        appointment.appointmentStatus === AppointmentStatus.CANCELLED &&
        appointment.terminatedReason === TerminationReason.PAYMENT_TIMEOUT
      ) {
        return false;
      }
      return true;
    });
  }, [apiAppointments]);

  useEffect(() => {
    if (!user?.userId || !isFocused) {
      return;
    }

    const fetchScheduleData = async () => {
      try {
        setIsLoading(true);

        const customerData = await customerService.getCustomerProfile(
          user.userId
        );
        if (!customerData?.customerId) {
          throw new Error("Customer profile not found.");
        }

        const appointmentData =
          await appointmentService.getCustomerAppointments(
            customerData.customerId
          );

        setApiAppointments(appointmentData);
      } catch (error) {
        console.error("Failed to load schedule:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduleData();
  }, [user, isFocused]);

  const eventsByDate = useMemo(() => {
    const eventMap: { [date: string]: Event[] } = {};

    visibleAppointments.forEach((app) => {
      const dateKey = app.startTime.split("T")[0]; // (YYYY-MM-DD)
      const event: Event = {
        id: app.appointmentId,
        appointmentId: app.appointmentId,
        title: `Dr. ${app?.dermatologist?.user?.fullName}`,
        time: formatTime(app.startTime, locale),
        status: app.appointmentStatus,
        description: app.appointmentType.replace("_", " "),
      };

      if (!eventMap[dateKey]) {
        eventMap[dateKey] = [];
      }
      eventMap[dateKey].push(event);
    });
    return eventMap;
  }, [visibleAppointments]);

  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};
    Object.keys(eventsByDate).forEach((date) => {
      const status = eventsByDate[date][0]?.status;
      marks[date] = {
        marked: true,
        dotColor: getEventColor(status),
      };
    });

    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: primaryColor,
      };
    }
    return marks;
  }, [eventsByDate, selectedDate, primaryColor]);

  const selectedEvents = eventsByDate[selectedDate] || [];

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t("schedule.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: primaryColor,
            }}
          />
        </View>

        {/* Events List */}
        <View style={styles.eventsContainer}>
          <Text style={styles.eventsTitle}>
            {t("schedule.eventsTitle", {
              date: new Date(selectedDate).toLocaleDateString(locale, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            })}
          </Text>

          {selectedEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.noEventsText}>{t("schedule.noEvents")}</Text>
            </View>
          ) : (
            selectedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/(stacks)/AppointmentDetailScreen",
                    params: { appointmentId: event.appointmentId },
                  })
                }
              >
                <View
                  style={[
                    styles.eventIconContainer,
                    { backgroundColor: `${getEventColor(event.status)}20` },
                  ]}
                >
                  <Ionicons
                    name={getEventIcon(event.status) as any}
                    size={24}
                    color={getEventColor(event.status)}
                  />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    <Ionicons name="time-outline" size={14} color="#666" />{" "}
                    {event.time}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.eventBadge,
                    { backgroundColor: getEventColor(event.status) },
                  ]}
                >
                  <Text style={styles.eventBadgeText}>
                    {getEventBadgeText(event.status, t)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Add Event Button  */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          activeOpacity={0.8}
          onPress={() => handleNavigation("/(stacks)/DermatologistListScreen")}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>{t("schedule.book")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  noEventsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  noEventsText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
    textTransform: "capitalize",
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

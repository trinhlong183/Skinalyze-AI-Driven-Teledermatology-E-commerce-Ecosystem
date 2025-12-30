"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Archive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes, format } from "date-fns";
import { enUS } from "date-fns/locale";

import { appointmentService } from "@/services/appointmentService";
import type { Appointment, FindAppointmentsDto } from "@/types/appointment";
import { AppointmentStatus, TerminationReason } from "@/types/appointment";
import { useDermatologist } from "@/contexts/DermatologistContext";

// ---  TAB GROUP CONFIGURATION ---
const TAB_CONFIG = {
  upcoming: {
    label: "Upcoming / In Progress",
    statuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS],
    icon: <CalendarClock className="h-4 w-4 mr-2" />,
  },
  completed: {
    label: "Completed & Revenue",
    statuses: [AppointmentStatus.COMPLETED, AppointmentStatus.SETTLED],
    icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
  },
  action: {
    label: "Disputed / Interrupted",
    statuses: [AppointmentStatus.DISPUTED, AppointmentStatus.INTERRUPTED],
    icon: <AlertTriangle className="h-4 w-4 mr-2" />,
  },
  cancelled: {
    label: "Canceled / No Show",
    statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    icon: <Archive className="h-4 w-4 mr-2" />,
  },
};

type TabKey = keyof typeof TAB_CONFIG;

const UPCOMING_THRESHOLD_MINUTES = 15;
const PAST_GRACE_MINUTES = 10;

const getInitials = (fullName: string) => {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(
    0
  )}`.toUpperCase();
};

const getScheduleAlert = (appointment: Appointment) => {
  if (appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS) {
    return {
      tone: "urgent" as const,
      label: "Started",
    };
  }

  if (appointment.appointmentStatus !== AppointmentStatus.SCHEDULED) {
    return null;
  }

  const now = new Date();
  const start = new Date(appointment.startTime);
  const minutesUntilStart = differenceInMinutes(start, now);

  if (minutesUntilStart <= 0) {
    if (Math.abs(minutesUntilStart) <= PAST_GRACE_MINUTES) {
      return {
        tone: "urgent" as const,
        label: minutesUntilStart === 0 ? "Starts now" : "Started",
      };
    }
    return null;
  }

  if (minutesUntilStart <= UPCOMING_THRESHOLD_MINUTES) {
    return {
      tone: "soon" as const,
      label: `Starts in ${minutesUntilStart}m`,
    };
  }

  return null;
};

// Helper: Badge Style
const getStatusBadgeVariant = (
  status: AppointmentStatus
): BadgeProps["variant"] => {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return "warning";
    case AppointmentStatus.IN_PROGRESS:
      return "info";
    case AppointmentStatus.COMPLETED:
    case AppointmentStatus.SETTLED:
      return "success";
    case AppointmentStatus.CANCELLED:
      return "secondary";
    case AppointmentStatus.NO_SHOW:
      return "yellow";
    case AppointmentStatus.DISPUTED:
      return "destructive";
    case AppointmentStatus.INTERRUPTED:
      return "signal";
    default:
      return "outline";
  }
};

// Helper: status display labels
const statusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: "Scheduled",
  [AppointmentStatus.IN_PROGRESS]: "In Progress",
  [AppointmentStatus.COMPLETED]: "Completed",
  [AppointmentStatus.CANCELLED]: "Canceled",
  [AppointmentStatus.NO_SHOW]: "No Show",
  [AppointmentStatus.INTERRUPTED]: "Interrupted",
  [AppointmentStatus.PENDING_PAYMENT]: "Pending Payment",
  [AppointmentStatus.DISPUTED]: "Disputed",
  [AppointmentStatus.SETTLED]: "Settled",
};

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for the current tab, defaults to "upcoming"
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  const { toast } = useToast();
  const router = useRouter();
  const { dermatologistId, isLoading: isDermLoading } = useDermatologist();

  // Fetch appointments based on the provided statuses
  const fetchAppointments = useCallback(
    async (statusesToFetch: AppointmentStatus[]) => {
      if (!dermatologistId) return;

      setIsLoading(true);
      try {
        const filters: FindAppointmentsDto = {
          dermatologistId: dermatologistId,
          status: statusesToFetch, // Only load statuses associated with the active tab
        };

        const data = await appointmentService.getAppointments(filters);

        const filteredData = data.filter(
          (appt) =>
            !(
              appt.appointmentStatus === AppointmentStatus.CANCELLED &&
              appt.terminatedReason === TerminationReason.PAYMENT_TIMEOUT
            )
        );

        // Sort: newest first
        filteredData.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        setAppointments(filteredData);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load appointments.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [dermatologistId, toast]
  );

  // Effect: run when the tab changes or the dermatologist profile finishes loading
  useEffect(() => {
    if (isDermLoading) return;

    if (dermatologistId) {
      // Use the statuses that correspond to the selected tab
      const statuses = TAB_CONFIG[activeTab].statuses;
      fetchAppointments(statuses);
    }
  }, [isDermLoading, dermatologistId, activeTab, fetchAppointments]);

  const handleRowClick = (appointmentId: string) => {
    router.push(`/dermatologist/appointment/${appointmentId}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Appointment Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Track and resolve your appointments by status.
        </p>
      </div>

      {/* TABS INTERFACE */}
      <Tabs
        defaultValue="upcoming"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabKey)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 lg:w-[800px] lg:grid-cols-4 mb-8">
          <TabsTrigger value="upcoming">
            {TAB_CONFIG.upcoming.icon} Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            {TAB_CONFIG.completed.icon} Completed
          </TabsTrigger>
          <TabsTrigger
            value="action"
            className="data-[state=active]:text-red-600"
          >
            {TAB_CONFIG.action.icon} Disputed
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {TAB_CONFIG.cancelled.icon} Canceled
          </TabsTrigger>
        </TabsList>

        {activeTab === "cancelled" && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>
              Indicates dermatologist-triggered cancellations or issues.
            </span>
          </div>
        )}

        {/* Shared layout for all tabs because the table structure is identical */}
        <div className="rounded-lg border bg-white shadow-sm">
          {isLoading || isDermLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-muted-foreground">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
              <div className="bg-slate-50 p-4 rounded-full mb-3">
                {TAB_CONFIG[activeTab].icon}
              </div>
              <p>No appointments in this category.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[200px]">Customer</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Appointment Type</TableHead>
                  {activeTab === "upcoming" && (
                    <TableHead>Start Alert</TableHead>
                  )}
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const isDoctorNoShow =
                    (activeTab === "cancelled" &&
                      appt.appointmentStatus === AppointmentStatus.CANCELLED &&
                      appt.terminatedReason ===
                        TerminationReason.DOCTOR_CANCELLED) ||
                    (appt.appointmentStatus === AppointmentStatus.NO_SHOW &&
                      appt.terminatedReason ===
                        TerminationReason.DOCTOR_NO_SHOW);
                  // const isDoctorIssue =
                  //   activeTab === "action" &&
                  //   appt.terminatedReason === TerminationReason.DOCTOR_ISSUE;
                  const showDoctorIndicator = isDoctorNoShow;
                  const scheduleAlert = getScheduleAlert(appt);

                  return (
                    <TableRow
                      key={appt.appointmentId}
                      onClick={() => handleRowClick(appt.appointmentId)}
                      className={`cursor-pointer transition-colors ${
                        isDoctorNoShow
                          ? "border-l-4 border-rose-400 bg-rose-50 hover:bg-rose-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {appt.customer.user.photoUrl ? (
                            <div className="relative h-10 w-10 overflow-hidden rounded-full">
                              <Image
                                src={appt.customer.user.photoUrl}
                                alt={appt.customer.user.fullName}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                              {getInitials(appt.customer.user.fullName)}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{appt.customer.user.fullName}</span>
                            {/* Optionally display email or phone number here */}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(appt.startTime), "HH:mm", {
                            locale: enUS,
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(appt.startTime), "d MMMM, yyyy", {
                            locale: enUS,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {appt.appointmentType === "NEW_PROBLEM"
                            ? "New Problem"
                            : "Follow-up"}
                        </span> */}
                        {appt.appointmentType === "NEW_PROBLEM" ? (
                          <span className="inline-flex items-center rounded-md  px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10">
                            New Concern
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Follow-up
                          </span>
                        )}
                      </TableCell>
                      {activeTab === "upcoming" && (
                        <TableCell>
                          {scheduleAlert ? (
                            <Badge
                              variant={
                                scheduleAlert.tone === "urgent"
                                  ? "warning"
                                  : "default"
                              }
                              className="pointer-events-none"
                            >
                              {scheduleAlert.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {showDoctorIndicator && (
                            <span
                              className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"
                              title={
                                isDoctorNoShow
                                  ? "Canceled by dermatologist"
                                  : "Dermatologist issue reported"
                              }
                            />
                          )}
                          <Badge
                            variant={getStatusBadgeVariant(
                              appt.appointmentStatus
                            )}
                            className="pointer-events-none"
                          >
                            {statusLabels[appt.appointmentStatus] ||
                              appt.appointmentStatus}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Tabs>
    </div>
  );
}

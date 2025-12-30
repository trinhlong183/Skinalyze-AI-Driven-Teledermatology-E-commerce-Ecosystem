"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow, differenceInYears } from "date-fns";
import { enUS } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  AlarmClock,
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Eye,
  History,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useDermatologist } from "@/contexts/DermatologistContext";
import { appointmentService } from "@/services/appointmentService";
import { treatmentRoutineService } from "@/services/treamentRoutineService";
import { customerService } from "@/services/customerService";
import type { PatientListItemDto } from "@/types/dermatologist";
import type { Customer } from "@/types/customer";
import type { Appointment } from "@/types/appointment";
import { AppointmentStatus, AppointmentType } from "@/types/appointment";
import type { TreatmentRoutine } from "@/types/treatment-routine";
import { RoutineStatus } from "@/types/treatment-routine";
import Link from "next/link";

const UPCOMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.IN_PROGRESS,
];

const COMPLETED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.SETTLED,
];

const CANCELED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

const VISIBLE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  ...UPCOMING_STATUSES,
  ...COMPLETED_STATUSES,
  ...CANCELED_STATUSES,
  AppointmentStatus.INTERRUPTED,
  AppointmentStatus.DISPUTED,
];

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
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

const appointmentTypeLabels: Record<AppointmentType, string> = {
  [AppointmentType.NEW_PROBLEM]: "New Problem",
  [AppointmentType.FOLLOW_UP]: "Follow-up",
};

const routineStatusLabels: Record<RoutineStatus, string> = {
  [RoutineStatus.ACTIVE]: "Active",
  [RoutineStatus.COMPLETED]: "Completed",
  [RoutineStatus.CANCELLED]: "Cancelled",
};

const routineStatusVariants: Record<RoutineStatus, BadgeProps["variant"]> = {
  [RoutineStatus.ACTIVE]: "success",
  [RoutineStatus.COMPLETED]: "secondary",
  [RoutineStatus.CANCELLED]: "destructive",
};

const getAppointmentBadgeVariant = (
  status: AppointmentStatus
): BadgeProps["variant"] => {
  if (COMPLETED_STATUSES.includes(status)) return "success";
  if (UPCOMING_STATUSES.includes(status)) return "warning";
  if (CANCELED_STATUSES.includes(status)) return "destructive";
  if (status === AppointmentStatus.DISPUTED) return "destructive";
  if (status === AppointmentStatus.INTERRUPTED) return "secondary";
  return "secondary";
};

const formatGender = (gender: boolean | null | undefined) => {
  if (gender === true) return "Male";
  if (gender === false) return "Female";
  return "Not specified";
};

const buildFallbackPatient = (customer: Customer): PatientListItemDto => {
  const user = customer.user;
  return {
    customerId: customer.customerId,
    userId: user.userId,
    fullName: user.fullName,
    photoUrl: user.photoUrl ?? null,
    phone: user.phone ?? "",
    age: user.dob ? differenceInYears(new Date(), new Date(user.dob)) : null,
    gender: null,
    lastAppointment: null,
    nextAppointment: null,
  };
};

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { dermatologistId, isLoading: isDermLoading } = useDermatologist();

  const customerId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [patientSnapshot, setPatientSnapshot] =
    useState<PatientListItemDto | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [routines, setRoutines] = useState<TreatmentRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!customerId || !dermatologistId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const customer = await customerService.getCustomer(customerId);

      const [appointmentList, routineList] = await Promise.all([
        appointmentService.getAppointments({
          dermatologistId,
          customerId,
          status: VISIBLE_APPOINTMENT_STATUSES,
        }),
        treatmentRoutineService.findByDermatologist(
          dermatologistId,
          customerId
        ),
      ]);

      setCustomerDetails(customer);
      setPatientSnapshot(buildFallbackPatient(customer));
      setAppointments(
        appointmentList.filter(
          (appt) => appt.appointmentStatus !== AppointmentStatus.PENDING_PAYMENT
        )
      );
      setRoutines(routineList);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load patient profile.";
      setError(message);
      toast({
        title: "Unable to load patient",
        description: message,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [customerId, dermatologistId, toast]);

  useEffect(() => {
    if (!customerId || !dermatologistId || isDermLoading) {
      return;
    }

    fetchProfile();
  }, [customerId, dermatologistId, fetchProfile, isDermLoading]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((appt) => UPCOMING_STATUSES.includes(appt.appointmentStatus))
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0] ?? null;

  const lastVisit = useMemo(() => {
    const now = Date.now();
    const recent = sortedAppointments.find(
      (appt) => new Date(appt.startTime).getTime() <= now
    );
    return recent ? new Date(recent.startTime) : null;
  }, [sortedAppointments]);

  const appointmentMetrics = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((appt) =>
      COMPLETED_STATUSES.includes(appt.appointmentStatus)
    ).length;
    const upcomingCount = upcomingAppointments.length;
    const canceled = appointments.filter((appt) =>
      CANCELED_STATUSES.includes(appt.appointmentStatus)
    ).length;

    return [
      {
        label: "Total Visits",
        value: total.toString(),
        icon: CalendarDays,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Upcoming",
        value: upcomingCount.toString(),
        icon: CalendarClock,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Completed",
        value: completed.toString(),
        icon: CalendarCheck,
        accent: "bg-indigo-100 text-indigo-600",
      },
      {
        label: "Canceled / No-show",
        value: canceled.toString(),
        icon: AlarmClock,
        accent: "bg-amber-100 text-amber-600",
      },
    ];
  }, [appointments, upcomingAppointments.length]);

  const routineMetrics = useMemo(() => {
    const active = routines.filter(
      (routine) => routine.status === RoutineStatus.ACTIVE
    ).length;
    return {
      total: routines.length,
      active,
    };
  }, [routines]);

  const sortedRoutines = useMemo(() => {
    return [...routines].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [routines]);

  const appointmentHistory = sortedAppointments.slice(0, 8);

  const userInfo = customerDetails?.user;
  const contactPhone =
    userInfo?.phone ?? patientSnapshot?.phone ?? "Not provided";
  const contactEmail = userInfo?.email ?? "Not provided";
  const age =
    patientSnapshot?.age ??
    (userInfo?.dob
      ? differenceInYears(new Date(), new Date(userInfo.dob))
      : null);
  const dobLabel = userInfo?.dob
    ? format(new Date(userInfo.dob), "PP", { locale: enUS })
    : "Not provided";
  const addressesLabel = userInfo?.addresses?.length
    ? `${userInfo.addresses.length} saved`
    : "Not provided";
  const genderLabel = formatGender(patientSnapshot?.gender);
  const lastVisitLabel = lastVisit
    ? formatDistanceToNow(lastVisit, { addSuffix: true })
    : "No visits recorded";

  if (isDermLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading patient profile...</p>
      </div>
    );
  }

  if (error || !patientSnapshot || !customerDetails) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-5 text-rose-600">
          {error || "Patient information is unavailable."}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
          <Button onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:py-8">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2 text-slate-600 hover:bg-slate-100"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" /> Back to patients
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 border-2 border-white shadow-md ring-4 ring-sky-50">
              <AvatarImage src={patientSnapshot.photoUrl || ""} />
              <AvatarFallback>
                {patientSnapshot.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {patientSnapshot.fullName}
                </h1>
                {routineMetrics.active > 0 && (
                  <Badge variant="success" className="uppercase tracking-wide">
                    {routineMetrics.active} active routine
                    {routineMetrics.active > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Last seen {lastVisitLabel}. Stay close to your patient by
                reviewing their routines and appointment history.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  <Phone className="h-3.5 w-3.5" />{" "}
                  {contactPhone || "Not provided"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  <Mail className="h-3.5 w-3.5" /> {contactEmail}
                </span>
              </div>
            </div>
          </div>
          <Card className="w-full max-w-sm border-none bg-white/80 shadow-none">
            <CardContent className="space-y-3 p-5">
              {appointmentMetrics.map(
                ({ label, value, icon: Icon, accent }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {value}
                      </p>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Next Appointment</CardTitle>
                <p className="text-sm text-slate-500">
                  Keep an eye on what is coming up for this patient.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 text-xs uppercase tracking-wide"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </Badge>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {format(
                          new Date(nextAppointment.startTime),
                          "EEEE, PPP",
                          { locale: enUS }
                        )}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {appointmentTypeLabels[nextAppointment.appointmentType]}
                      </p>
                    </div>
                    <Badge
                      variant={getAppointmentBadgeVariant(
                        nextAppointment.appointmentStatus
                      )}
                    >
                      {
                        appointmentStatusLabels[
                          nextAppointment.appointmentStatus
                        ]
                      }
                    </Badge>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      {format(new Date(nextAppointment.startTime), "PP", {
                        locale: enUS,
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlarmClock className="h-4 w-4 text-slate-500" />
                      {format(new Date(nextAppointment.startTime), "p", {
                        locale: enUS,
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-sky-600 hover:bg-sky-50"
                      onClick={() =>
                        router.push(
                          `/dermatologist/appointment/${nextAppointment.appointmentId}`
                        )
                      }
                    >
                      View appointment
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-slate-500">
                  <CalendarDays className="h-8 w-8" />
                  <p className="text-sm font-medium">
                    No upcoming appointments scheduled.
                  </p>
                  <p className="text-xs text-slate-400">
                    Book a new consultation to keep the patient engaged with
                    their treatment plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Appointment History</CardTitle>
                <p className="text-sm text-slate-500">
                  A concise history of the most recent visits with this patient.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 text-xs uppercase tracking-wide"
              >
                <History className="h-3.5 w-3.5" /> Recent
              </Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {appointmentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointmentHistory.map((appt) => (
                      <TableRow
                        key={appt.appointmentId}
                        className="hover:bg-slate-50"
                      >
                        <TableCell>
                          <div className="flex flex-col text-sm text-slate-700">
                            <span>
                              {format(new Date(appt.startTime), "PPP", {
                                locale: enUS,
                              })}
                            </span>
                            <span className="text-xs text-slate-500">
                              {format(new Date(appt.startTime), "p", {
                                locale: enUS,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {appointmentTypeLabels[appt.appointmentType]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getAppointmentBadgeVariant(
                              appt.appointmentStatus
                            )}
                          >
                            {appointmentStatusLabels[appt.appointmentStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="View details"
                            onClick={() =>
                              router.push(
                                `/dermatologist/appointment/${appt.appointmentId}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-slate-500">
                  <ClipboardList className="h-8 w-8" />
                  <p className="text-sm font-medium">
                    No appointments found for this patient yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Once consultations are completed they will be listed here
                    for quick reference.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Patient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <Mail className="h-4 w-4 text-slate-400" /> Email
                </span>
                <span className="text-slate-700">{contactEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <Phone className="h-4 w-4 text-slate-400" /> Phone
                </span>
                <span className="text-slate-700">
                  {contactPhone || "Not provided"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <MapPin className="h-4 w-4 text-slate-400" /> Address on file
                </span>
                <span className="text-slate-700">{addressesLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <Activity className="h-4 w-4 text-slate-400" /> Age
                </span>
                <span className="text-slate-700">
                  {age ? `${age} years` : "Not provided"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400" /> Gender
                </span>
                <span className="text-slate-700">{genderLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-500">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> Date of
                  birth
                </span>
                <span className="text-slate-700">{dobLabel}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Treatment Routines</CardTitle>
                <p className="text-sm text-slate-500">
                  Overview of routines prescribed for this patient.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 text-xs uppercase tracking-wide"
              >
                <Activity className="h-3.5 w-3.5" /> {routineMetrics.total}{" "}
                total
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedRoutines.length > 0 ? (
                sortedRoutines.map((routine) => (
                  <Link
                    href={`/dermatologist/routine/${routine.routineId}`}
                    key={routine.routineId}
                    className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-sky-50/70"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {routine.routineName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Created{" "}
                            {format(new Date(routine.createdAt), "PP", {
                              locale: enUS,
                            })}
                          </p>
                        </div>
                        <Badge variant={routineStatusVariants[routine.status]}>
                          {routineStatusLabels[routine.status]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          {routine.routineDetails?.length || 0} step
                          {routine.routineDetails?.length === 1 ? "" : "s"}
                        </span>
                        <span>
                          Updated{" "}
                          {formatDistanceToNow(new Date(routine.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-slate-500">
                  <ClipboardList className="h-8 w-8" />
                  <p className="text-sm font-medium">
                    No routines have been created yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Create a personalized treatment routine to guide this
                    patient through recovery.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

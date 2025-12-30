"use client";

import type { ComponentType, ReactNode } from "react";
import type { AppointmentDetailDto } from "@/types/appointment";
import { AppointmentStatus } from "@/types/appointment";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader2,
  Video,
  Briefcase,
  CalendarClock,
  Coins,
  ClipboardList,
  CheckCircle2,
  Check,
  XCircle,
  AlertOctagon,
  Flag,
  MoreVertical,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge, BadgeProps } from "@/components/ui/badge";

const statusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: "Scheduled",
  [AppointmentStatus.IN_PROGRESS]: "In Progress",
  [AppointmentStatus.COMPLETED]: "Completed",
  [AppointmentStatus.CANCELLED]: "Cancelled",
  [AppointmentStatus.NO_SHOW]: "No-show",
  [AppointmentStatus.INTERRUPTED]: "Interrupted",
  [AppointmentStatus.PENDING_PAYMENT]: "Pending Payment",
  [AppointmentStatus.DISPUTED]: "Disputed",
  [AppointmentStatus.SETTLED]: "Settled",
};

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
    case AppointmentStatus.DISPUTED:
      return "destructive";
    case AppointmentStatus.NO_SHOW:
    case AppointmentStatus.INTERRUPTED:
      return "signal";
    case AppointmentStatus.PENDING_PAYMENT:
      return "secondary";
    default:
      return "outline";
  }
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-1 h-5 w-5 text-muted-foreground" />
    <div className="flex-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 font-semibold">
        {value ?? <span className="text-muted-foreground">Not provided</span>}
      </div>
    </div>
  </div>
);

interface AppointmentActionsCardProps {
  appointment: AppointmentDetailDto;
  isJoining: boolean;
  isCompletable: boolean;
  isCancellable: boolean;
  canJoinMeet: boolean;
  routineButton: ReactNode;
  onJoinMeet: () => void;
  onCompleteClick: () => void;
  onCancelClick: () => void;

  onReportNoShowClick: () => void;
  onReportInterruptClick: () => void;
}

export function AppointmentActionsCard({
  appointment,
  isJoining,
  isCompletable,
  isCancellable,
  canJoinMeet,
  routineButton,
  onJoinMeet,
  onCompleteClick,
  onCancelClick,

  onReportNoShowClick,
  onReportInterruptClick,
}: AppointmentActionsCardProps) {
  const canReport =
    appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS ||
    appointment.appointmentStatus === AppointmentStatus.COMPLETED ||
    appointment.appointmentStatus === AppointmentStatus.INTERRUPTED ||
    appointment.appointmentStatus === AppointmentStatus.DISPUTED;
  const canReportNoShow =
    appointment.appointmentStatus !== AppointmentStatus.INTERRUPTED &&
    appointment.appointmentStatus !== AppointmentStatus.DISPUTED;
  const trimmedAdminNote = appointment.adminNote?.trim();
  const resolutionMessage = trimmedAdminNote || appointment.statusMessage;

  return (
    <Card className="shadow-lg">
      {/* Header */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Appointment Details</CardTitle>
          {/* Report Dropdown */}
          {canReport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right">
                <DropdownMenuLabel>Report Issue</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canReportNoShow && (
                  <DropdownMenuItem onClick={onReportNoShowClick}>
                    <Flag className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" />
                    <span>Report No-Show</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onReportInterruptClick}>
                  <AlertOctagon className="mr-2 h-4 w-4 text-orange-600 focus:text-orange-600" />
                  <span>Report Interruption</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CardDescription>ID: {appointment.appointmentId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Join Meeting */}
        {canJoinMeet && (
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={onJoinMeet}
            disabled={isJoining}
          >
            {isJoining ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Video className="mr-2 h-5 w-5" />
            )}
            {appointment.dermatologistJoinedAt
              ? "Re-join Meeting"
              : "Join Meeting & Check-in"}
          </Button>
        )}

        {routineButton}

        {/* Complete Button */}
        {isCompletable && (
          <Button
            size="lg"
            className="w-full"
            variant="default"
            onClick={onCompleteClick}
          >
            <Check className="mr-2 h-5 w-5" />
            Mark as Completed
          </Button>
        )}

        {/* Appointment Information */}
        <div className="space-y-4 pt-4 border-t">
          <InfoRow
            icon={CheckCircle2}
            label="Status"
            value={
              <div className="space-y-2">
                <Badge
                  variant={getStatusBadgeVariant(appointment.appointmentStatus)}
                >
                  {statusLabels[appointment.appointmentStatus] ||
                    appointment.appointmentStatus}
                </Badge>
                {Boolean(resolutionMessage) && (
                  <div
                    className={`rounded-md border p-3 text-sm font-normal ${
                      trimmedAdminNote
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide mb-1">
                      {trimmedAdminNote ? (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Admin review
                        </>
                      ) : (
                        <>System note</>
                      )}
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">
                      {trimmedAdminNote || resolutionMessage}
                    </p>
                  </div>
                )}
              </div>
            }
          />
          <InfoRow
            icon={Briefcase}
            label="Dermatologist"
            value={appointment?.dermatologist?.user?.fullName}
          />
          <InfoRow
            icon={ClipboardList}
            label="Appointment Type"
            value={
              appointment.appointmentType === "NEW_PROBLEM"
                ? "New concern"
                : "Follow-up"
            }
          />
          <InfoRow
            icon={CalendarClock}
            label="Schedule"
            value={format(
              new Date(appointment.startTime),
              "HH:mm, MMMM d, yyyy",
              { locale: enUS }
            )}
          />
          <InfoRow
            icon={Coins}
            label="Price"
            value={`${Number(appointment.price).toLocaleString("en-US")} VND`}
          />
        </div>
      </CardContent>

      {/* Cancel Button */}
      {isCancellable && (
        <CardFooter>
          <Button
            variant="destructive"
            className="w-full"
            onClick={onCancelClick}
          >
            <XCircle className="mr-2 h-5 w-5" />
            Cancel Appointment
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

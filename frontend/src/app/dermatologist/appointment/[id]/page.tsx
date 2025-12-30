"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComponentType, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { appointmentService } from "@/services/appointmentService";
import type {
  AppointmentDetailDto,
  CompleteAppointmentDto,
  InterruptAppointmentDto,
  ReportNoShowDto,
} from "@/types/appointment";
import { AppointmentStatus, TerminationReason } from "@/types/appointment";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Phone,
  Cake,
  FileText,
  Save,
  AlertCircle,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { SkinAnalysisCard } from "@/components/skin-analysis/SkinAnalysisCard";

import { AppointmentActionsCard } from "@/components/appointments/AppointmentActionsCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppointmentDetailPage() {
  const [appointment, setAppointment] = useState<AppointmentDetailDto | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const [isJoining, setIsJoining] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [dialogOpen, setDialogOpen] = useState<"complete" | "cancel" | null>(
    null
  );

  const [reportDialogOpen, setReportDialogOpen] = useState<
    "noshow" | "interrupt" | null
  >(null);
  const [isReporting, setIsReporting] = useState(false);

  const [reportNote, setReportNote] = useState("");
  const [interruptReason, setInterruptReason] = useState<TerminationReason>(
    TerminationReason.PLATFORM_ISSUE
  );

  const [medicalNote, setMedicalNote] = useState("");

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const appointmentId = params.id as string;

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) return;
    setIsLoading(true);
    try {
      const data = await appointmentService.getAppointmentById(appointmentId);
      setAppointment(data);
      if (data.medicalNote) {
        setMedicalNote(data.medicalNote);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unable to load appointment.";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, router, toast]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleSaveDraft = async () => {
    if (!appointment) return;
    setIsSavingNote(true);
    try {
      await appointmentService.updateMedicalNote(
        appointment.appointmentId,
        medicalNote
      );
      toast({
        title: "Saved",
        description: "Medical note saved successfully.",
        variant: "success",
      });
      // Không cần fetch lại toàn bộ trang để tránh giật,
      // vì state 'medicalNote' đang là mới nhất rồi.
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to save medical note.",
        variant: "error",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleReportNoShow = async () => {
    if (!appointment) return;
    setIsReporting(true);
    try {
      const dto: ReportNoShowDto = {
        note: reportNote || undefined,
      };
      // Gọi API
      await appointmentService.reportDoctorNoShow(
        appointment.appointmentId,
        dto
      );

      toast({
        title: "Report Submitted",
        description: "No-show report has been sent.",
        variant: "success",
      });
      setReportDialogOpen(null);
      setReportNote("");
      await fetchAppointment();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report.",
        variant: "error",
      });
    } finally {
      setIsReporting(false);
    }
  };

  // Handle Report Interrupt ---
  const handleReportInterrupt = async () => {
    if (!appointment) return;
    setIsReporting(true);
    try {
      const dto: InterruptAppointmentDto = {
        reason: interruptReason,
        terminationNote: reportNote || undefined,
      };
      await appointmentService.reportInterrupt(appointment.appointmentId, dto);

      toast({
        title: "Report Submitted",
        description: "Interruption report has been sent.",
        variant: "success",
      });
      setReportDialogOpen(null);
      setReportNote("");
      await fetchAppointment();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report.",
        variant: "error",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const handleJoinMeet = async () => {
    if (!appointment) return;
    setIsJoining(true);
    let meetLink = appointment.meetingUrl;
    try {
      if (!meetLink) {
        toast({
          title: "Creating meeting link...",
          description: "Please wait a moment.",
          variant: "default",
        });
        const response = await appointmentService.generateManualMeetLink(
          appointment.appointmentId
        );
        meetLink = response.meetLink;
        if (!meetLink) {
          throw new Error("Unable to create meeting link.");
        }
      }
      if (!appointment.dermatologistJoinedAt) {
        await appointmentService.checkInDermatologist(
          appointment.appointmentId
        );
        toast({
          title: "Checked In!",
          description: "Your check-in has been recorded.",
          variant: "success",
        });
      }
      window.open(meetLink, "_blank");
      await fetchAppointment();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to join meeting.",
        variant: "error",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleComplete = async () => {
    if (!appointment) return;
    setIsCompleting(true);

    try {
      // 1. (Tự động lưu Medical Note lần cuối trước khi Complete)
      // Để đảm bảo dữ liệu nhất quán
      await appointmentService.updateMedicalNote(
        appointment.appointmentId,
        medicalNote
      );

      const dto: CompleteAppointmentDto = {
        medicalNote: medicalNote || undefined,
      };
      await appointmentService.completeAppointment(
        appointment.appointmentId,
        dto
      );

      toast({
        title: "Success",
        description: "Appointment marked as COMPLETED.",
        variant: "success",
      });
      setDialogOpen(null);
      await fetchAppointment();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to complete appointment.",
        variant: "error",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setIsCancelling(true);
    try {
      await appointmentService.cancelByDermatologist(appointment.appointmentId);
      toast({
        title: "Success",
        description: "Appointment has been cancelled.",
        variant: "success",
      });
      setDialogOpen(null);
      await fetchAppointment();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to cancel appointment.",
        variant: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-red-600">Appointment not found.</p>
      </div>
    );
  }

  const canJoinMeet =
    appointment.appointmentStatus === AppointmentStatus.SCHEDULED ||
    appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;
  const isCancellable =
    appointment.appointmentStatus === AppointmentStatus.SCHEDULED;
  const isCompletable =
    appointment.dermatologistJoinedAt != null &&
    (appointment.appointmentStatus === AppointmentStatus.SCHEDULED ||
      appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS);

  const renderList = (title: string, items: string[] | null) => {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          {title}
        </Label>
        {items && items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <Badge key={index} variant="destructive">
                {item}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">None</p>
        )}
      </div>
    );
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
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <p className="font-semibold">{value ?? "Not provided"}</p>
      </div>
    </div>
  );

  const createdRoutineId = appointment.createdRoutine?.routineId;
  const trackingRoutineId = appointment.trackingRoutine?.routineId;
  const targetRoutineId = createdRoutineId || trackingRoutineId;
  const routineButton = (
    <Button asChild size="lg" className="w-full" variant="outline">
      {targetRoutineId ? (
        <Link href={`/dermatologist/routine/${targetRoutineId}`}>
          <ClipboardCheck className="mr-2 h-5 w-5" />
          View / Update Treatment Routine
        </Link>
      ) : (
        <Link
          href={{
            pathname: "/dermatologist/routine/create",
            query: {
              appointmentId: appointment.appointmentId,
              customerId: appointment.customer.customerId,
              dermatologistId: appointment.dermatologist.dermatologistId,
            },
          }}
        >
          <ClipboardCheck className="mr-2 h-5 w-5" />
          Create New Treatment Routine
        </Link>
      )}
    </Button>
  );

  const showMedicalNoteCard =
    appointment.dermatologistJoinedAt != null ||
    appointment.appointmentStatus === AppointmentStatus.COMPLETED;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Appointments
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Large) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Customer Information Card */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4">
              <Image
                src={
                  appointment.customer.user.photoUrl ||
                  "https://placehold.co/80x80/e0e0e0/333?text=User"
                }
                alt="Avatar"
                className="h-20 w-20 rounded-full border"
                width={80}
                height={80}
                unoptimized
              />
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {appointment.customer.user.fullName}
                </CardTitle>
                <CardDescription>
                  {appointment.customer.user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={appointment.customer.user.phone}
                />
                <InfoRow
                  icon={Cake}
                  label="Date of Birth"
                  value={format(
                    new Date(appointment.customer.user.dob!),
                    "MMMM d, yyyy",
                    { locale: enUS }
                  )}
                />
              </div>

              {appointment.note && (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-semibold text-yellow-700">
                      Customer Note:
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 italic pl-6">
                    {appointment.note}
                  </p>
                </div>
              )}

              <Separator />
              {renderList("Allergies", appointment.customer.user.allergies)}
              {renderList(
                "Dermatological History",
                appointment.customer.pastDermatologicalHistory
              )}
            </CardContent>
          </Card>

          {appointment.skinAnalysis && (
            <SkinAnalysisCard analysis={appointment.skinAnalysis} />
          )}

          {/* 3.  Card Medical Note  */}
          {showMedicalNoteCard && (
            <Card className="shadow-lg border-blue-200 border-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl text-blue-900">
                      Medical Notes
                    </CardTitle>
                    <CardDescription>
                      Your private medical diagnosis & observations.
                    </CardDescription>
                  </div>
                </div>

                {/* Button Save Draft */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  // Disable the save button if already completed (read-only)
                  disabled={
                    isSavingNote ||
                    appointment.appointmentStatus ===
                      AppointmentStatus.COMPLETED
                  }
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {isSavingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea
                  placeholder="Start typing your medical notes here..."
                  className="min-h-[200px] text-base resize-y bg-white"
                  value={medicalNote}
                  onChange={(e) => setMedicalNote(e.target.value)}
                  // Disable the textarea if already completed (read-only)
                  disabled={
                    appointment.appointmentStatus ===
                    AppointmentStatus.COMPLETED
                  }
                />
                <p className="text-xs text-muted-foreground mt-2 italic">
                  * Note: This content is saved automatically when you click
                  &quot;Save Draft&quot; or &quot;Complete Appointment&quot;.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Small) */}
        <div className="lg:col-span-1 space-y-6">
          <AppointmentActionsCard
            appointment={appointment}
            isJoining={isJoining}
            isCompletable={isCompletable}
            isCancellable={isCancellable}
            canJoinMeet={canJoinMeet}
            // canManageRoutine={canManageRoutine}
            routineButton={routineButton}
            onJoinMeet={handleJoinMeet}
            onCompleteClick={() => setDialogOpen("complete")}
            onCancelClick={() => setDialogOpen("cancel")}
            onReportNoShowClick={() => {
              setReportNote("");
              setReportDialogOpen("noshow");
            }}
            onReportInterruptClick={() => {
              setReportNote("");
              setInterruptReason(TerminationReason.PLATFORM_ISSUE); // Reset reason
              setReportDialogOpen("interrupt");
            }}
          />
        </div>
      </div>
      {/*  Dialog Report No-Show  */}
      <AlertDialog
        open={reportDialogOpen === "noshow"}
        onOpenChange={(open) => !open && setReportDialogOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report No-Show</AlertDialogTitle>
            <AlertDialogDescription>
              Report that the other party did not show up for the appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Additional Note (Optional)</Label>
            <Textarea
              placeholder="E.g., Waited for 15 minutes but no one joined..."
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportNoShow}
              disabled={isReporting}
            >
              {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*  Dialog Report Interrupt  */}
      <AlertDialog
        open={reportDialogOpen === "interrupt"}
        onOpenChange={(open) => !open && setReportDialogOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Interruption</AlertDialogTitle>
            <AlertDialogDescription>
              Report an issue that interrupted the appointment session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Reason for Interruption</Label>
              <Select
                value={interruptReason}
                onValueChange={(val) =>
                  setInterruptReason(val as TerminationReason)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TerminationReason.CUSTOMER_ISSUE}>
                    Customer Issue (Connection/Device)
                  </SelectItem>
                  <SelectItem value={TerminationReason.DOCTOR_ISSUE}>
                    Doctor Issue
                  </SelectItem>
                  <SelectItem value={TerminationReason.PLATFORM_ISSUE}>
                    Platform/System Issue
                  </SelectItem>
                </SelectContent>
              </Select>
              {interruptReason === TerminationReason.DOCTOR_ISSUE && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Confirm the issue is on your side?
                    </p>
                    <p>
                      You are reporting that the interruption was caused by your
                      actions. The appointment will be cancelled and 100% of the
                      payment will be refunded to the customer immediately.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Detailed Description (Optional)</Label>
              <Textarea
                placeholder="Describe what happened..."
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportInterrupt}
              disabled={isReporting}
            >
              {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Dialog Cancel */}
      <AlertDialog
        open={dialogOpen === "cancel"}
        onOpenChange={(open) => !open && setDialogOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Complete (With Medical Note Review) */}
      <AlertDialog
        open={dialogOpen === "complete"}
        onOpenChange={(open) => !open && setDialogOpen(null)}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Appointment Session</AlertDialogTitle>
            <AlertDialogDescription>
              Please review your notes and confirm to close this session.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-6">
            {/* 1. Review Medical Note */}
            <div className="space-y-2">
              <Label className="font-semibold text-blue-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Medical Notes (Review)
              </Label>
              <Textarea
                value={medicalNote}
                onChange={(e) => setMedicalNote(e.target.value)}
                className="min-h-[120px] bg-blue-50/50 text-sm"
                placeholder="Ensure your medical notes are complete..."
              />
              <p className="text-xs text-muted-foreground">
                * These notes will be saved to the patient&apos;s medical
                record.
              </p>
            </div>

            <Separator />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCompleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm & Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

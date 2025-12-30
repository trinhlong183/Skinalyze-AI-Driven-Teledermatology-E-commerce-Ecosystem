"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { appointmentService } from "@/services/appointmentService";
import type {
  Appointment,
  ResolveDisputeDto,
  AllowedDisputeReason,
} from "@/types/appointment";
import {
  AppointmentStatus,
  DisputeDecision,
  ALLOWED_DISPUTE_REASONS,
} from "@/types/appointment";
import { format, differenceInMinutes } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  AlertTriangle,
  User,
  Stethoscope,
  Wallet,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Gavel,
  Undo2,
  Check,
  Scale,
  ArrowLeft,
  Phone,
  ChevronUp,
  ChevronDown,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function ReportResolutionPage() {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  // State cho Verdict Panel
  const [adminNote, setAdminNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundPercentage, setRefundPercentage] = useState("");
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [finalReason, setFinalReason] = useState<
    AllowedDisputeReason | undefined
  >();

  // State cho Confirmation Dialog
  const [confirmAction, setConfirmAction] = useState<DisputeDecision | null>(
    null
  );

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await appointmentService.getAppointmentById(appointmentId);
        setAppointment(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load appointment details.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appointmentId, toast]);

  // 2. Handle Resolve
  const handleResolve = async () => {
    if (!confirmAction || !appointment) return;

    setIsSubmitting(true);
    try {
      const dto: ResolveDisputeDto = {
        decision: confirmAction,
        adminNote: adminNote,
        refundAmount:
          confirmAction === DisputeDecision.PARTIAL_REFUND
            ? Math.round(refundValue)
            : undefined,
        finalReason: finalReason ?? undefined,
      };

      await appointmentService.resolveDispute(appointment.appointmentId, dto);

      toast({
        title: "Resolution Submitted",
        description: `Case resolved as: ${confirmAction}`,
        variant: "success",
      });
      setConfirmAction(null);
      router.push("/admin/reports"); // Quay lại danh sách báo cáo
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit resolution.";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!appointment) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-red-600">Case not found.</p>
        </div>
      </AdminLayout>
    );
  }

  const toNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  const toTrimmedDecimal = (value: number) =>
    value.toFixed(2).replace(/\.?0+$/, "");

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) {
      return "0%";
    }
    return `${toTrimmedDecimal(value)}%`;
  };

  const percentToInputString = (value: number) => toTrimmedDecimal(value);

  const scheduledDurationMins = Math.max(
    1,
    differenceInMinutes(
      new Date(appointment.endTime),
      new Date(appointment.startTime)
    )
  );

  const hasActualEnd = Boolean(appointment.actualEndTime);
  const actualDurationMins = hasActualEnd
    ? Math.max(
        0,
        differenceInMinutes(
          new Date(appointment.actualEndTime as string),
          new Date(appointment.startTime)
        )
      )
    : 0;

  const progressPercent = hasActualEnd
    ? Math.min(100, (actualDurationMins / scheduledDurationMins) * 100)
    : 0;
  const progressDisplay = Number.isFinite(progressPercent)
    ? Math.round(progressPercent)
    : 0;

  const paymentAmountValue = toNumber(
    appointment.payment?.amount ?? appointment.price
  );
  const listPriceValue = toNumber(appointment.price);
  const monetaryBase = paymentAmountValue ?? listPriceValue ?? 0;
  const hasPayment = Boolean(appointment.payment);
  const refundValueRaw = toNumber(refundAmount);
  const refundValue = (() => {
    if (refundValueRaw === null) {
      return 0;
    }
    return Math.min(monetaryBase, Math.max(0, refundValueRaw));
  })();
  const doctorShare = Math.max(0, monetaryBase - refundValue);
  const refundPercent = monetaryBase
    ? Math.min(100, Math.max(0, (refundValue / monetaryBase) * 100))
    : 0;
  const doctorPercent = Math.max(0, 100 - refundPercent);

  const handleRefundAmountChange = (value: string) => {
    if (value === "") {
      setRefundAmount("");
      setRefundPercentage("");
      return;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      setRefundAmount(value);
      return;
    }

    const clamped = Math.max(0, Math.min(monetaryBase, numeric));
    const rounded = Math.round(clamped);
    setRefundAmount(String(rounded));

    if (monetaryBase > 0) {
      const percent = (rounded / monetaryBase) * 100;
      setRefundPercentage(percentToInputString(percent));
    } else {
      setRefundPercentage("");
    }
  };

  const handleRefundPercentageChange = (value: string) => {
    if (value === "") {
      setRefundPercentage("");
      setRefundAmount("");
      return;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      setRefundPercentage(value);
      return;
    }

    const clampedPercent = Math.max(0, Math.min(100, numeric));
    setRefundPercentage(percentToInputString(clampedPercent));

    if (monetaryBase > 0) {
      const amount = Math.round((monetaryBase * clampedPercent) / 100);
      setRefundAmount(String(amount));
    } else {
      setRefundAmount("");
    }
  };

  const humanizePaymentMethod = (method?: string | null) => {
    if (!method) {
      return "Wallet / Plan credit";
    }
    switch (method.toLowerCase()) {
      case "banking":
        return "Bank transfer";
      case "wallet":
        return "Wallet balance";
      default:
        return method
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  };

  const normalizeStatus = (status?: string | null) => {
    if (!status) {
      return "Unknown";
    }
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const paymentStatusLabel = normalizeStatus(
    appointment.payment?.status ?? appointment.payment?.paymentStatus
  );

  const actualEndTimeLabel = appointment.actualEndTime
    ? format(new Date(appointment.actualEndTime), "HH:mm")
    : null;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        {" "}
        {/* Padding bottom lớn cho Sticky Footer */}
        {/* --- 1. Header Area --- */}
        <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <span
                className="hover:underline cursor-pointer"
                onClick={() => router.push("/admin/reports")}
              >
                Reports
              </span>
              <span>/</span>
              <span className="font-mono text-slate-700">
                #{appointment.appointmentId.substring(0, 8)}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  Dispute Resolution
                  <span className="font-mono text-lg font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    #{appointment.appointmentId.substring(0, 8)}
                  </span>
                </h1>
                <p className="text-slate-500 mt-1">
                  Review evidence and make a final financial decision.
                </p>
              </div>

              {/* Status Badge (Prominent) */}
              <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Current Status
                  </span>
                  <span className="font-bold text-lg">
                    {appointment.appointmentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-8 max-w-7xl space-y-8">
          {/* --- 2. Participants (The Parties) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Customer Info */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6 flex items-start gap-4">
                <Image
                  src={
                    appointment.customer.user.photoUrl ||
                    "https://placehold.co/64x64/e0e0e0/333?text=CU"
                  }
                  alt="Customer"
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-slate-100"
                  unoptimized
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {appointment.customer.user.fullName}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        Customer
                      </p>
                    </div>
                    {/* Link to profile */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      {appointment.customer.user.email || "Not provided"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      {appointment.customer.user.phone || "Not provided"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Wallet className="h-3.5 w-3.5" />
                      Balance:{" "}
                      <span className="font-semibold text-green-600">
                        1,500,000 đ
                      </span>{" "}
                      {/* (Mock data) */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Dermatologist Info */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-6 flex items-start gap-4">
                <Image
                  src={
                    appointment?.dermatologist?.user?.photoUrl ||
                    "https://placehold.co/64x64/e0e0e0/333?text=DR"
                  }
                  alt="Doctor"
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-slate-100"
                  unoptimized
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        Dr. {appointment?.dermatologist?.user?.fullName}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        Dermatologist
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-md text-yellow-800 text-xs font-bold">
                      ⭐ 4.8
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      {appointment?.dermatologist?.user?.email ||
                        "Not provided"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      {appointment?.dermatologist?.user?.phone ||
                        "Not provided"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-3.5 w-3.5" /> Hospital Info{" "}
                      {/* (Mock) */}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Stethoscope className="h-3.5 w-3.5" /> Specialization{" "}
                      {/* (Mock) */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* --- 3. The "Courtroom" (Evidence & Reports) --- */}
          <Card className="overflow-hidden border-2 border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Gavel className="h-5 w-5" />
                Evidence & Claims
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Left: Customer's Claim */}
                <div className="p-8 bg-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        Customer Report
                      </h3>
                    </div>
                  </div>

                  {/* (Hiển thị report thực tế nếu có, ở đây dùng mock based on status) */}
                  {appointment.appointmentStatus ===
                    AppointmentStatus.INTERRUPTED ||
                  appointment.appointmentStatus ===
                    AppointmentStatus.DISPUTED ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="blue" className="text-sm px-3 py-1">
                          {appointment.customerReportReason || "N/A"}
                        </Badge>
                      </div>
                      <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-blue-900 relative">
                        {/* Mũi tên chat bubble */}
                        <div className="absolute top-0 left-6 -mt-2 w-4 h-4 bg-blue-50 border-t border-l border-blue-100 transform rotate-45"></div>
                        <p className="italic leading-relaxed">
                          {appointment.customerReportNote ||
                            "No detailed description provided by customer."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                      <CheckCircle2 className="h-10 w-10 mb-2 opacity-50" />
                      <p className="font-medium">No Report Submitted</p>
                    </div>
                  )}
                </div>

                {/* Right: Dermatologist's Report */}
                <div className="p-8 bg-slate-50/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        Dermatologist Report
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="green" className="text-sm px-3 py-1">
                        {appointment.dermatologistReportReason || "N/A"}
                      </Badge>
                      {/* <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                        {format(
                          new Date(appointment.updatedAt),
                          "HH:mm - dd/MM"
                        )}
                      </span> */}
                    </div>
                    <div className="bg-green-50 p-5 rounded-xl border border-green-100 text-green-900 relative">
                      {/* Mũi tên chat bubble */}
                      <div className="absolute top-0 left-6 -mt-2 w-4 h-4 bg-green-50 border-t border-l border-green-100 transform rotate-45"></div>
                      <p className="italic leading-relaxed">
                        {appointment.dermatologistReportNote ||
                          "No detailed description provided by dermatologist."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- 4. System Logs --- */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-slate-500" />
                System Logs & Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metrics Grid */}
                <div className="space-y-4 lg:col-span-1">
                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Scheduled Time
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-slate-900">
                        {format(new Date(appointment.startTime), "HH:mm")}
                      </p>
                      <span className="text-slate-400">-</span>
                      <p className="text-xl font-bold text-slate-900">
                        {format(new Date(appointment.endTime), "HH:mm")}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Scheduled for {scheduledDurationMins} minutes
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Check-in times
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">
                          Customer
                        </span>
                        {appointment.customerJoinedAt ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 gap-1"
                          >
                            <Check className="h-3 w-3" />{" "}
                            {format(
                              new Date(appointment.customerJoinedAt),
                              "HH:mm"
                            )}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Not Joined
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">
                          Dermatologist
                        </span>
                        {appointment.dermatologistJoinedAt ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 gap-1"
                          >
                            <Check className="h-3 w-3" />{" "}
                            {format(
                              new Date(appointment.dermatologistJoinedAt),
                              "HH:mm"
                            )}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Not Joined
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">
                          Actual end
                        </span>
                        {actualEndTimeLabel ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-700 border-slate-200 gap-1"
                          >
                            <Check className="h-3 w-3" /> {actualEndTimeLabel}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"
                          >
                            <Clock className="h-3 w-3" /> Pending log
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Payment / Plan
                    </p>
                    {hasPayment ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Amount</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(monetaryBase)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Method</span>
                          <span className="font-medium text-slate-700">
                            {humanizePaymentMethod(
                              appointment.payment?.paymentMethod ??
                                appointment.payment?.paymentType ??
                                undefined
                            )}
                          </span>
                        </div>
                        {appointment.payment?.paymentCode && (
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>PayCode</span>
                            <span className="font-mono text-slate-600">
                              {appointment.payment.paymentCode}
                            </span>
                          </div>
                        )}
                        <div>
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {paymentStatusLabel}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">
                          Booked via subscription plan (no direct payment).
                        </div>
                        {typeof listPriceValue === "number" ? (
                          <p className="text-xs text-slate-500">
                            Reference price: {formatCurrency(listPriceValue)}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Timeline (Progress Bar) */}
                <div className="lg:col-span-2 p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-center">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-slate-600">Session Progress</span>
                    <span className="text-slate-900">
                      {progressDisplay}% Completed
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-4 rounded-full bg-slate-200"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>0 mins</span>
                    <span>{actualDurationMins} mins actual</span>
                    <span>{scheduledDurationMins} mins scheduled</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-4 bg-white p-3 rounded border border-slate-200 inline-block">
                    ℹ️ <strong>System Note:</strong>{" "}
                    {hasActualEnd ? (
                      <>
                        Actual session length logged at {actualDurationMins}{" "}
                        mins over {scheduledDurationMins} mins scheduled.
                      </>
                    ) : (
                      <>
                        Actual end time not recorded yet. Progress will stay at
                        0% until the session end is logged.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* --- 5. The Verdict Panel (Sticky Footer) --- */}
        <div className="sticky bottom-0 inset-x-0 z-40 pointer-events-none">
          <div className="container mx-auto max-w-6xl flex justify-end px-6 pb-2 ">
            <Button
              type="button"
              variant="signal"
              className="pointer-events-auto gap-2"
              onClick={() => setIsPanelOpen((prev) => !prev)}
            >
              {isPanelOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isPanelOpen
                  ? "Hide Resolution Panel"
                  : "Show Resolution Panel"}
              </span>
            </Button>
          </div>

          {isPanelOpen && (
            <div className="pointer-events-auto bg-white border-t border-slate-200 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
              <div className="relative container mx-auto max-w-6xl flex flex-col lg:flex-row gap-8 items-start p-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-6 top-6 text-slate-500 hover:text-slate-800"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <ChevronDown className="h-5 w-5" />
                  <span className="sr-only">Collapse verdict panel</span>
                </Button>
                {/* Input Note */}
                <div className="flex-1 w-full space-y-5 pr-12">
                  <div className="space-y-2">
                    <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                      Final Reason
                    </Label>
                    <Select
                      value={finalReason}
                      onValueChange={(value) =>
                        setFinalReason(value as AllowedDisputeReason)
                      }
                    >
                      <SelectTrigger className="h-12 bg-slate-50 text-left">
                        <SelectValue placeholder="Select the final termination reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOWED_DISPUTE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {normalizeStatus(reason)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Label
                    htmlFor="adminNote"
                    className="text-base font-bold text-slate-800 flex items-center gap-2"
                  >
                    Admin Resolution Note
                    <span className="text-red-500 text-sm font-normal">
                      (Required)
                    </span>
                  </Label>

                  <Textarea
                    id="adminNote"
                    placeholder="Explain your decision clearly (e.g., 'Verified system logs, Doctor was absent for 20 mins...')"
                    className="resize-none h-28 text-base bg-slate-50 focus:bg-white transition-colors"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 w-full lg:w-auto min-w-[380px]">
                  {/* Option C: Partial (Split) - Toggle Input */}
                  <div className="w-full">
                    <Button
                      variant={showPartialInput ? "secondary" : "outline"}
                      className={`w-full justify-center gap-2 h-12 text-base ${
                        showPartialInput
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        if (showPartialInput) {
                          setRefundAmount("");
                          setRefundPercentage("");
                        }
                        setShowPartialInput((prev) => !prev);
                      }}
                    >
                      <Scale className="h-5 w-5" />
                      {showPartialInput
                        ? "Cancel Split Refund"
                        : "Partial Refund (Split)"}
                    </Button>
                  </div>

                  {/* Input for Partial Refund */}
                  {showPartialInput ? (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                          Refund to Customer
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0"
                              value={refundAmount}
                              onChange={(e) =>
                                handleRefundAmountChange(e.target.value)
                              }
                              className="h-10 pl-3 pr-12 bg-white border-blue-200 focus-visible:ring-blue-500"
                              min={0}
                              max={monetaryBase || undefined}
                              disabled={monetaryBase <= 0}
                            />
                            <span className="absolute right-3 top-2.5 text-sm text-slate-400 font-medium">
                              VND
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0"
                              value={refundPercentage}
                              onChange={(e) =>
                                handleRefundPercentageChange(e.target.value)
                              }
                              className="h-10 pl-3 pr-10 bg-white border-blue-200 focus-visible:ring-blue-500"
                              min={0}
                              max={100}
                              disabled={monetaryBase <= 0}
                            />
                            <span className="absolute right-3 top-2.5 text-sm text-slate-400 font-medium">
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Auto-calc Summary */}
                      <div className="text-sm space-y-1 pt-2 border-t border-blue-200">
                        <div className="flex justify-between text-slate-600">
                          <span>Total Paid:</span>
                          <span>
                            {hasPayment
                              ? formatCurrency(monetaryBase)
                              : typeof listPriceValue === "number"
                              ? `${formatCurrency(listPriceValue)} (plan)`
                              : "Plan booking"}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-green-700 flex items-center gap-1">
                            <Undo2 className="h-3 w-3" /> Customer gets:
                          </span>
                          <span className="text-green-700 flex items-center gap-2">
                            {formatCurrency(refundValue)}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">
                              {formatPercent(refundPercent)}
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-blue-700 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Doctor gets:
                          </span>
                          <span className="text-blue-700 flex items-center gap-2">
                            {formatCurrency(doctorShare)}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wide">
                              {formatPercent(doctorPercent)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold shadow-md"
                        disabled={
                          !adminNote ||
                          monetaryBase <= 0 ||
                          refundValue <= 0 ||
                          refundValue > monetaryBase
                        }
                        onClick={() =>
                          setConfirmAction(DisputeDecision.PARTIAL_REFUND)
                        }
                      >
                        Confirm Split Decision
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {/* Option A: Refund Customer */}
                      <Button
                        variant="outline"
                        className="flex-1 h-14 flex-col gap-1 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 transition-all"
                        disabled={
                          !adminNote || finalReason === "CUSTOMER_NO_SHOW"
                        }
                        onClick={() =>
                          setConfirmAction(DisputeDecision.REFUND_CUSTOMER)
                        }
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <Undo2 className="h-5 w-5" /> REFUND CUSTOMER
                        </div>
                        <span className="text-[10px] opacity-80 font-normal">
                          100% to Customer
                        </span>
                      </Button>

                      {/* Option B: Payout Doctor */}
                      <Button
                        className="flex-1 h-14 flex-col gap-1 bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                        disabled={
                          !adminNote || finalReason === "DOCTOR_NO_SHOW"
                        }
                        onClick={() =>
                          setConfirmAction(DisputeDecision.PAYOUT_DOCTOR)
                        }
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <Check className="h-5 w-5" /> PAYOUT DOCTOR
                        </div>
                        <span className="text-[10px] opacity-80 font-normal text-emerald-100">
                          100% to Doctor
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Confirmation Dialog */}
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={() => setConfirmAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Final Resolution</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-2">
                  <div>
                    You are about to resolve this dispute with the following
                    decision:
                  </div>

                  <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-slate-800">
                    <div className="font-bold text-lg mb-1">
                      {confirmAction === DisputeDecision.REFUND_CUSTOMER &&
                        "REFUND CUSTOMER (100%)"}
                      {confirmAction === DisputeDecision.PAYOUT_DOCTOR &&
                        "PAYOUT DOCTOR (100%)"}
                      {confirmAction === DisputeDecision.PARTIAL_REFUND &&
                        "PARTIAL REFUND (SPLIT)"}
                    </div>
                    <div className="text-sm text-slate-600">
                      {confirmAction === DisputeDecision.REFUND_CUSTOMER &&
                        "The customer will receive a full refund immediately. The doctor receives 0."}
                      {confirmAction === DisputeDecision.PAYOUT_DOCTOR &&
                        "The funds will be transferred to the doctor's wallet. The customer receives 0."}
                      {confirmAction === DisputeDecision.PARTIAL_REFUND && (
                        <ul className="list-disc list-inside mt-1">
                          <li>
                            Customer receives:
                            <strong>
                              {formatCurrency(refundValue)} =
                              {formatPercent(refundPercent)}
                            </strong>
                          </li>
                          <li>
                            Doctor receives:
                            <strong>
                              {formatCurrency(doctorShare)} =
                              {formatPercent(doctorPercent)}
                            </strong>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                  {finalReason && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      <strong>Final reason confirmed:</strong>
                      {normalizeStatus(finalReason)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 font-bold text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    This action is irreversible.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResolve}
                className="bg-slate-900 hover:bg-slate-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gavel className="mr-2 h-4 w-4" />
                )}
                Execute Decision
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

import { Customer } from "./customer";
import type { Dermatologist } from "./dermatologist";
import { SkinAnalysis } from "./skin-analysis";
import { TreatmentRoutine } from "./treatment-routine";

export interface Payment {
  paymentId: string | number;
  amount: string | number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paymentType?: string | null;
  paymentCode?: string | null;
  paidAmount?: string | number | null;
}

export enum AppointmentStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
  INTERRUPTED = "INTERRUPTED",
  DISPUTED = "DISPUTED",
  SETTLED = "SETTLED",
}

export enum AppointmentType {
  NEW_PROBLEM = "NEW_PROBLEM",
  FOLLOW_UP = "FOLLOW_UP",
}

export enum TerminationReason {
  CUSTOMER_CANCELLED_EARLY = "CUSTOMER_CANCELLED_EARLY",
  CUSTOMER_CANCELLED_LATE = "CUSTOMER_CANCELLED_LATE",

  DOCTOR_CANCELLED = "DOCTOR_CANCELLED",
  PAYMENT_TIMEOUT = "PAYMENT_TIMEOUT",
  SYSTEM_CANCELLED = "SYSTEM_CANCELLED",

  CUSTOMER_NO_SHOW = "CUSTOMER_NO_SHOW",
  DOCTOR_NO_SHOW = "DOCTOR_NO_SHOW",

  CUSTOMER_ISSUE = "CUSTOMER_ISSUE",
  DOCTOR_ISSUE = "DOCTOR_ISSUE",
  PLATFORM_ISSUE = "PLATFORM_ISSUE",
}

export const ALLOWED_DISPUTE_REASONS = [
  TerminationReason.DOCTOR_NO_SHOW,
  TerminationReason.CUSTOMER_NO_SHOW,
  TerminationReason.DOCTOR_ISSUE,
  TerminationReason.CUSTOMER_ISSUE,
  TerminationReason.PLATFORM_ISSUE,
  TerminationReason.SYSTEM_CANCELLED,
] as const satisfies readonly TerminationReason[];

export type AllowedDisputeReason = (typeof ALLOWED_DISPUTE_REASONS)[number];

export interface Appointment {
  appointmentId: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  price: number | string;
  note: string | null;
  medicalNote: string | null;
  meetingUrl: string | null;
  appointmentType: AppointmentType;
  appointmentStatus: AppointmentStatus;
  terminatedReason: TerminationReason | null;
  terminationNote?: string | null;

  customerReportReason: string | null;
  customerReportNote: string | null;

  dermatologistReportReason: string | null;
  dermatologistReportNote: string | null;

  createdAt: string;
  updatedAt: string;
  adminNote?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;

  customerJoinedAt: string | null;
  dermatologistJoinedAt: string | null;

  customer: Customer;
  dermatologist: Dermatologist;
  skinAnalysis: SkinAnalysis | null;
  payment: Payment | null;

  trackingRoutine: TreatmentRoutine | null;
  createdRoutine: TreatmentRoutine | null;
}

export interface CompleteAppointmentDto {
  medicalNote?: string;
}

export interface UpdateMedicalNoteDto {
  medicalNote: string;
}

export interface FindAppointmentsDto {
  customerId?: string;
  dermatologistId?: string;
  status?: AppointmentStatus[];
}

export interface ReportNoShowDto {
  note?: string;
}

export interface InterruptAppointmentDto {
  reason: TerminationReason;
  terminationNote?: string;
}

export type AppointmentDetailDto = Omit<Appointment, never> & {
  statusMessage: string | null;
};

export enum DisputeDecision {
  REFUND_CUSTOMER = "REFUND_CUSTOMER",
  PAYOUT_DOCTOR = "PAYOUT_DOCTOR",
  PARTIAL_REFUND = "PARTIAL_REFUND",
}

export interface ResolveDisputeDto {
  decision: DisputeDecision;
  adminNote: string;
  refundAmount?: number; // Required if PARTIAL_REFUND
  finalReason?: AllowedDisputeReason;
}

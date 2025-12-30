import { Customer } from "./customer.type";
import { Dermatologist } from "./dermatologist.type";
import { Payment } from "./payment.type";
import { TreatmentRoutine } from "./treatment-routine.type";

export enum AppointmentType {
  NEW_PROBLEM = "NEW_PROBLEM",
  FOLLOW_UP = "FOLLOW_UP",
}

export enum TerminationReason {
  // CANCELLED
  CUSTOMER_CANCELLED_EARLY = "CUSTOMER_CANCELLED_EARLY",
  CUSTOMER_CANCELLED_LATE = "CUSTOMER_CANCELLED_LATE",
  DOCTOR_CANCELLED = "DOCTOR_CANCELLED",
  PAYMENT_TIMEOUT = "PAYMENT_TIMEOUT",
  SYSTEM_CANCELLED = "SYSTEM_CANCELLED",

  //  NO_SHOW
  CUSTOMER_NO_SHOW = "CUSTOMER_NO_SHOW",
  DOCTOR_NO_SHOW = "DOCTOR_NO_SHOW",

  //  INTERRUPTED (After 'IN_PROGRESS')
  CUSTOMER_ISSUE = "CUSTOMER_ISSUE",
  DOCTOR_ISSUE = "DOCTOR_ISSUE",
  PLATFORM_ISSUE = "PLATFORM_ISSUE",
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

// Payment as GO Appointment Reservation
export interface CreateAppointmentDto {
  dermatologistId: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;

  analysisId?: string;
  trackingRoutineId?: string;

  note?: string;
}

export interface ReportNoShowDto {
  note?: string;
}

export interface InterruptAppointmentDto {
  reason: TerminationReason;
  terminationNote?: string;
}

export interface CreateSubscriptionAppointmentDto extends CreateAppointmentDto {
  customerSubscriptionId: string;
}

export interface AppointmentReservationResult {
  appointmentId: string;
  paymentCode: string;
  paymentMethod: string;
  paymentType: string;
  expiredAt: string;
  bankingInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    qrCodeUrl: string;
  };
}

export type Appointment = {
  appointmentId: string;
  paymentId: string | null;
  dermatologistId: string;
  customerId: string;
  analysisId: string | null;
  customerSubscriptionId: string | null;
  trackingRoutineId: string | null;

  customerJoinedAt: string | null;
  dermatologistJoinedAt: string | null;
  startTime: string;
  endTime: string;
  price: number;
  note: string | null;
  medicalNote: string | null;
  meetingUrl: string | null;

  // Enums
  appointmentType: AppointmentType;
  appointmentStatus: AppointmentStatus;
  terminatedReason: TerminationReason | null;
  terminationNote: string | null;

  adminNote: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
};

export interface AppointmentWithRelations extends Appointment {
  customer: Customer | null;
  dermatologist: Dermatologist | null;
  payment: Payment | null;
  createdRoutine: TreatmentRoutine | null;
  trackingRoutine: TreatmentRoutine | null;
}

export type AppointmentDetailDto = AppointmentWithRelations & {
  statusMessage: string | null;
};

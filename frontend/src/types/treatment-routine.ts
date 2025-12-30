import type { AppointmentType } from "./appointment";
import type { RoutineDetail } from "./routine-detail";

export enum RoutineStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface CreateTreatmentRoutineDto {
  routineName: string;
  dermatologistId: string;
  customerId: string;
  originalAnalysisId?: string;
  createdFromAppointmentId?: string;
  status: RoutineStatus;
}

export type UpdateTreatmentRoutineDto = Partial<CreateTreatmentRoutineDto>;

export interface TreatmentRoutine {
  routineId: string;
  routineName: string;
  status: RoutineStatus;
  dermatologistId: string;
  routineDetails: RoutineDetail[];
  customerId: string;
  createdFromAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineSnapshot {
  routineName: string;
  details: RoutineDetail[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: AppointmentType;
  doctorNote: string | null;
  skinAnalysisImages: string[];
  routine: RoutineSnapshot | null;
}

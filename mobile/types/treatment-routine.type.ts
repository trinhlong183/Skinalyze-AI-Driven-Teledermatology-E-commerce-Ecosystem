export enum RoutineStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface TreatmentRoutine {
  routineId: string;
  routineName: string;
  status: RoutineStatus;
  createdAt: string;
}

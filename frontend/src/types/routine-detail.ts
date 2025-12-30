import type { Product } from "./product";

export const ROUTINE_STEP_TYPES = [
  "morning",
  "noon",
  "evening",
  "oral",
  "other",
] as const;

export type RoutineStepType = (typeof ROUTINE_STEP_TYPES)[number];

export interface RoutineProductItem {
  routineDetailProductId?: string;
  productId?: string | null;
  productName: string;
  usage?: string | null;
  frequency?: string | null;
  isExternal: boolean;
  note?: string | null;
  externalLink?: string | null;
  product?: Product | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineDetail {
  routineDetailId: string;
  routineId: string;
  stepType?: RoutineStepType;
  description?: string | null;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  products: RoutineProductItem[];
}

export interface CreateRoutineProductItemDto {
  productId?: string;
  productName: string;
  usage?: string;
  frequency?: string;
  isExternal: boolean;
  note?: string;
  externalLink?: string;
}

export interface CreateRoutineDetailDto {
  routineId: string;
  stepType: RoutineStepType;
  description?: string;
  content: string;
  products: CreateRoutineProductItemDto[];
}

export type UpdateRoutineDetailDto = Partial<CreateRoutineDetailDto>;

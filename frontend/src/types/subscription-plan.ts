export interface CreateSubscriptionPlanDto {
  planName: string;
  planDescription?: string;
  basePrice: number;
  totalSessions: number;
  durationInDays: number;
  isActive?: boolean;
}

export type UpdateSubscriptionPlanDto = Partial<CreateSubscriptionPlanDto>;

export enum SubscriptionPlanSortBy {
  CREATED_AT = "createdAt",
  BASE_PRICE = "basePrice",
  TOTAL_SESSIONS = "totalSessions",
  DURATION_IN_DAYS = "durationInDays",
  PLAN_NAME = "planName",
}

export interface FindSubscriptionPlansDto {
  isActive?: boolean; // will be convert to string "true" | "false" in query params
  dermatologistId?: string;
  search?: string;
  minPrice?: number; // will be convert to string in query params
  maxPrice?: number;
  minSessions?: number;
  maxSessions?: number;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: SubscriptionPlanSortBy;
  sortOrder?: "ASC" | "DESC";
}

export interface SubscriptionPlan extends CreateSubscriptionPlanDto {
  planId: string;
  dermatologistId: string;
  createdAt: string;
}

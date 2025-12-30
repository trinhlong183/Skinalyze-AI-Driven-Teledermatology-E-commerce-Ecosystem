import { Dermatologist } from "./dermatologist.type";

export enum SubscriptionPlanSortBy {
  CREATED_AT = "createdAt",
  BASE_PRICE = "basePrice",
  TOTAL_SESSIONS = "totalSessions",
  DURATION_IN_DAYS = "durationInDays",
  PLAN_NAME = "planName",
}

export interface FindSubscriptionPlansDto {
  isActive?: string;
  dermatologistId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minSessions?: number;
  maxSessions?: number;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: SubscriptionPlanSortBy;
  sortOrder?: "ASC" | "DESC";
}

export interface SubscriptionPlan {
  planId: string;
  planName: string;
  planDescription?: string;
  basePrice: number;
  totalSessions: number;
  durationInDays: number;
  isActive: boolean;
  dermatologistId: string;
  createdAt: string;
  dermatologist: Dermatologist;
}

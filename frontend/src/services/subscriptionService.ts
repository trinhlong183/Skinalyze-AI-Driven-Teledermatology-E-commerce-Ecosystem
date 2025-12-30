import { ApiResponse } from "./../types/api";
import { http } from "@/lib/http";
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  FindSubscriptionPlansDto,
} from "@/types/subscription-plan";

class SubscriptionService {
  async getPlans(
    filters: FindSubscriptionPlansDto = {}
  ): Promise<SubscriptionPlan[]> {
    // 1. Get defined filters (which are not null/undefined)
    const definedFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== undefined && value !== null
      )
    );

    // 2. Convert to string (URLSearchParams)
    const queryParams = new URLSearchParams(
      definedFilters as Record<string, string>
    ).toString();

    const endpoint = `/api/subscription-plans?${queryParams}`;

    return http
      .get<ApiResponse<SubscriptionPlan[]>>(endpoint)
      .then((res) => res.data);
  }

  createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return http.post<SubscriptionPlan>("/api/subscription-plans", dto);
  }

  updatePlan(
    planId: string,
    dto: UpdateSubscriptionPlanDto
  ): Promise<SubscriptionPlan> {
    return http.patch<SubscriptionPlan>(
      `/api/subscription-plans/${planId}`,
      dto
    );
  }

  deletePlan(planId: string): Promise<void> {
    return http.delete<void>(`/api/subscription-plans/${planId}`);
  }
}

export const subscriptionService = new SubscriptionService();

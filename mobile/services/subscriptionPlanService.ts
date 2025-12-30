
import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import {
  SubscriptionPlan,
  FindSubscriptionPlansDto,
} from "@/types/subscription-plan.type";

class SubscriptionPlanService {
  async findPlans(
    filters: FindSubscriptionPlansDto
  ): Promise<SubscriptionPlan[]> {
    try {
      const response = await apiService.get<ApiResponse<SubscriptionPlan[]>>(
        "/subscription-plans",
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      throw error;
    }
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    try {
      const response = await apiService.get<ApiResponse<SubscriptionPlan>>(
        `/subscription-plans/${planId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching plan ${planId}:`, error);
      throw error;
    }
  }
}

export default new SubscriptionPlanService();

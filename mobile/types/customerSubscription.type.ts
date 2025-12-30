import { Dermatologist } from "@/types/dermatologist.type";
import { SubscriptionPlan } from "./subscription-plan.type";

export interface CustomerSubscription {
  id: string;
  customerId: string;
  paymentId: string;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  dermatologist?: Dermatologist;
  subscriptionPlan?: SubscriptionPlan;
}

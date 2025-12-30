import type { User } from "./user";

export interface Customer {
  customerId: string;
  user: User;
  pastDermatologicalHistory: string[] | null;
  aiUsageAmount: number;
}

export interface Customer {
  customerId: string;
  userId: string;
  aiUsageAmount: number;
  pastDermatologicalHistory: string[];
  purchaseHistory?: string[];
  user?: any;
}

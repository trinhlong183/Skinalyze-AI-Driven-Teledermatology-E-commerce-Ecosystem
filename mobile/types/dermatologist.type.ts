import { User } from "./user.type";

export interface Dermatologist {
  dermatologistId: string;
  userId: string;
  user: User;
  specialization: string[];
  yearsOfExperience: number;
  yearsOfExp?: number; // Alternative field name from API
  about?: string;
  defaultSlotPrice: number;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  totalReviews?: number;
}
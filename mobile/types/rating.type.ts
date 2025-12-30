export interface CreateRatingDto {
  appointmentId: string;
  rating: number;
  content?: string;
}

export interface Rating {
  ratingId: string;
  appointmentId: string;
  dermatologistId: string;
  customerId: string;
  rating: number;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum RatingSortOption {
  LATEST = "latest",
  HIGHEST = "highest",
  LOWEST = "lowest",
}

export interface RatingCustomerSummary {
  customerId?: string;
  user?: {
    userId?: string;
    fullName?: string;
    photoUrl?: string | null;
  } | null;
}

export interface DermatologistRating {
  ratingId: string;
  appointmentId?: string;
  dermatologistId?: string;
  customerId?: string;
  rating: number;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: RatingCustomerSummary | null;
}

export interface GetDermatologistRatingsParams {
  limit?: number;
  page?: number;
  sort?: RatingSortOption;
  rating?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface PaginatedRatings {
  items: DermatologistRating[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

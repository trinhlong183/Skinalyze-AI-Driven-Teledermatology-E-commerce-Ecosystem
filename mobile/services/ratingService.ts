import apiService from "./apiService";
import { ApiResponse } from "@/types/api";
import {
  CreateRatingDto,
  DermatologistRating,
  GetDermatologistRatingsParams,
  PaginatedRatings,
  Rating,
  RatingSortOption,
} from "@/types/rating.type";

class RatingService {
  async createRating(payload: CreateRatingDto): Promise<Rating> {
    try {
      const response = await apiService.post<ApiResponse<Rating>>(
        "/ratings",
        payload
      );
      return response.data;
    } catch (error) {
      console.error("Error creating rating:", error);
      throw error;
    }
  }

  async getMyAppointmentRating(appointmentId: string): Promise<Rating | null> {
    try {
      const response = await apiService.get<ApiResponse<Rating>>(
        `/ratings/my/${appointmentId}`
      );
      return response.data;
    } catch (error: any) {
      const message = error?.message?.toString().toLowerCase() ?? "";
      if (message.includes("not found") || message.includes("404")) {
        return null;
      }

      console.error("Error fetching rating:", error);
      throw error;
    }
  }

  async getDermatologistRatings(
    dermatologistId: string,
    params?: GetDermatologistRatingsParams
  ): Promise<PaginatedRatings> {
    try {
      const {
        limit = 5,
        page = 1,
        sort = RatingSortOption.HIGHEST,
        rating,
      } = params || {};

      const response = await apiService.get<ApiResponse<DermatologistRating[]>>(
        `/ratings/dermatologist/${dermatologistId}`,
        {
          params: {
            limit,
            page,
            sort,
            rating,
          },
        }
      );

      const items = Array.isArray(response.data) ? response.data : [];
      const {
        total: metaTotal,
        page: metaPage,
        limit: metaLimit,
        totalPages,
      } = response.meta ?? {};

      return {
        items,
        total: metaTotal ?? items.length,
        page: metaPage ?? page,
        limit: metaLimit ?? limit,
        totalPages,
      };
    } catch (error) {
      console.error("Error fetching dermatologist ratings:", error);
      throw error;
    }
  }
}

export default new RatingService();

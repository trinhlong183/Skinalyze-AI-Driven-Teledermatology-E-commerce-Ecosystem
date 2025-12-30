import { Dermatologist } from "@/types/dermatologist.type";
import { ApiResponse } from "./../types/api";
import apiService from "./apiService";
import { AvailabilitySlot } from "@/types/availability-slot.type";

export interface Specialization {
  specializationId: string;
  dermatologistId: string;
  specializationName: string;
  specialty: string;
  certificateImageUrl: string;
  description: string;
  level: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

class DermatologistService {
  async getDermatologistList(): Promise<Dermatologist[]> {
    try {
      const response = await apiService.get<ApiResponse<Dermatologist[]>>(
        "/dermatologists"
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching dermatologist list:", error);
      throw error;
    }
  }

  async getDermatologistById(id: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<ApiResponse<Dermatologist>>(
        `/dermatologists/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching dermatologist with ID ${id}:`, error);
      throw error;
    }
  }

  async getDermatologistByUserId(userId: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<Dermatologist>(
        `/dermatologists/user/${userId}`
      );
      return response;
    } catch (error) {
      console.error(
        `Error fetching dermatologist with user ID ${userId}:`,
        error
      );
      throw error;
    }
  }

  async getSpecializations(dermatologistId: string): Promise<Specialization[]> {
    try {
      const response = await apiService.get<ApiResponse<Specialization[]>>(
        `/specializations/dermatologist/${dermatologistId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching specializations for dermatologist ${dermatologistId}:`,
        error
      );
      throw error;
    }
  }

  async getAvailability(userId: string, date: string): Promise<string[]> {
    try {
      return ["10:00 AM", "11:00 AM", "2:00 PM"];
    } catch (error) {
      console.error(
        `Error fetching availability for user ID ${userId} on ${date}:`,
        error
      );
      throw error;
    }
  }

  async getAvailabilitySummary(
    dermatologistId: string,
    month: number,
    year: number
  ): Promise<string[]> {
    try {
      const response = await apiService.get<ApiResponse<string[]>>(
        `/dermatologists/${dermatologistId}/availability-summary`,
        {
          params: { month, year },
        }
      );
      console.log("Calendar", response);

      return response.data;
    } catch (error) {
      console.error("Error fetching availability summary:", error);
      throw error;
    }
  }

  async getAvailabilityForDay(
    dermatologistId: string,
    date: string
  ): Promise<AvailabilitySlot[]> {
    try {
      const now = new Date();

      const requestedDayStart = new Date(date);
      requestedDayStart.setHours(0, 0, 0, 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let startDate: Date;

      if (requestedDayStart.getTime() === todayStart.getTime()) {
        // If today is requested, start from now
        startDate = now;
      } else {
        startDate = requestedDayStart;
      }

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const response = await apiService.get<ApiResponse<AvailabilitySlot[]>>(
        `/dermatologists/${dermatologistId}/availability`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching availability for day ${date}:`, error);
      throw error;
    }
  }

  async getPatientCount(id: string): Promise<number> {
    try {
      const response = await apiService.get<ApiResponse<{ count: number }>>(
        `/dermatologists/${id}/patient-count`
      );
      return response.data.count;
    } catch (error) {
      console.error(
        `Error fetching patient count for dermatologist ${id}:`,
        error
      );
      return 0;
    }
  }
}

export default new DermatologistService();

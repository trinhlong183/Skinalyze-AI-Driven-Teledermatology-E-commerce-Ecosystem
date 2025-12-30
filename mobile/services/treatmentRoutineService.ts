import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import { TreatmentRoutine } from "@/types/treatment-routine.type";
import { RoutineDetail } from "@/types/routine-detail.type";

class TreatmentRoutineService {
  async getCustomerRoutines(
    customerId: string,
    dermatologistId?: string,
    status?: string
  ): Promise<TreatmentRoutine[]> {
    try {
      const response = await apiService.get<ApiResponse<TreatmentRoutine[]>>(
        `/treatment-routines/customer/${customerId}`,
        dermatologistId || status
          ? {
              params: {
                ...(dermatologistId ? { dermatologistId } : {}),
                ...(status ? { status } : {}),
              },
            }
          : undefined
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer routines:", error);
      throw error;
    }
  }

  async getRoutineById(routineId: string): Promise<TreatmentRoutine> {
    try {
      const response = await apiService.get<ApiResponse<TreatmentRoutine>>(
        `/treatment-routines/${routineId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching routine ${routineId}:`, error);
      throw error;
    }
  }

  async getDetailsForRoutine(routineId: string): Promise<RoutineDetail[]> {
    try {
      const response = await apiService.get<ApiResponse<RoutineDetail[]>>(
        `/routine-details/routine/${routineId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for routine ${routineId}:`, error);
      throw error;
    }
  }
}

export default new TreatmentRoutineService();

import { http } from "@/lib/http";
import type {
  AvailabilitySlot,
  CreateAvailabilityDto,
  SlotStatus,
} from "@/types/availability-slot";
import type { ApiResponse } from "@/types/api";

export interface GetSlotsParams {
  startDate?: string;
  endDate?: string;
  status?: SlotStatus;
}
class AvailabilityService {
  async createBatchSlots(dto: CreateAvailabilityDto) {
    try {
      const response = await http.post<ApiResponse<AvailabilitySlot[]>>(
        "/api/availability-slots",
        dto
      );
      return response;
    } catch (error) {
      console.error("Lỗi khi tạo lịch rảnh (service):", error);
      throw error;
    }
  }

  async getMySlots(params: GetSlotsParams = {}): Promise<AvailabilitySlot[]> {
    try {
      const response = await http.get<ApiResponse<AvailabilitySlot[]>>(
        "/api/availability-slots",
        {
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy lịch rảnh (service):", error);
      throw error;
    }
  }

  async deleteSlot(slotId: string): Promise<void> {
    try {
      await http.delete(`/api/availability-slots/${slotId}`);
    } catch (error) {
      console.error("Lỗi khi xóa slot (service):", error);
      throw error;
    }
  }

  async deleteBatchSlots(slotIds: string[]): Promise<void> {
    try {
      await http.delete(`/api/availability-slots/batch`, { slotIds });
    } catch (error) {
      console.error("Lỗi khi xóa nhiều slot (service):", error);
      throw error;
    }
  }
}

export const availabilityService = new AvailabilityService();

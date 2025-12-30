import { http } from "@/lib/http";
import type {
  RoutineDetail,
  CreateRoutineDetailDto,
  UpdateRoutineDetailDto,
} from "@/types/routine-detail";
import type { ApiResponse } from "@/types/api";

class RoutineDetailService {
  async findByRoutineId(routineId: string): Promise<RoutineDetail[]> {
    const res = await http.get<ApiResponse<RoutineDetail[]>>(
      `/api/routine-details/routine/${routineId}`
    );
    return res.data;
  }

  async create(dto: CreateRoutineDetailDto): Promise<RoutineDetail> {
    const res = await http.post<ApiResponse<RoutineDetail>>(
      "/api/routine-details",
      dto
    );
    return res.data;
  }

  async update(
    detailId: string,
    dto: UpdateRoutineDetailDto
  ): Promise<RoutineDetail> {
    const res = await http.patch<ApiResponse<RoutineDetail>>(
      `/api/routine-details/${detailId}`,
      dto
    );
    return res.data;
  }

  async remove(detailId: string): Promise<ApiResponse<null>> {
    const res = await http.delete<ApiResponse<null>>(
      `/api/routine-details/${detailId}`
    );
    return res;
  }
}

export const routineDetailService = new RoutineDetailService();

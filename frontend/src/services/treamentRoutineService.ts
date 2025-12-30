import { http } from "@/lib/http";
import type {
  TreatmentRoutine,
  CreateTreatmentRoutineDto,
  UpdateTreatmentRoutineDto,
  TimelineEvent,
} from "@/types/treatment-routine";
import type { ApiResponse } from "@/types/api";

class TreatmentRoutineService {
  async findByDermatologist(
    dermatologistId: string,
    customerId?: string
  ): Promise<TreatmentRoutine[]> {
    const endpoint = `/api/treatment-routines/dermatologist/${dermatologistId}`;
    const res = await http.get<ApiResponse<TreatmentRoutine[]>>(endpoint, {
      params: { customerId },
    });
    return res.data;
  }

  async getById(id: string): Promise<TreatmentRoutine> {
    const res = await http.get<ApiResponse<TreatmentRoutine>>(
      `/api/treatment-routines/${id}`
    );
    return res.data;
  }

  async create(dto: CreateTreatmentRoutineDto): Promise<TreatmentRoutine> {
    const res = await http.post<ApiResponse<TreatmentRoutine>>(
      "/api/treatment-routines",
      dto
    );
    return res.data;
  }

  async update(
    id: string,
    dto: UpdateTreatmentRoutineDto
  ): Promise<TreatmentRoutine> {
    const res = await http.patch<ApiResponse<TreatmentRoutine>>(
      `/api/treatment-routines/${id}`,
      dto
    );
    return res.data;
  }

  async updateMetadata(
    id: string,
    payload: Pick<UpdateTreatmentRoutineDto, "routineName" | "status">
  ): Promise<TreatmentRoutine> {
    return this.update(id, payload);
  }

  async getTreatmentTimeline(routineId: string): Promise<TimelineEvent[]> {
    const res = await http.get<ApiResponse<TimelineEvent[]>>(
      `/api/treatment-routines/${routineId}/timeline`
    );
    console.log("Time line", res);

    return res.data;
  }
}

export const treatmentRoutineService = new TreatmentRoutineService();

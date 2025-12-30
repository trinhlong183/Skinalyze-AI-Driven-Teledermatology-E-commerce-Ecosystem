import { http } from "@/lib/http";
import type {
  Appointment,
  AppointmentDetailDto,
  CompleteAppointmentDto,
  FindAppointmentsDto,
  InterruptAppointmentDto,
  ReportNoShowDto,
  ResolveDisputeDto,
  UpdateMedicalNoteDto,
} from "@/types/appointment";
import type { ApiResponse } from "@/types/api";

class AppointmentService {
  async getAppointments(
    filters: FindAppointmentsDto = {}
  ): Promise<Appointment[]> {
    try {
      const { customerId, dermatologistId, status } = filters;
      const response = await http.get<ApiResponse<Appointment[]>>(
        "/api/appointments",
        {
          params: {
            customerId,
            dermatologistId,
            status,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách cuộc hẹn (service):", error);
      throw error;
    }
  }
  async getAppointmentById(
    appointmentId: string
  ): Promise<AppointmentDetailDto> {
    try {
      const response = await http.get<ApiResponse<AppointmentDetailDto>>(
        `/api/appointments/${appointmentId}`
      );

      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết cuộc hẹn (service):", error);
      throw error;
    }
  }

  async checkInDermatologist(
    appointmentId: string
  ): Promise<ApiResponse<void>> {
    return http.patch(
      `/api/appointments/dermatologist/check-in/${appointmentId}`,
      {}
    );
  }

  async updateMedicalNote(
    appointmentId: string,
    note: string
  ): Promise<Appointment> {
    const dto: UpdateMedicalNoteDto = { medicalNote: note };
    const response = await http.patch<ApiResponse<Appointment>>(
      `/api/appointments/dermatologist/medical-note/${appointmentId}`,
      dto
    );
    return response.data;
  }

  async completeAppointment(
    appointmentId: string,
    dto: CompleteAppointmentDto
  ): Promise<Appointment> {
    const response = await http.patch<ApiResponse<Appointment>>(
      `/api/appointments/dermatologist/complete/${appointmentId}`,
      dto
    );
    return response.data;
  }

  async cancelByDermatologist(appointmentId: string): Promise<Appointment> {
    const response = await http.patch<ApiResponse<Appointment>>(
      `/api/appointments/dermatologist/cancel/${appointmentId}`,
      {}
    );
    return response.data;
  }

  async generateManualMeetLink(
    appointmentId: string
  ): Promise<{ meetLink: string }> {
    const response = await http.patch<ApiResponse<{ meetLink: string }>>(
      `/api/appointments/dermatologist/generate-meet-link/${appointmentId}`,
      {}
    );
    return response.data;
  }

  async reportDoctorNoShow(
    appointmentId: string,
    dto: ReportNoShowDto
  ): Promise<Appointment> {
    const response = await http.patch<ApiResponse<Appointment>>(
      `/api/appointments/dermatologist/report/no-show/${appointmentId}`,
      dto
    );
    return response.data;
  }

  async reportInterrupt(
    appointmentId: string,
    dto: InterruptAppointmentDto
  ): Promise<Appointment> {
    // Endpoint: PATCH my/:id/report-interrupt
    const response = await http.patch<ApiResponse<Appointment>>(
      `/api/appointments/dermatologist/report/interrupt/${appointmentId}`,
      dto
    );
    return response.data;
  }

  async resolveDispute(
    appointmentId: string,
    dto: ResolveDisputeDto
  ): Promise<any> {
    const response = await http.post(
      `/api/admin/appointments/${appointmentId}/resolve`,
      dto
    );
    return response;
  }
}

export const appointmentService = new AppointmentService();

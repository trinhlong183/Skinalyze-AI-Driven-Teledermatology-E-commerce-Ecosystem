import { ApiResponse } from "@/types/api";
import apiService from "./apiService";

import {
  CreateAppointmentDto,
  CreateSubscriptionAppointmentDto,
  AppointmentReservationResult,
  Appointment,
  AppointmentWithRelations,
  AppointmentStatus,
  InterruptAppointmentDto,
  ReportNoShowDto,
  AppointmentDetailDto,
} from "@/types/appointment.type";

class AppointmentService {
  // Pay as you go appointment
  async createReservation(
    dto: CreateAppointmentDto
  ): Promise<AppointmentReservationResult> {
    try {
      const response = await apiService.post<
        ApiResponse<AppointmentReservationResult>
      >("/appointments", dto);
      return response.data;
    } catch (error) {
      console.error("Error creating reservation:", error);
      throw error;
    }
  }

  async createWalletAppointment(dto: CreateAppointmentDto): Promise<any> {
    try {
      const response = await apiService.post<ApiResponse<any>>(
        "/appointments/use-wallet",
        dto
      );
      return response.data;
    } catch (error) {
      console.error("Error creating wallet appointment:", error);
      throw error;
    }
  }

  async createSubscriptionAppointment(
    dto: CreateSubscriptionAppointmentDto
  ): Promise<any> {
    try {
      const response = await apiService.post<ApiResponse<any>>(
        "/appointments/use-subscription",
        dto
      );
      return response.data;
    } catch (error) {
      console.error("Error creating subscription appointment:", error);
      throw error;
    }
  }
  async getAppointmentById(
    appointmentId: string
  ): Promise<AppointmentDetailDto> {
    try {
      const response = await apiService.get<ApiResponse<AppointmentDetailDto>>(
        `/appointments/${appointmentId}`
      );
      console.log("Appointment", response);

      return response.data;
    } catch (error) {
      console.error(
        `Error getting appointment with ID: ${appointmentId}`,
        error
      );
      throw error;
    }
  }

  async getCustomerAppointments(
    customerId: string,
    status?: AppointmentStatus
  ): Promise<AppointmentWithRelations[]> {
    try {
      const params: any = {
        customerId: customerId,
      };
      if (status) {
        params.status = status;
      }

      const response = await apiService.get<
        ApiResponse<AppointmentWithRelations[]>
      >("/appointments", { params });

      return response.data;
    } catch (error) {
      console.error("Error fetching customer appointments:", error);
      throw error;
    }
  }

  async cancelPendingReservation(appointmentId: string): Promise<any> {
    try {
      const response = await apiService.delete(
        `/appointments/${appointmentId}/reservation`
      );
      return response;
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      throw error;
    }
  }

  async checkInCustomer(appointmentId: string): Promise<any> {
    try {
      const response = await apiService.patch(
        `/appointments/my/${appointmentId}/check-in`
      );
      return response;
    } catch (error) {
      console.error("Error recording check-in:", error);
      throw error;
    }
  }

  async generateManualMeetLink(
    appointmentId: string
  ): Promise<{ meetLink: string }> {
    try {
      const response = await apiService.patch<
        ApiResponse<{ meetLink: string }>
      >(`/appointments/${appointmentId}/generate-meet-link`);
      return response.data;
    } catch (error) {
      console.error("Error generating manual meet link:", error);
      throw error;
    }
  }

  async cancelMyAppointment(appointmentId: string): Promise<any> {
    try {
      const response = await apiService.patch(
        `/appointments/my/${appointmentId}/cancel`
      );
      return (response as ApiResponse<any>).data;
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      throw error;
    }
  }

  async reportDoctorNoShow(
    appointmentId: string,
    dto: ReportNoShowDto
  ): Promise<any> {
    try {
      const response = await apiService.patch(
        `/appointments/my/${appointmentId}/report-no-show`,
        dto
      );
      return (response as any).data;
    } catch (error) {
      console.error("Error reporting no-show:", error);
      throw error;
    }
  }

  async reportInterrupt(
    appointmentId: string,
    dto: InterruptAppointmentDto
  ): Promise<any> {
    try {
      const response = await apiService.patch(
        `/appointments/my/${appointmentId}/report-interrupt`,
        dto
      );
      return (response as any).data;
    } catch (error) {
      console.error("Error reporting interruption:", error);
      throw error;
    }
  }
}

export default new AppointmentService();

import { http } from "@/lib/http";
import type {
  Dermatologist,
  DermatologistProfile,
  DermatologistProfileResponse,
  UpdateDermatologistProfileRequest,
  UpdateProfessionalInfoRequest,
  GetMyPatientsDto,
  PatientsResponse,
  Specialization,
  CreateSpecializationRequest,
  SpecializationsResponse,
  SpecializationDetailResponse,
  UpdateSpecializationRequest,
} from "@/types/dermatologist";
import type { ApiResponse } from "@/types/api";

class DermatologistService {
  async getMyProfile(): Promise<DermatologistProfile> {
    try {
      const response = await fetch("/api/dermatologists/my-profile", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch profile");
      }

      const result: DermatologistProfileResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error fetching dermatologist profile:", error);
      throw error;
    }
  }

  async updateProfile(
    data: UpdatePersonalInfoRequest
  ): Promise<DermatologistProfile> {
    try {
      // If there's a photo, use FormData. Otherwise, use JSON.
      if (data.photo) {
        // Use FormData for file upload
        const formData = new FormData();

        if (data.fullName) formData.append("fullName", data.fullName);
        if (data.phone) formData.append("phone", data.phone);
        if (data.dob) formData.append("dob", data.dob);

        // For gender, send the string representation that backend can parse
        if (data.gender === true) {
          formData.append("gender", "true");
        } else if (data.gender === false) {
          formData.append("gender", "false");
        }
        // If gender is null/undefined, don't include it

        formData.append("photo", data.photo);

        const personalInfoResponse = await fetch("/api/users/profile", {
          method: "PATCH",
          body: formData,
          credentials: "include",
        });

        if (!personalInfoResponse.ok) {
          const error = await personalInfoResponse.json();
          throw new Error(error.message || "Failed to update personal info");
        }
      } else {
        // Use JSON for non-file updates
        const updateData: any = {};

        if (data.fullName !== undefined) updateData.fullName = data.fullName;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.dob !== undefined) updateData.dob = data.dob;
        if (data.gender !== undefined) updateData.gender = data.gender;

        const personalInfoResponse = await fetch("/api/users/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
          credentials: "include",
        });

        if (!personalInfoResponse.ok) {
          const error = await personalInfoResponse.json();
          throw new Error(error.message || "Failed to update personal info");
        }
      }

      // Fetch updated profile after personal info update
      const updatedProfile = await this.getMyProfile();
      return updatedProfile;
    } catch (error) {
      console.error("Error updating dermatologist profile:", error);
      throw error;
    }
  }

  async updateProfessionalInfo(
    data: UpdateProfessionalInfoRequest
  ): Promise<DermatologistProfile> {
    try {
      const response = await fetch("/api/dermatologists/my-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update professional info");
      }

      const result: DermatologistProfileResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error updating professional info:", error);
      throw error;
    }
  }

  async getMyPatients(
    filters: GetMyPatientsDto = {}
  ): Promise<PatientsResponse> {
    const response = await http.get<ApiResponse<PatientsResponse>>(
      `/api/dermatologists/my-patients`,
      {
        params: filters,
      }
    );

    return response.data;
  }

  async createSpecialization(
    data: CreateSpecializationRequest
  ): Promise<Specialization> {
    try {
      const formData = new FormData();

      formData.append("dermatologistId", data.dermatologistId);
      formData.append("specializationName", data.specializationName);
      formData.append("specialty", data.specialty);

      if (data.certificateImage) {
        formData.append("certificateImage", data.certificateImage);
      }
      if (data.description) {
        formData.append("description", data.description);
      }
      if (data.level) {
        formData.append("level", data.level);
      }
      if (data.issuingAuthority) {
        formData.append("issuingAuthority", data.issuingAuthority);
      }
      if (data.issueDate) {
        formData.append("issueDate", data.issueDate);
      }
      if (data.expiryDate) {
        formData.append("expiryDate", data.expiryDate);
      }

      const response = await fetch("/api/specializations", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create specialization");
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error creating specialization:", error);
      throw error;
    }
  }

  async getSpecializations(dermatologistId: string): Promise<Specialization[]> {
    try {
      const response = await fetch(
        `/api/specializations/dermatologist/${dermatologistId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch specializations");
      }

      const result: SpecializationsResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error fetching specializations:", error);
      throw error;
    }
  }

  async getSpecializationById(id: string): Promise<Specialization> {
    try {
      const response = await fetch(`/api/specializations/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch specialization");
      }

      const result: SpecializationDetailResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error fetching specialization:", error);
      throw error;
    }
  }

  async updateSpecialization(
    id: string,
    data: UpdateSpecializationRequest
  ): Promise<Specialization> {
    try {
      const formData = new FormData();

      if (data.specializationName) {
        formData.append("specializationName", data.specializationName);
      }
      if (data.specialty) {
        formData.append("specialty", data.specialty);
      }
      if (data.certificateImage) {
        formData.append("certificateImage", data.certificateImage);
      }
      if (data.description !== undefined) {
        formData.append("description", data.description);
      }
      if (data.level !== undefined) {
        formData.append("level", data.level);
      }
      if (data.issuingAuthority !== undefined) {
        formData.append("issuingAuthority", data.issuingAuthority);
      }
      if (data.issueDate !== undefined) {
        formData.append("issueDate", data.issueDate);
      }
      if (data.expiryDate !== undefined) {
        formData.append("expiryDate", data.expiryDate);
      }

      const response = await fetch(`/api/specializations/${id}`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update specialization");
      }

      const result: SpecializationDetailResponse = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error updating specialization:", error);
      throw error;
    }
  }

  async deleteSpecialization(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/specializations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete specialization");
      }
    } catch (error) {
      console.error("Error deleting specialization:", error);
      throw error;
    }
  }
}

export const dermatologistService = new DermatologistService();

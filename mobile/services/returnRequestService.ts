import apiService from "./apiService";

export enum ReturnRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ReturnReason {
  DAMAGED = "DAMAGED",
  WRONG_ITEM = "WRONG_ITEM",
  DEFECTIVE = "DEFECTIVE",
  NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED",
  CHANGE_MIND = "CHANGE_MIND",
  OTHER = "OTHER",
}

export interface ReturnRequest {
  returnRequestId: string;
  orderId: string;
  shippingLogId: string;
  customerId: string;
  reason: ReturnReason;
  reasonDetail: string | null;
  evidencePhotos: string[] | null;
  status: ReturnRequestStatus;
  reviewedByStaffId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  assignedStaffId: string | null;
  assignedAt: string | null;
  returnedToWarehouseAt: string | null;
  returnCompletionPhotos: string[] | null;
  completionNote: string | null;
  isRefunded: boolean;
  refundAmount: number | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: any;
  shippingLog?: any;
}

export interface CreateReturnRequestDto {
  orderId: string;
  shippingLogId: string;
  reason: ReturnReason;
  reasonDetail?: string;
  evidencePhotos?: string[];
}

export interface ReturnRequestResponse {
  statusCode: number;
  message: string;
  data: ReturnRequest;
  timestamp: string;
}

export interface ReturnRequestsResponse {
  statusCode: number;
  message: string;
  data: ReturnRequest[];
  timestamp: string;
}

class ReturnRequestService {
  /**
   * Create a return request
   */
  async createReturnRequest(
    token: string,
    data: CreateReturnRequestDto
  ): Promise<ReturnRequest> {
    try {
      console.log("Data send ", data);

      const response = await apiService.post<ReturnRequestResponse>(
        "/return-requests",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Create return request error:", error);
      throw error;
    }
  }

  /**
   * Get customer's return requests
   */
  async getMyReturnRequests(token: string): Promise<ReturnRequest[]> {
    try {
      const response = await apiService.get<ReturnRequestsResponse>(
        "/return-requests/my-requests",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Get my return requests error:", error);
      throw error;
    }
  }

  /**
   * Get return request by ID
   */
  async getReturnRequestById(
    token: string,
    returnRequestId: string
  ): Promise<ReturnRequest> {
    try {
      const response = await apiService.get<ReturnRequestResponse>(
        `/return-requests/${returnRequestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Get return request error:", error);
      throw error;
    }
  }

  /**
   * Cancel return request (PENDING only)
   */
  async cancelReturnRequest(
    token: string,
    returnRequestId: string
  ): Promise<ReturnRequest> {
    try {
      const response = await apiService.patch<ReturnRequestResponse>(
        `/return-requests/${returnRequestId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Cancel return request error:", error);
      throw error;
    }
  }

  /**
   * Upload evidence photo
   * @param imageUri - Local image URI from picker/camera
   * @returns Uploaded image URL
   */
  async uploadEvidencePhoto(imageUri: string): Promise<string> {
    try {
      const formData = new FormData();

      const filename = imageUri.split("/").pop() || "evidence.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("photo", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      console.log("📤 Uploading evidence photo...");

      const result = await apiService.uploadFile<{
        data: { photoUrl: string };
      }>("/users/upload-photo", formData);

      console.log("✅ Evidence photo uploaded:", result.data.photoUrl);
      return result.data.photoUrl;
    } catch (error) {
      console.error("❌ Error uploading evidence photo:", error);
      throw new Error("Failed to upload evidence photo");
    }
  }
}

const returnRequestService = new ReturnRequestService();
export default returnRequestService;

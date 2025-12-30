import type {
  ReturnRequest,
  ReviewReturnRequestDto,
  CompleteReturnDto,
  GetReturnRequestsResponse,
  GetReturnRequestResponse,
} from "@/types/return-request";

export class ReturnRequestService {
  /**
   * Get all return requests (STAFF/ADMIN)
   */
  async getAllReturnRequests(): Promise<GetReturnRequestsResponse> {
    try {
      const response = await fetch("/api/return-requests", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch return requests");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch return requests"
      );
    }
  }

  /**
   * Get pending return requests (STAFF/ADMIN)
   */
  async getPendingReturnRequests(): Promise<GetReturnRequestsResponse> {
    try {
      const response = await fetch("/api/return-requests/pending", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to fetch pending return requests"
        );
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch pending return requests"
      );
    }
  }

  /**
   * Get return request by ID
   */
  async getReturnRequest(id: string): Promise<GetReturnRequestResponse> {
    try {
      const response = await fetch(`/api/return-requests/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch return request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to fetch return request"
      );
    }
  }

  /**
   * Approve return request (STAFF/ADMIN)
   */
  async approveReturnRequest(
    id: string,
    reviewDto?: ReviewReturnRequestDto
  ): Promise<GetReturnRequestResponse> {
    try {
      const response = await fetch(`/api/return-requests/${id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(reviewDto || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve return request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to approve return request"
      );
    }
  }

  /**
   * Reject return request (STAFF/ADMIN)
   */
  async rejectReturnRequest(
    id: string,
    reviewDto?: ReviewReturnRequestDto
  ): Promise<GetReturnRequestResponse> {
    try {
      const response = await fetch(`/api/return-requests/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(reviewDto || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject return request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to reject return request"
      );
    }
  }

  /**
   * Staff assigns themselves to handle return
   */
  async assignSelfToReturnRequest(
    id: string
  ): Promise<GetReturnRequestResponse> {
    try {
      const response = await fetch(`/api/return-requests/${id}/assign`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign return request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to assign return request"
      );
    }
  }

  /**
   * Complete return request (STAFF)
   */
  async completeReturnRequest(
    id: string,
    completeDto: CompleteReturnDto
  ): Promise<GetReturnRequestResponse> {
    try {
      const response = await fetch(`/api/return-requests/${id}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(completeDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete return request");
      }

      return await response.json();
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to complete return request"
      );
    }
  }
}

export const returnRequestService = new ReturnRequestService();

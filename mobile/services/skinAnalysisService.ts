import apiService from "./apiService";
import tokenService from "./tokenService";
import userService from "./userService";

export interface RecommendedProductRef {
  productId: string;
  reason: string;
}
export interface SkinAnalysisResult {
  analysisId: string;
  customerId: string;
  source: "AI_SCAN" | "MANUAL";
  chiefComplaint: string | null;
  patientSymptoms: string | null;
  imageUrls: string[];
  notes: string | null;
  aiDetectedDisease: string | null;
  aiDetectedCondition: string | null;
  aiRecommendedProducts: RecommendedProductRef[] | null;
  mask: string | string[] | null;
  confidence?: number;
  allPredictions?: { [key: string]: number };
  createdAt: string;
  updatedAt: string;
}

export interface ManualEntryPayload {
  chiefComplaint: string;
  patientSymptoms: string;
  notes?: string;
  imageUris?: string[] | null;
}

interface SkinAnalysisResponse {
  statusCode: number;
  message: string;
  data: SkinAnalysisResult;
  timestamp: string;
}

interface SkinAnalysisListResponse {
  statusCode: number;
  message: string;
  data: SkinAnalysisResult[];
  timestamp: string;
}

class SkinAnalysisService {
  /**
   * Get customer ID from user ID
   * @param userId - User UUID
   * @returns Customer UUID
   */
  private async getCustomerId(userId: string): Promise<string> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const customerData = await userService.getCustomerByUserId(userId, token);
      return customerData.customerId;
    } catch (error) {
      console.error("❌ Error getting customer ID:", error);
      throw new Error("Failed to retrieve customer information");
    }
  }

  /**
   * Perform disease detection analysis
   * @param userId - User UUID from auth token
   * @param imageUri - Local image URI from camera
   * @param note - Optional note indicating the area ('facial' or 'other')
   * @returns Analysis result with detected disease
   */
  async detectDisease(
    userId: string,
    imageUri: string,
    note?: string
  ): Promise<SkinAnalysisResult> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      // Get customer ID from user ID
      const customerId = await this.getCustomerId(userId);

      // Create FormData for multipart/form-data request
      const formData = new FormData();

      // Extract filename and create file object
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      // Add the note (facial or other) if provided
      if (note) {
        formData.append("notes", note);
      }

      console.log(
        `📤 Uploading disease detection image (Area: ${
          note || "unspecified"
        })...`
      );

      // Use apiService.uploadFile instead of fetch
      const result = await apiService.uploadFile<SkinAnalysisResponse>(
        `/skin-analysis/disease-detection/${customerId}`,
        formData
      );

      // Extract data from response
      const analysisResult: SkinAnalysisResult = result.data || result;
      console.log("✅ Disease detection completed", analysisResult);

      return analysisResult;
    } catch (error) {
      console.error("❌ Error in disease detection:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to analyze skin for disease detection"
      );
    }
  }

  // /**
  //  * Perform skin condition detection analysis
  //  * @param userId - User UUID from auth token
  //  * @param imageUri - Local image URI from camera
  //  * @returns Analysis result with detected condition (Dry, Oily, etc.)
  //  */
  // async detectCondition(
  //   userId: string,
  //   imageUri: string
  // ): Promise<SkinAnalysisResult> {
  //   try {
  //     const token = await tokenService.getToken();
  //     if (!token) {
  //       throw new Error("Authentication required. Please log in.");
  //     }

  //     // Get customer ID from user ID
  //     const customerId = await this.getCustomerId(userId);

  //     // Create FormData for multipart/form-data request
  //     const formData = new FormData();

  //     // Extract filename and create file object
  //     const filename = imageUri.split("/").pop() || "image.jpg";
  //     const match = /\.(\w+)$/.exec(filename);
  //     const type = match ? `image/${match[1]}` : "image/jpeg";

  //     formData.append("file", {
  //       uri: imageUri,
  //       name: filename,
  //       type: type,
  //     } as any);

  //     console.log("📤 Uploading condition detection image...");

  //     // Use apiService.uploadFile instead of fetch
  //     const result = await apiService.uploadFile<SkinAnalysisResponse>(
  //       `/skin-analysis/condition-detection/${customerId}`,
  //       formData
  //     );

  //     // Extract data from response
  //     const analysisResult: SkinAnalysisResult = result.data || result;
  //     console.log("✅ Condition detection completed", analysisResult);

  //     return analysisResult;
  //   } catch (error) {
  //     console.error("❌ Error in condition detection:", error);
  //     throw new Error(
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to analyze skin condition"
  //     );
  //   }
  // }

  /**
   * Get all analyses for a customer
   * @param customerId - Customer UUID
   * @returns List of analysis results
   */
  async getUserAnalyses(customerId: string): Promise<SkinAnalysisResult[]> {
    try {
      const response = await apiService.get<SkinAnalysisResult[]>(
        `/skin-analysis/customer/${customerId}`
      );
      console.log("Analysis: ", response);

      // The API returns the array directly, not wrapped in { data: [...] }
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("❌ Error fetching user analyses:", error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get analysis result by ID
   * @param analysisId - Analysis UUID
   */
  async getAnalysisById(analysisId: string): Promise<SkinAnalysisResult> {
    try {
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await apiService.get<SkinAnalysisResponse>(
        `/skin-analysis/${analysisId}`
      );

      console.log("✅ Analysis fetched", response.data);

      return response.data;
    } catch (error) {
      console.error("❌ Error fetching analysis:", error);
      throw new Error("Failed to fetch analysis result");
    }
  }

  /**
   * Create a manual skin analysis entry
   */
  async createManualEntry(payload: ManualEntryPayload): Promise<any> {
    try {
      const formData = new FormData();

      // Append Text Data
      formData.append("chiefComplaint", payload.chiefComplaint);
      formData.append("patientSymptoms", payload.patientSymptoms);
      if (payload.notes) formData.append("notes", payload.notes);

      // Append Image if exists
      if (payload.imageUris && payload.imageUris.length > 0) {
        payload.imageUris.forEach((uri, index) => {
          // Create unique filename for each image
          const filename = uri.split("/").pop() || `manual_image_${index}.jpg`;

          // Determine file type (default to jpeg if extension not found)
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          // Append to formData with the same key "file"
          // Backend (FilesInterceptor('file')) will automatically group them into an array
          formData.append("file", {
            uri: uri,
            name: filename,
            type: type,
          } as any);
        });
      }

      console.log(
        `📤 Creating manual entry with ${
          payload.imageUris?.length || 0
        } images...`
      );

      const result = await apiService.uploadFile(
        `/skin-analysis/manual-entry`,
        formData
      );

      console.log("✅ Manual entry created");
      return result;
    } catch (error) {
      console.error("❌ Error creating manual entry:", error);
      throw new Error("Failed to save manual entry");
    }
  }
}

export const skinAnalysisService = new SkinAnalysisService();
export default skinAnalysisService;

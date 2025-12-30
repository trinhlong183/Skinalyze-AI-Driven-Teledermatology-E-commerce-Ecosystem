import apiService from "./apiService";
import { User, Address } from "./authService";
import ghnService, { GHNProvince, GHNDistrict, Ward } from "./ghnService";

// --- Interfaces ---
interface UserProfileResponse {
  statusCode: number;
  message: string;
  data: User;
  timestamp: string;
}

interface AddressResponse {
  statusCode: number;
  message: string;
  data: Address;
  timestamp: string;
}

interface DeleteResponse {
  statusCode: number;
  message: string;
  timestamp: string;
}

interface BalanceData {
  userId: string;
  email: string;
  fullName: string;
  balance: number;
  currency: string;
}

interface BalanceResponse {
  statusCode: number;
  message: string;
  data: BalanceData;
  timestamp: string;
}

interface CustomerData {
  customerId: string;
  user: User;
  aiUsageAmount: number;
  pastDermatologicalHistory: string[];
  purchaseHistory: any[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerResponse {
  statusCode: number;
  message: string;
  data: CustomerData;
  timestamp: string;
}

interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: boolean;
  photoUrl?: string;
  allergies?: string[];
}

interface CreateAddressPayload {
  userId: string;
  street: string;
  streetLine1: string;
  streetLine2?: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
}

interface UpdateAddressPayload {
  street?: string;
  streetLine1?: string;
  streetLine2?: string;
  wardOrSubDistrict?: string;
  district?: string;
  city?: string;
}

interface UploadPhotoData {
  userId: string;
  photoUrl: string;
}

interface UploadPhotoResponse {
  statusCode: number;
  message: string;
  data: UploadPhotoData;
  timestamp: string;
}

// Withdrawal Request Interfaces
export interface WithdrawalRequest {
  requestId: string;
  userId: string;
  fullName: string;
  amount: string;
  type: "withdraw";
  bankName: string;
  accountNumber: string;
  status:
    | "pending"
    | "verified"
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled";
  notes: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalRequestsResponse {
  statusCode: number;
  message: string;
  data: WithdrawalRequest[];
  timestamp: string;
}

// --- Re-export GHN Interfaces for backward compatibility ---
export type Province = GHNProvince;
export type District = GHNDistrict;
export type Commune = Ward;

class UserService {
  async getProfile(token: string): Promise<User> {
    try {
      const response = await apiService.get<any>("/users/profile");

      console.log(
        "🔍 UserService Raw Response:",
        JSON.stringify(response, null, 2)
      );

      if (response && response.data) {
        return response.data;
      }

      if (response && (response.userId || response.email)) {
        return response;
      }

      console.warn(
        "⚠️ UserService: Unknown profile structure, returning raw response"
      );
      return response;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }

  async getCustomerByUserId(
    userId: string,
    token: string
  ): Promise<CustomerData> {
    try {
      const response = await apiService.get<CustomerResponse>(
        `/customers/user/${userId}`
      );
      return response.data || (response as any);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      throw new Error("Failed to fetch customer data");
    }
  }

  async updateProfile(
    token: string,
    data: UpdateProfilePayload
  ): Promise<User> {
    try {
      const response = await apiService.patch<any>("/users/profile", data);
      return response.data || response;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }

  async changePassword(
    token: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      await apiService.patch("/users/change-password", {
        oldPassword,
        newPassword,
      });
    } catch (error) {
      console.error("Error changing password:", error);
      throw new Error("Failed to change password");
    }
  }

  async getAddress(addressId: string, token: string): Promise<Address> {
    try {
      const response = await apiService.get<AddressResponse>(
        `/address/${addressId}`
      );
      return response.data || (response as any);
    } catch (error) {
      console.error("Error getting address:", error);
      throw new Error("Failed to get address");
    }
  }

  async createAddress(
    token: string,
    data: CreateAddressPayload
  ): Promise<Address> {
    try {
      const response = await apiService.post<AddressResponse>("/address", data);
      return response.data || (response as any);
    } catch (error) {
      console.error("Error creating address:", error);
      throw new Error("Failed to create address");
    }
  }

  async updateAddress(
    token: string,
    addressId: string,
    data: UpdateAddressPayload
  ): Promise<Address> {
    try {
      const response = await apiService.patch<AddressResponse>(
        `/address/${addressId}`,
        data
      );
      return response.data || (response as any);
    } catch (error) {
      console.error("Error updating address:", error);
      throw new Error("Failed to update address");
    }
  }

  async deleteAddress(token: string, addressId: string): Promise<void> {
    try {
      await apiService.delete<DeleteResponse>(`/address/${addressId}`);
    } catch (error) {
      console.error("Error deleting address:", error);
      throw new Error("Failed to delete address");
    }
  }

  async getBalance(): Promise<BalanceData> {
    try {
      const response = await apiService.get<BalanceResponse>("/users/balance");
      console.log("❤️ BALANCEEEE", response);
      return response.data || (response as any);
    } catch (error) {
      console.error("Error fetching user balance:", error);
      throw new Error("Failed to fetch user balance");
    }
  }

  /**
   * Get user's withdrawal requests
   */
  async getWithdrawalRequests(token: string): Promise<WithdrawalRequest[]> {
    try {
      const response = await apiService.get<WithdrawalRequestsResponse>(
        "/withdrawals/my-requests"
      );
      return response.data || [];
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      throw new Error("Failed to fetch withdrawal requests");
    }
  }

  /**
   * Upload profile photo
   * @param imageUri - Local image URI from picker/camera
   * @returns Upload result with new photoUrl
   */
  async uploadProfilePhoto(imageUri: string): Promise<UploadPhotoData> {
    try {
      const formData = new FormData();

      const filename = imageUri.split("/").pop() || "profile_photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("photo", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      console.log("📤 Uploading profile photo...");

      const result = await apiService.uploadFile<UploadPhotoResponse>(
        "/users/upload-photo",
        formData
      );

      console.log("✅ Profile photo uploaded:", result.data);
      return result.data || (result as any);
    } catch (error) {
      console.error("❌ Error uploading profile photo:", error);
      throw new Error("Failed to upload profile photo");
    }
  }

  // ==================== VN PUBLIC API INTEGRATION ====================

  /**
   * Lấy danh sách tỉnh/thành phố từ GHN API
   * @returns Danh sách các tỉnh/thành phố
   *
   * @example
   * const provinces = await userService.getProvinces();
   */
  async getProvinces(): Promise<Province[]> {
    return ghnService.getProvinces();
  }

  /**
   * Lấy danh sách quận/huyện theo tỉnh từ GHN API
   * @param provinceId - ID của tỉnh/thành (GHN ProvinceID)
   * @returns Danh sách các quận/huyện
   *
   * @example
   * const districts = await userService.getDistricts(202); // Hồ Chí Minh
   */
  async getDistricts(provinceId: number): Promise<District[]> {
    return ghnService.getDistricts(provinceId);
  }

  /**
   * Lấy danh sách xã/phường/thị trấn theo quận/huyện từ GHN API
   * @param districtId - ID của quận/huyện (GHN DistrictID)
   * @returns Danh sách các xã/phường/thị trấn
   *
   * @example
   * const wards = await userService.getWardsByDistrict(1442); // Quận 1, HCM
   */
  async getWardsByDistrict(districtId: number): Promise<Commune[]> {
    return ghnService.getWards(districtId);
  }

  /**
   * @deprecated GHN API không hỗ trợ lấy tất cả districts. Dùng getDistricts(provinceId) thay thế.
   */
  async getAllDistricts(): Promise<District[]> {
    throw new Error(
      "getAllDistricts is deprecated. Use getDistricts(provinceId) instead."
    );
  }

  /**
   * @deprecated GHN API không hỗ trợ lấy tất cả wards. Dùng getWardsByDistrict(districtId) thay thế.
   */
  async getAllWards(): Promise<Commune[]> {
    throw new Error(
      "getAllWards is deprecated. Use getWardsByDistrict(districtId) instead."
    );
  }

  /**
   * @deprecated GHN API không hỗ trợ search. Dùng getDistricts(provinceId) và filter ở client.
   */
  async searchDistricts(): Promise<District[]> {
    throw new Error(
      "searchDistricts is deprecated. Use getDistricts(provinceId) and filter on client."
    );
  }

  /**
   * @deprecated GHN API không hỗ trợ search. Dùng getWardsByDistrict(districtId) và filter ở client.
   */
  async searchWards(): Promise<Commune[]> {
    throw new Error(
      "searchWards is deprecated. Use getWardsByDistrict(districtId) and filter on client."
    );
  }

  /**
   * Lấy thông tin đầy đủ của địa chỉ từ GHN IDs
   * @param wardCode - WardCode của phường/xã (string)
   * @param districtId - DistrictID của quận/huyện (number)
   * @param provinceId - ProvinceID của tỉnh/thành (number)
   * @returns Thông tin đầy đủ: ward, district, province
   */
  async getFullAddressInfo(
    wardCode: string,
    districtId: number,
    provinceId: number
  ): Promise<{
    ward: Commune | null;
    district: District | null;
    province: Province | null;
  }> {
    try {
      const [wards, districts, provinces] = await Promise.all([
        this.getWardsByDistrict(districtId),
        this.getDistricts(provinceId),
        this.getProvinces(),
      ]);

      const ward = wards.find((w) => w.WardCode === wardCode) || null;
      const district =
        districts.find((d) => d.DistrictID === districtId) || null;
      const province =
        provinces.find((p) => p.ProvinceID === provinceId) || null;

      return {
        ward,
        district,
        province,
      };
    } catch (error) {
      console.error("❌ Error getting full address info:", error);
      throw new Error("Failed to get full address info");
    }
  }
}

export const userService = new UserService();
export default userService;

import apiService from "./apiService";
import axios from "axios";
import { config } from "@/config/env";

// GHN API Configuration
const GHN_API_URL = config.GHN_API_URL;
const GHN_TOKEN = config.GHN_TOKEN;
const GHN_SHOP_ID = config.GHN_SHOP_ID;

// GHN Province Interface
export interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code?: string;
  NameExtension?: string[];
}

export interface GHNProvincesResponse {
  code: number;
  message: string;
  data: GHNProvince[];
}

// GHN District Interface
export interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code?: string;
  Type?: number;
  SupportType?: number;
  NameExtension?: string[];
}

export interface GHNDistrictsResponse {
  code: number;
  message: string;
  data: GHNDistrict[];
}

// GHN Ward Interface
export interface Ward {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}

export interface GHNWardsResponse {
  code: number;
  message: string;
  data: Ward[];
}

// GHN Service Types
export interface GHNServiceType {
  service_id: number;
  short_name: string;
  service_type_id: number;
  config_fee_id: string;
  extra_cost_id: string;
  standard_config_fee_id: string;
  standard_extra_cost_id: string;
  ecom_config_fee_id: number;
  ecom_extra_cost_id: number;
  ecom_standard_config_fee_id: number;
  ecom_standard_extra_cost_id: number;
}

export interface AvailableServicesPayload {
  fromDistrictId: number;
  toDistrictId: number;
}

export interface AvailableServicesResponse {
  statusCode: number;
  message: string;
  data: GHNServiceType[];
  timestamp: string;
}

// Calculate Fee Interfaces
export interface CalculateFeePayload {
  serviceId: number;
  insuranceValue: number;
  fromDistrictId: number;
  toDistrictId: number;
  toWardCode: string;
  height: number;
  length: number;
  width: number;
  weight: number;
  coupon?: string | null;
}

export interface CalculateFeeData {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
  coupon_value: number;
  r2s_fee: number;
  return_again: number;
  document_return: number;
  double_check: number;
  cod_fee: number;
  pick_remote_areas_fee: number;
  deliver_remote_areas_fee: number;
  cod_failed_fee: number;
}

export interface CalculateFeeResponse {
  statusCode: number;
  message: string;
  data: CalculateFeeData;
  timestamp: string;
}

class GHNService {
  /**
   * Get all provinces from GHN directly
   */
  async getProvinces(): Promise<GHNProvince[]> {
    try {
      console.log("🏙️ Fetching provinces from GHN...");

      const response = await axios.get<GHNProvincesResponse>(
        `${GHN_API_URL}/master-data/province`,
        {
          headers: {
            token: GHN_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Provinces fetched:", response.data.data.length);
      return response.data.data;
    } catch (error) {
      console.error("❌ Get provinces error:", error);
      throw error;
    }
  }

  /**
   * Get districts for a specific province from GHN directly
   */
  async getDistricts(provinceId: number): Promise<GHNDistrict[]> {
    try {
      console.log("🏘️ Fetching districts for province:", provinceId);

      const response = await axios.post<GHNDistrictsResponse>(
        `${GHN_API_URL}/master-data/district`,
        {
          province_id: provinceId,
        },
        {
          headers: {
            token: GHN_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Districts fetched:", response.data.data.length);
      return response.data.data;
    } catch (error) {
      console.error("❌ Get districts error:", error);
      throw error;
    }
  }

  /**
   * Get wards for a specific district from GHN directly
   */
  async getWards(districtId: number): Promise<Ward[]> {
    try {
      console.log("🏘️ Fetching wards for district:", districtId);

      const response = await axios.post<GHNWardsResponse>(
        `${GHN_API_URL}/master-data/ward`,
        {
          district_id: districtId,
        },
        {
          headers: {
            token: GHN_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Wards fetched:", response.data.data.length);
      return response.data.data;
    } catch (error) {
      console.error("❌ Get wards error:", error);
      throw error;
    }
  }

  /**
   * Get available shipping services from GHN
   * Used to get service_id for fee calculation
   */
  async getAvailableServices(
    payload: AvailableServicesPayload
  ): Promise<GHNServiceType[]> {
    try {
      console.log("📦 Fetching available GHN services...", payload);

      const response = await axios.post(
        `${GHN_API_URL}/v2/shipping-order/available-services`,
        {
          from_district: payload.fromDistrictId,
          to_district: payload.toDistrictId,
        },
        {
          headers: {
            token: GHN_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Available services:", response.data.data);
      return response.data.data as GHNServiceType[];
    } catch (error) {
      console.error("❌ Get available services error:", error);
      throw error;
    }
  }

  /**
   * Calculate detailed shipping fee using GHN
   * Returns full breakdown of fees
   */
  async calculateShippingFee(
    payload: CalculateFeePayload
  ): Promise<CalculateFeeData> {
    try {
      const requestBody = {
        service_id: payload.serviceId,
        insurance_value: payload.insuranceValue,
        from_district_id: payload.fromDistrictId,
        to_district_id: payload.toDistrictId,
        to_ward_code: payload.toWardCode,
        height: payload.height,
        length: payload.length,
        width: payload.width,
        weight: payload.weight,
        coupon: payload.coupon || null,
      };

      console.log("💰 Calculating GHN shipping fee...");
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      console.log("Headers:", { token: GHN_TOKEN, shop_id: GHN_SHOP_ID });

      const response = await axios.post(
        `${GHN_API_URL}/v2/shipping-order/fee`,
        requestBody,
        {
          headers: {
            token: GHN_TOKEN,
            "Content-Type": "application/json",
            shop_id: GHN_SHOP_ID,
          },
        }
      );

      console.log("✅ Fee calculated:", response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error("❌ Calculate fee error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }

  /**
   * Helper: Get lightweight service (for medicines/cosmetics)
   * Returns service_id for lightweight items (service_type_id = 2)
   */
  async getLightweightService(
    fromDistrictId: number,
    toDistrictId: number
  ): Promise<number> {
    try {
      const services = await this.getAvailableServices({
        fromDistrictId,
        toDistrictId,
      });

      // Find lightweight service (service_type_id = 2)
      const lightweightService = services.find(
        (service) => service.service_type_id === 2
      );

      if (!lightweightService) {
        console.warn("⚠️ No lightweight service found, using first available");
        return services[0]?.service_id || 53321; // Fallback to default
      }

      return lightweightService.service_id;
    } catch (error) {
      console.error("❌ Get lightweight service error:", error);
      return 53321; // Fallback to default lightweight service
    }
  }

  /**
   * Simplified fee calculation for checkout
   * Assumes lightweight service and standard dimensions for medicines
   */
  async calculateCheckoutFee(
    fromDistrictId: number,
    toDistrictId: number,
    toWardCode: string,
    orderValue: number
  ): Promise<number> {
    try {
      // Get lightweight service ID
      const serviceId = await this.getLightweightService(
        fromDistrictId,
        toDistrictId
      );

      // Calculate fee with standard medicine package dimensions
      const feeData = await this.calculateShippingFee({
        serviceId,
        insuranceValue: orderValue,
        fromDistrictId,
        toDistrictId,
        toWardCode,
        height: 15, // Standard small package
        length: 15,
        width: 15,
        weight: 500, // 500g default for medicines/cosmetics
        coupon: null,
      });

      return feeData.total;
    } catch (error) {
      console.error("❌ Calculate checkout fee error:", error);
      return 35000; // Fallback to default fee
    }
  }
}

export default new GHNService();

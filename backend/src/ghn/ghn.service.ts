import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateGhnOrderDto } from './dto/create-ghn-order.dto';

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code?: string;
  NameExtension?: string[];
}

export interface GhnDistrict {
  DistrictID: number;
  DistrictName: string;
  ProvinceID: number;
}

export interface GhnWard {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}

export interface GhnOrderResponse {
  code: number;
  message: string;
  data: {
    order_code: string;
    sort_code: string;
    trans_type: string;
    ward_encode: string;
    district_encode: string;
    fee: {
      main_service: number;
      insurance: number;
      station_do: number;
      station_pu: number;
      return: number;
      r2s: number;
      coupon: number;
      total: number;
    };
    total_fee: number;
    expected_delivery_time: string;
  };
}

@Injectable()
export class GhnService {
  private readonly logger = new Logger(GhnService.name);
  private readonly baseUrl =
    'https://dev-online-gateway.ghn.vn/shiip/public-api';
  private readonly token: string;
  private readonly shopId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.token = this.configService.get<string>('GHN_TOKEN') || '';
    this.shopId = this.configService.get<string>('GHN_SHOP_ID', '885'); // Default shop ID from example

    if (!this.token) {
      this.logger.warn('⚠️ GHN_TOKEN not configured in environment variables');
    }
  }

  /**
   * Get list of provinces
   */
  async getProvinces(): Promise<GhnProvince[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/master-data/province`, {
          headers: {
            Token: this.token,
            'Content-Type': 'application/json',
          },
        }),
      );

      return (response.data as any)?.data || [];
    } catch (error: any) {
      this.logger.error(
        'Failed to get provinces:',
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch province data from GHN');
    }
  }

  /**
   * Get list of districts by province ID
   */
  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/master-data/district`, {
          params: { province_id: provinceId },
          headers: {
            Token: this.token,
            'Content-Type': 'application/json',
          },
        }),
      );

      return (response.data as any)?.data || [];
    } catch (error: any) {
      this.logger.error(
        `Failed to get districts for province ${provinceId}:`,
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch district data from GHN');
    }
  }

  /**
   * Get list of wards by district ID
   */
  async getWards(districtId: number): Promise<GhnWard[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/master-data/ward`, {
          params: { district_id: districtId },
          headers: {
            Token: this.token,
            'Content-Type': 'application/json',
          },
        }),
      );

      return (response.data as any)?.data || [];
    } catch (error: any) {
      this.logger.error(
        `Failed to get wards for district ${districtId}:`,
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch ward data from GHN');
    }
  }

  /**
   * Create shipping order with GHN
   */
  async createShippingOrder(dto: CreateGhnOrderDto): Promise<GhnOrderResponse> {
    try {
      // Build payload - use from_district_id instead of return_district_id per GHN API v2
      const payload: any = {
        payment_type_id: dto.paymentTypeId,
        note: dto.note,
        required_note: dto.requiredNote || 'KHONGCHOXEMHANG',
        from_name: 'Skinalyze',
        from_phone: dto.returnPhone,
        from_address: dto.returnAddress,
        from_ward_code: dto.returnWardCode || '21012',
        from_district_id: dto.returnDistrictId || 1442,
        client_order_code: dto.clientOrderCode || '',
        to_name: dto.toName,
        to_phone: dto.toPhone,
        to_address: dto.toAddress,
        to_ward_code: dto.toWardCode,
        to_district_id: dto.toDistrictId,
        cod_amount: dto.codAmount,
        content: dto.content,
        weight: dto.weight,
        length: dto.length,
        width: dto.width,
        height: dto.height,
        service_type_id: dto.serviceTypeId || 2,
        pick_shift: dto.pickShift || [2],
        items: dto.items,
      };

      // Add optional fields if provided
      if (dto.pickStationId) payload.pick_station_id = dto.pickStationId;
      if (dto.deliverStationId)
        payload.deliver_station_id = dto.deliverStationId;
      if (dto.insuranceValue) payload.insurance_value = dto.insuranceValue;
      if (dto.serviceId) payload.service_id = dto.serviceId;
      if (dto.coupon) payload.coupon = dto.coupon;

      this.logger.log(`📦 Creating GHN order for: ${dto.toName}`);
      this.logger.debug(
        `📋 GHN payload: ${JSON.stringify({
          return_address: payload.return_address,
          return_district_id: payload.return_district_id,
          return_ward_code: payload.return_ward_code,
          to_address: payload.to_address,
          to_district_id: payload.to_district_id,
          to_ward_code: payload.to_ward_code,
        })}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/shipping-order/create`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Token: this.token,
              ShopId: this.shopId,
            },
          },
        ),
      );

      const responseData = response.data as any;
      if (responseData.code === 200) {
        this.logger.log(
          `✅ GHN order created: ${responseData.data.order_code}`,
        );
        return responseData;
      } else {
        throw new BadRequestException(
          responseData.message || 'GHN order creation failed',
        );
      }
    } catch (error: any) {
      this.logger.error(
        'Failed to create GHN order:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message ||
          'Failed to create shipping order with GHN',
      );
    }
  }

  /**
   * Calculate shipping fee (can be implemented if needed)
   */
  async calculateShippingFee(params: {
    toDistrictId: number;
    toWardCode: string;
    weight: number;
    serviceTypeId?: number;
  }): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/shipping-order/fee`,
          {
            service_type_id: params.serviceTypeId || 2,
            to_district_id: params.toDistrictId,
            to_ward_code: params.toWardCode,
            weight: params.weight,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Token: this.token,
              ShopId: this.shopId,
            },
          },
        ),
      );

      return (response.data as any)?.data?.total || 0;
    } catch (error: any) {
      this.logger.error(
        'Failed to calculate shipping fee:',
        error.response?.data || error.message,
      );
      return 0;
    }
  }

  /**
   * Get order info from GHN
   */
  async getOrderInfo(orderCode: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/shipping-order/detail`,
          { order_code: orderCode },
          {
            headers: {
              'Content-Type': 'application/json',
              Token: this.token,
              ShopId: this.shopId,
            },
          },
        ),
      );

      return (response.data as any)?.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get GHN order info for ${orderCode}:`,
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        'Failed to fetch order information from GHN',
      );
    }
  }

  /**
   * Find GHN codes from province/district/ward names
   * Returns { provinceId, districtId, wardCode }
   */
  async findAddressCodes(params: {
    province?: string;
    district?: string;
    ward?: string;
  }): Promise<{ provinceId?: number; districtId?: number; wardCode?: string }> {
    const result: {
      provinceId?: number;
      districtId?: number;
      wardCode?: string;
    } = {};

    try {
      // 1. Find province ID
      if (params.province) {
        const provinces = await this.getProvinces();
        const searchTerms = this.extractSearchTerms(params.province);

        const province = provinces.find((p) => {
          const provinceName = this.normalizeVietnamese(p.ProvinceName);
          // Try exact match first
          if (searchTerms.some((term) => provinceName === term)) return true;
          // Then try contains
          return searchTerms.some(
            (term) =>
              provinceName.includes(term) ||
              term.includes(provinceName) ||
              (p.NameExtension &&
                p.NameExtension.some((ext) =>
                  this.normalizeVietnamese(ext).includes(term),
                )),
          );
        });

        if (province) {
          result.provinceId = province.ProvinceID;
          this.logger.log(
            `✅ Found province: ${province.ProvinceName} (ID: ${province.ProvinceID})`,
          );
        } else {
          this.logger.warn(
            `⚠️ Province not found: "${params.province}" (searched: ${searchTerms.join(', ')})`,
          );
        }
      }

      // 2. Find district ID
      if (params.district && result.provinceId) {
        const districts = await this.getDistricts(result.provinceId);
        const searchTerms = this.extractSearchTerms(params.district);

        const district = districts.find((d) => {
          const districtName = this.normalizeVietnamese(d.DistrictName);

          // Try exact match first (for numbered districts like "Quan 1", "District 1")
          for (const term of searchTerms) {
            if (districtName === term) return true;
          }

          // Then try word boundary match for numbered districts
          if (params.district) {
            const numberMatch = params.district.match(/\d+/);
            if (numberMatch) {
              const num = numberMatch[0];
              // Match "Quan 1", "Q.1", "District 1" etc, but not "Quan 12"
              const pattern = new RegExp(
                `\\b(quan|district|q\\.?)\\s*${num}\\b`,
                'i',
              );
              if (pattern.test(districtName)) return true;
            }
          }

          // Finally try loose contains
          return searchTerms.some(
            (term) => districtName.includes(term) && term.length > 2, // Avoid matching single digits
          );
        });

        if (district) {
          result.districtId = district.DistrictID;
          this.logger.log(
            `✅ Found district: ${district.DistrictName} (ID: ${district.DistrictID})`,
          );
        } else {
          this.logger.warn(
            `⚠️ District not found in province ${result.provinceId}: "${params.district}" (searched: ${searchTerms.join(', ')})`,
          );
        }
      }

      // 3. Find ward code
      if (params.ward && result.districtId) {
        const wards = await this.getWards(result.districtId);
        const searchTerms = this.extractSearchTerms(params.ward);

        const ward = wards.find((w) => {
          const wardName = this.normalizeVietnamese(w.WardName);
          return searchTerms.some(
            (term) => wardName.includes(term) || term.includes(wardName),
          );
        });

        if (ward) {
          result.wardCode = ward.WardCode;
          this.logger.log(
            `✅ Found ward: ${ward.WardName} (Code: ${ward.WardCode})`,
          );
        } else {
          this.logger.warn(
            `⚠️ Ward not found in district ${result.districtId}: "${params.ward}" (searched: ${searchTerms.join(', ')})`,
          );
        }
      }

      return result;
    } catch (error: any) {
      this.logger.error('Failed to find address codes:', error.message);
      return result;
    }
  }

  /**
   * Extract multiple search terms from input
   * "District 1" -> ["district 1", "quan 1", "q1", "1"]
   * "Phường 14" -> ["phuong 14", "p14", "14"]
   * "Ben Nghe Ward" -> ["ben nghe ward", "ben nghe", "phuong ben nghe"]
   */
  private extractSearchTerms(input: string): string[] {
    const normalized = this.normalizeVietnamese(input);
    const terms = [normalized];

    // Handle "District X" -> "Quan X", "QX"
    const districtMatch = normalized.match(/district\s+(\d+|[a-z]+)/i);
    if (districtMatch) {
      const num = districtMatch[1];
      terms.push(`quan ${num}`, `q${num}`, `q.${num}`, num);
    }

    // Handle "Quận X" -> "District X", "QX"
    const quanMatch = normalized.match(/quan\s+(\d+|[a-z]+)/i);
    if (quanMatch) {
      const num = quanMatch[1];
      terms.push(`district ${num}`, `q${num}`, `q.${num}`, num);
    }

    // Handle "Ward X" or "X Ward" -> "Phuong X", "PX"
    const wardMatch = normalized.match(/(?:ward\s+)?([a-z\s]+?)(?:\s+ward)?$/i);
    if (wardMatch) {
      const name = wardMatch[1].trim();
      if (name && name !== 'ward') {
        terms.push(
          `phuong ${name}`,
          `p.${name}`,
          `p. ${name}`,
          name, // Just the name without prefix
        );
      }
    }

    // Handle "Phường X" -> "Ward X", "PX"
    const phuongMatch = normalized.match(/phuong\s+([a-z\s\d]+)/i);
    if (phuongMatch) {
      const name = phuongMatch[1].trim();
      terms.push(`ward ${name}`, `p.${name}`, `p. ${name}`, name);
    }

    // Remove empty strings and duplicates
    return [...new Set(terms.filter((t) => t && t.length > 0))];
  }

  /**
   * Normalize Vietnamese text for comparison (remove diacritics, lowercase)
   */
  private normalizeVietnamese(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  }
}

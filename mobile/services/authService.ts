import axios from "axios";
import apiService from "./apiService";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  dob: string;
  gender: boolean;
  photoUrl?: string;
  street: string;
  streetLine1: string;
  streetLine2?: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
  districtId?: number;
  wardCode?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Address {
  addressId: string;
  userId: string;
  street: string;
  streetLine1: string;
  streetLine2?: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
  districtId?: number;
  wardCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  dob: string;
  gender: boolean;
  allergies?: string[];
  photoUrl?: string;
  addresses: Address[];
  balance: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    access_token: string;
    user: User;
  };
  timestamp: string;
}

export const register = async (
  payload: RegisterPayload
): Promise<AuthResponse> => {
  try {
    return apiService.post<AuthResponse>("/auth/register", payload);
  } catch (error) {
    throw new Error("Registration failed");
  }
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    return apiService.post<AuthResponse>("/auth/login", payload);
  } catch (error) {
    throw new Error("Login failed");
  }
};

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Address {
  addressId: string;
  street: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  dob?: string;
  photoUrl?: string;
  addresses?: Address[];
  balance?: number;
  role: "customer" | "staff" | "admin" | "dermatologist";
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    access_token: string;
    user: User;
  };
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
}

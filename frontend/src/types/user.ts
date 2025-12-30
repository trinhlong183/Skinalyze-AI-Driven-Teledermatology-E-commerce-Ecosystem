export interface User {
  userId: string;
  email: string;
  password?: string;
  fullName: string;
  balance?: string;
  dob?: string | null;
  gender?: boolean | null; // true: Male, false: Female
  photoUrl?: string | null;
  phone: string | null;
  role: "admin" | "staff" | "customer" | "dermatologist";
  addresses?: {
    addressId: string;
    street: string;
    city: string;
    country: string;
    postalCode: string;
  }[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isVerified?: boolean;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiry?: string | null;
  allergies: string[] | null;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  dob?: string;
  photoUrl?: string;
  phone?: string;
  role: "admin" | "staff" | "customer" | "dermatologist";
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  dob?: string;
  photoUrl?: string;
  phone?: string;
  role?: "admin" | "staff" | "customer" | "dermatologist";
  isActive?: boolean;
}

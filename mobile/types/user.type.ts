export interface User {
  userId: string;
  fullName: string;
  email: string;
  balance?: number;
  currency?: string;
  dob: string;
  phone: string;
  photoUrl?: string;
  address: string;
  gender: boolean;
  allergies?: string[];
  role: string;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

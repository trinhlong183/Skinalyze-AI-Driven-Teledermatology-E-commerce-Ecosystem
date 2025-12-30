import { User } from "./user";

export interface Dermatologist {
  dermatologistId: string;
  userId: string;
  yearsOfExperience: number;
  defaultSlotPrice: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface DermatologistProfile {
  dermatologistId: string;
  purchaseHistory: any;
  yearsOfExp: number;
  defaultSlotPrice: string;
  about?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    userId: string;
    email: string;
    fullName: string;
    dob: string | null;
    balance: number;
    photoUrl: string | null;
    phone: string | null;
    gender: boolean | null; // true: Male, false: Female, null: Not specified
    role: "dermatologist";
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isVerified: boolean;
  };
}

export interface UpdateDermatologistProfileRequest {
  fullName?: string;
  phone?: string;
  dob?: string;
  photoUrl?: string;
}

export interface UpdatePersonalInfoRequest {
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: boolean | null;
  photo?: File;
}

export interface UpdateProfessionalInfoRequest {
  yearsOfExp: number;
  defaultSlotPrice: number;
  about?: string;
}

export interface DermatologistProfileResponse {
  statusCode: number;
  message: string;
  data: DermatologistProfile;
  timestamp: string;
}

export interface GetMyPatientsDto {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PatientListItemDto {
  customerId: string;
  userId: string;
  fullName: string;
  photoUrl: string | null;
  phone: string;
  age: number | null;
  gender: boolean | null; // true: Male, false: Female

  // Appointment information
  lastAppointment: {
    appointmentId: string;
    date: Date;
    status: string;
    type: string;
  } | null;

  nextAppointment: {
    appointmentId: string;
    date: Date;
    status: string;
    isToday: boolean;
  } | null;
}

export interface PatientsResponse {
  data: PatientListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface Specialization {
  specializationId: string;
  dermatologistId: string;
  specializationName: string;
  specialty: string;
  certificateImageUrl?: string;
  description?: string;
  level?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecializationRequest {
  dermatologistId: string;
  specializationName: string;
  specialty: string;
  certificateImage?: File;
  description?: string;
  level?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface SpecializationsResponse {
  success: boolean;
  message: string;
  data: Specialization[];
}

export interface SpecializationDetailResponse {
  success: boolean;
  message: string;
  data: Specialization;
}

export interface UpdateSpecializationRequest {
  specializationName?: string;
  specialty?: string;
  certificateImage?: File;
  description?: string;
  level?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
}

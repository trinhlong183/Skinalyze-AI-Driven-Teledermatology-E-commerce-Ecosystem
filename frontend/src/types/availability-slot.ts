export interface AvailabilitySlot {
  slotId: string;
  dermatologistId: string;
  appointmentId: string | null;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  price: number | null;
  createdAt: string;
}
export interface SlotBlock {
  startTime: string;
  endTime: string;
  slotDurationInMinutes: number;
  price?: number;
}

export interface CreateAvailabilityDto {
  blocks: SlotBlock[];
}

export enum SlotStatus {
  AVAILABLE = "AVAILABLE",
  BOOKED = "BOOKED",
}

export interface AvailabilitySlot {
  slotId: string;
  dermatologistId: string;
  appointmentId?: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "BOOKED";
  price: number;
  createdAt: string;
  updatedAt: string;
}

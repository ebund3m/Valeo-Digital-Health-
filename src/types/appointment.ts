export type AppointmentStatus = 
  "pending" | "approved" | "completed" | "cancelled" | "no_show";

export type PaymentStatus = 
  "pending" | "paid" | "refunded";

export interface Appointment {
  id:              string;
  clientId:        string;
  doctorId:        string;
  dateTime:        Date;
  durationMinutes: number;
  type:            "video" | "in_person";
  status:          AppointmentStatus;
  paymentStatus:   PaymentStatus;
  paymentId?:      string;
  videoLink?:      string;
  notes?:          string;
  createdAt:       Date;
  updatedAt:       Date;
}
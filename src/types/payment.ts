export interface Payment {
  id:                   string;
  appointmentId:        string;
  clientId:             string;
  doctorId:             string;
  amount:               number;
  currency:             "USD" | "XCD";
  gateway:              "WiPay";
  gatewayTransactionId?: string;
  status:               "initiated" | "success" | "failed" | "refunded";
  receiptURL?:          string;
  createdAt:            Date;
  updatedAt:            Date;
}
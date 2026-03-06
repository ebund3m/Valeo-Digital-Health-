export type Role = "client" | "doctor" | "admin";

export interface VUser {
  uid:             string;
  role:            Role;
  email:           string;
  displayName:     string;
  phoneNumber?:    string;
  profilePhotoURL?: string;
  isActive:        boolean;
  createdAt:       Date;
  lastLoginAt?:    Date;
}
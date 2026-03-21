export type UserRole =
  | "citizen"
  | "director"
  | "coordinator"
  | "surveyor"
  | "technician"
  | "meter_reader"
  | "finance"
  | "admin";

export type BranchName = "Sikela Branch" | "Nech Sar Branch" | "Secha Branch";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branch?: BranchName;
  status?: "active" | "inactive";
  firstLogin?: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token?: string;
  message?: string;
  requirePasswordChange?: boolean;
}

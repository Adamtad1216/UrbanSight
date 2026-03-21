import { createContext } from "react";
import { AuthUser } from "@/types/auth";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthContextValue {
  portal: "unified" | "citizen" | "backoffice";
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginInput) => Promise<AuthUser>;
  register: (payload: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

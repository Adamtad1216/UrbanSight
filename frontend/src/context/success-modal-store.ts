import { createContext } from "react";

export interface SuccessModalState {
  isOpen: boolean;
  message: string;
  redirectPath: string;
}

export interface SuccessModalContextValue extends SuccessModalState {
  openModal: (message: string, redirectPath: string) => void;
  closeModal: () => void;
}

export const SuccessModalContext =
  createContext<SuccessModalContextValue | null>(null);

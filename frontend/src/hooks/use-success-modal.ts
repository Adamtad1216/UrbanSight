import { useContext } from "react";
import { SuccessModalContext } from "@/context/success-modal-store";

export function useSuccessModal() {
  const context = useContext(SuccessModalContext);

  if (!context) {
    throw new Error("useSuccessModal must be used inside SuccessModalProvider");
  }

  return context;
}

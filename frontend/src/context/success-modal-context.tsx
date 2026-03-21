import { useMemo, useState } from "react";
import {
  SuccessModalContext,
  SuccessModalState,
} from "@/context/success-modal-store";

export function SuccessModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SuccessModalState>({
    isOpen: false,
    message: "",
    redirectPath: "/",
  });

  const openModal = (message: string, redirectPath: string) => {
    setState({
      isOpen: true,
      message,
      redirectPath,
    });
  };

  const closeModal = () => {
    setState((previous) => ({
      ...previous,
      isOpen: false,
    }));
  };

  const value = useMemo(
    () => ({
      ...state,
      openModal,
      closeModal,
    }),
    [state],
  );

  return (
    <SuccessModalContext.Provider value={value}>
      {children}
    </SuccessModalContext.Provider>
  );
}

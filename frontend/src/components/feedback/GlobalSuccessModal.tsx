import { SuccessModal } from "@/components/feedback/SuccessModal";
import { useSuccessModal } from "@/hooks/use-success-modal";

export function GlobalSuccessModal() {
  const { isOpen, message, redirectPath, closeModal } = useSuccessModal();

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={closeModal}
      message={message}
      redirectPath={redirectPath}
    />
  );
}

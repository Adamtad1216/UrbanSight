import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  redirectPath: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  message,
  redirectPath,
}: SuccessModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleOk = () => {
    onClose();
    navigate(redirectPath);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-md rounded-2xl border border-border/60 bg-background/95 p-6 shadow-2xl">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-2xl">
            {t("common.success", "Success")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <Button onClick={handleOk} className="w-full sm:w-full">
            {t("common.ok", "OK")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

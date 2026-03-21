import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = ["Submitted", "Inspection", "Payment", "Approved", "Completed"] as const;

function getStageIndex(status: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "submitted") return 0;
  if (normalized === "under_review" || normalized === "inspection") return 1;
  if (
    normalized === "waiting_payment" ||
    normalized === "payment_submitted" ||
    normalized === "payment_verified" ||
    normalized === "payment_rejected"
  ) {
    return 2;
  }
  if (normalized === "approved") return 3;
  if (normalized === "completed") return 4;

  return 0;
}

export function RequestStatusTracker({ status }: { status: string }) {
  const currentIndex = getStageIndex(status);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage} className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-[10px] border",
                  isDone && "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300",
                  isCurrent && "bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300",
                  !isDone && !isCurrent && "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] truncate",
                  isDone && "text-emerald-700 dark:text-emerald-300",
                  isCurrent && "text-sky-700 dark:text-sky-300 font-medium",
                  !isDone && !isCurrent && "text-muted-foreground",
                )}
              >
                {stage}
              </span>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index < currentIndex ? "bg-emerald-500" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

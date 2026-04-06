import { CheckCircle2 } from "lucide-react";
import { WorkflowStatus } from "@/types/request";

const timelineSteps = [
  "Submitted",
  "Inspection",
  "Payment",
  "Approved",
  "Completed",
] as const;

function getCurrentStepIndex(
  status: WorkflowStatus,
  paymentStatus?: "pending" | "submitted" | "verified" | "rejected",
  branchApprovalStage?: number,
) {
  if (status === "under_review") {
    if (paymentStatus === "submitted" || paymentStatus === "verified") {
      return 2;
    }

    if ((branchApprovalStage || 0) >= 1) {
      return 1;
    }

    return 0;
  }

  if (
    status === "submitted" ||
    status === "adjustment_requested" ||
    status === "rejected"
  ) {
    return 0;
  }

  if (status === "inspection") {
    return 1;
  }
  if (
    status === "waiting_payment" ||
    status === "payment_submitted" ||
    status === "payment_verified" ||
    status === "payment_rejected"
  ) {
    return 2;
  }
  if (status === "approved") {
    return 3;
  }
  return 4;
}

export function ApplicationProgressTimeline({
  status,
  paymentStatus,
  branchApprovalStage,
}: {
  status: WorkflowStatus;
  paymentStatus?: "pending" | "submitted" | "verified" | "rejected";
  branchApprovalStage?: number;
}) {
  const currentIndex = getCurrentStepIndex(
    status,
    paymentStatus,
    branchApprovalStage,
  );

  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Workflow Timeline</h3>
      <div className="grid gap-3 sm:grid-cols-5">
        {timelineSteps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step}
              className="relative flex items-center gap-2 sm:flex-col sm:items-start"
            >
              <div className="flex items-center gap-2 sm:w-full">
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    isCompleted
                      ? "border-emerald-300 bg-emerald-500/15 text-emerald-700"
                      : isCurrent
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-xs font-medium sm:hidden">{step}</span>
              </div>
              <span
                className={[
                  "hidden text-xs sm:block",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

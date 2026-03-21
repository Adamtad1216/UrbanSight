import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  submitted: "bg-warning/10 text-warning border-warning/20",
  under_review: "bg-info/10 text-info border-info/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-info/10 text-info border-info/20",
  inspection: "bg-primary/10 text-primary border-primary/20",
  waiting_payment: "bg-warning/10 text-warning border-warning/20",
  payment_submitted: "bg-info/10 text-info border-info/20",
  payment_verified: "bg-success/10 text-success border-success/20",
  payment_rejected: "bg-destructive/10 text-destructive border-destructive/20",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  verified: "bg-success/10 text-success border-success/20",
};

const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-destructive text-destructive-foreground border-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const statusLabel = status.replace(/_/g, " ");

  return (
    <Badge
      variant="outline"
      className={`capitalize text-xs font-medium ${statusStyles[status] || ""}`}
    >
      {statusLabel}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="outline"
      className={`capitalize text-xs font-medium ${priorityStyles[priority] || ""}`}
    >
      {priority}
    </Badge>
  );
}

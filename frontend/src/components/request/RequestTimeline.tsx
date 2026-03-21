import { CheckCircle2, Circle } from "lucide-react";
import { RequestTimelineItem, RequestWorkflowLogItem } from "@/types/request";

interface RequestTimelineProps {
  timeline?: RequestTimelineItem[];
  workflowLogs?: RequestWorkflowLogItem[];
}

export function RequestTimeline({
  timeline,
  workflowLogs,
}: RequestTimelineProps) {
  const normalizedTimeline: RequestTimelineItem[] = Array.isArray(timeline)
    ? timeline
    : Array.isArray(workflowLogs)
      ? workflowLogs.map((log) => ({
          status: log.toStatus,
          note: log.note || log.action,
          changedBy: log.actor,
          changedAt: log.createdAt,
        }))
      : [];

  const sorted = [...normalizedTimeline].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No timeline events yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((item, index) => {
        const isLast = index === sorted.length - 1;
        return (
          <div
            key={`${item.status}-${item.changedAt}-${index}`}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              {isLast ? (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-primary mt-0.5" />
              )}
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium capitalize">
                {item.status.replace("_", " ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.note || "No note"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(item.changedAt).toLocaleString()}{" "}
                {item.changedBy?.name ? `- ${item.changedBy.name}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

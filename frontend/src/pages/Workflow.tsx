import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { NewConnectionRequest, WorkflowStatus } from "@/types/request";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Calendar, User } from "lucide-react";
import { useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const stages: { key: WorkflowStatus; label: string; color: string }[] = [
  {
    key: "submitted",
    label: "Submitted",
    color: "bg-warning/10 border-warning/30",
  },
  {
    key: "under_review",
    label: "Under Review",
    color: "bg-info/10 border-info/30",
  },
  {
    key: "inspection",
    label: "Inspection",
    color: "bg-primary/10 border-primary/30",
  },
  {
    key: "waiting_payment",
    label: "Waiting Payment",
    color: "bg-warning/10 border-warning/30",
  },
  {
    key: "approved",
    label: "Approved",
    color: "bg-accent/10 border-accent/30",
  },
  {
    key: "completed",
    label: "Completed",
    color: "bg-success/10 border-success/30",
  },
];

function getAssignedStaffName(task: NewConnectionRequest) {
  const firstTechnician = task.assignedTechnicians?.[0];
  const technicianName =
    typeof firstTechnician === "string" ? "Technician" : firstTechnician?.name;
  const surveyorName =
    typeof task.assignedSurveyor === "string"
      ? "Surveyor"
      : task.assignedSurveyor?.name;

  return (
    technicianName ||
    surveyorName ||
    task.assignedTo?.technician?.name ||
    task.assignedTo?.surveyor?.name ||
    "Unassigned"
  );
}

export default function WorkflowPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<NewConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
        "/requests",
      );
      setTasks(
        response.requests.filter((request) => request.status !== "rejected"),
      );
    } catch (error) {
      toast({
        title: "Failed to load workflow",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);

  const handleDrop = async (stage: WorkflowStatus) => {
    if (!draggedTask) return;

    const allowedRoles = ["director", "surveyor", "finance"];
    if (!allowedRoles.includes(user?.role || "")) {
      toast({
        title: "Read only",
        description: "Your role can view workflow but cannot change stage.",
      });
      return;
    }

    try {
      await apiRequest(`/requests/${draggedTask}/status`, {
        method: "PATCH",
        body: {
          status: stage,
          note: "Workflow stage updated from board",
        },
      });
      await loadRequests();
    } catch (error) {
      toast({
        title: "Unable to update stage",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }

    setDraggedTask(null);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Task Workflow</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kanban board for task management
        </p>
      </motion.div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {stages.map((stage, i) => {
          const stageTasks = tasks.filter((t) => t.status === stage.key);
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="min-w-[280px] flex-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className={`rounded-xl border ${stage.color} p-1 mb-3`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageTasks.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-sm text-muted-foreground p-2">
                    Loading...
                  </div>
                ) : stageTasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">
                    No tasks
                  </div>
                ) : (
                  stageTasks.map((task) => (
                    <motion.div
                      key={task._id}
                      draggable
                      onDragStart={() => handleDragStart(task._id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="glass-card-hover rounded-xl p-4 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {task._id.slice(-8).toUpperCase()}
                            </span>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-sm font-medium leading-snug">
                            {task.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.serviceType} · {task.readingZone}
                          </p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getAssignedStaffName(task)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

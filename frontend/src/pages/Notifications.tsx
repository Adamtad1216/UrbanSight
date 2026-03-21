import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SystemNotification } from "@/types/notification";

const typeIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  info: "text-info bg-info/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  error: "text-destructive bg-destructive/10",
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiRequest<{
        notifications: SystemNotification[];
      }>("/notifications?limit=100");
      setNotifications(response.notifications || []);
    } catch (error) {
      toast({
        title: "Failed to load notifications",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, read: true })),
      );
    } catch (error) {
      toast({
        title: "Failed to update notifications",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: "PATCH",
      });
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, read: true } : item,
        ),
      );
    } catch (error) {
      toast({
        title: "Failed to update notification",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stay updated on operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          Mark all read
        </Button>
      </motion.div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n, i) => {
            const Icon = n.read ? Bell : Info;
            const typeColor = n.read
              ? "text-muted-foreground bg-muted"
              : typeColors.info;
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card-hover rounded-xl p-4 flex items-start gap-4 ${!n.read ? "border-l-2 border-l-primary" : ""}`}
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">System Notification</p>
                    {!n.read && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(n.createdAt)}
                  </p>
                  {!n.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2"
                      onClick={() => markAsRead(n._id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, Menu, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SystemNotification } from "@/types/notification";
import { useLanguage } from "@/hooks/use-language";

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t, locale, language, setLanguage } = useLanguage();

  const loadNotificationSummary = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiRequest<{
        unreadCount: number;
        notifications: SystemNotification[];
      }>("/notifications/summary");

      setUnreadCount(response.unreadCount || 0);
      setNotifications(response.notifications || []);
    } catch {
      // Keep topbar resilient and non-blocking.
    }
  }, [user]);

  useEffect(() => {
    loadNotificationSummary();

    const intervalId = window.setInterval(loadNotificationSummary, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadNotificationSummary]);

  const markTopbarNotificationRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((previous) => Math.max(previous - 1, 0));
    } catch {
      // Non-blocking action in compact dropdown.
    }
  };

  const roleLabelMap: Record<string, string> = {
    citizen: t("role.citizen", "Citizen"),
    director: t("role.director", "Customer Service Director"),
    coordinator: t("role.coordinator", "Branch Coordinator"),
    surveyor: t("role.surveyor", "Surveyor"),
    technician: t("role.technician", "Technician"),
    meter_reader: t("role.meter_reader", "Meter Reader"),
    finance: t("role.finance", "Finance Officer"),
    admin: t("role.admin", "System Admin"),
  };

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "am" : "en");
  };

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(locale);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: t("common.signedOut", "Signed out") });
    } catch (error) {
      toast({
        title: t("common.logoutFailed", "Logout failed"),
        description:
          error instanceof Error
            ? error.message
            : t("common.tryAgain", "Try again"),
        variant: "destructive",
      });
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(
              "common.search.placeholder",
              "Search requests, tasks, users...",
            )}
            className="pl-9 w-64 lg:w-80 bg-muted/50 border-border/50 focus:bg-card"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          className="text-muted-foreground hover:text-foreground"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          title={t("common.language", "Language")}
          aria-label={t("common.language", "Language")}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              {t("common.notifications", "Notifications")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem className="text-xs text-muted-foreground">
                {t("common.notifications.empty", "No notifications")}
              </DropdownMenuItem>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <DropdownMenuItem
                  key={n._id}
                  className="flex flex-col items-start gap-1 py-3"
                  onClick={() => markTopbarNotificationRead(n._id)}
                >
                  <span className="text-sm font-medium">
                    {t("common.system.notification", "System Notification")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {n.message}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(n.createdAt)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {(user?.name || "U")
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {roleLabelMap[user?.role || ""] || t("common.user", "User")}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(user?.role === "citizen" ? "/citizen/profile" : "/settings")}
            >
              {t("common.profile", "Profile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(user?.role === "citizen" ? "/citizen/settings" : "/settings")}
            >
              {t("common.settings", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              {t("common.logout", "Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

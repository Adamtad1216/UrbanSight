import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getNavItemsForRole } from "@/components/layout/nav-config";

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showDesktopResults, setShowDesktopResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t, locale, language, setLanguage } = useLanguage();
  const navItems = useMemo(() => getNavItemsForRole(user?.role), [user?.role]);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!normalizedSearchTerm) {
      return navItems.slice(0, 6);
    }

    return navItems
      .filter((item) => {
        const title = item.title.toLowerCase();
        const path = item.path.toLowerCase();
        return (
          title.includes(normalizedSearchTerm) ||
          path.includes(normalizedSearchTerm)
        );
      })
      .slice(0, 8);
  }, [navItems, normalizedSearchTerm]);

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

  const executeSearchNavigation = (path: string) => {
    navigate(path);
    setSearchTerm("");
    setShowDesktopResults(false);
    setIsMobileSearchOpen(false);
  };

  const handleSearchSubmit = () => {
    if (searchMatches.length > 0) {
      executeSearchNavigation(searchMatches[0].path);
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
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setShowDesktopResults(true);
            }}
            onFocus={() => setShowDesktopResults(true)}
            onBlur={() => {
              window.setTimeout(() => setShowDesktopResults(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearchSubmit();
              }
            }}
            className="pl-9 w-64 lg:w-80 bg-muted/50 border-border/50 focus:bg-card"
          />
          {showDesktopResults && (
            <div className="absolute top-[calc(100%+0.5rem)] z-50 w-full rounded-lg border border-border bg-card shadow-lg">
              {searchMatches.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t("common.search.noResults", "No matching pages")}
                </div>
              ) : (
                <div className="py-1">
                  {searchMatches.map((item) => (
                    <button
                      key={`${item.path}-${item.title}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        executeSearchNavigation(item.path);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/70"
                    >
                      <div className="font-medium text-foreground">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.path}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setIsMobileSearchOpen(true)}
          title={t("common.search.placeholder", "Search")}
          aria-label={t("common.search.placeholder", "Search")}
        >
          <Search className="h-5 w-5" />
        </Button>

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
              onClick={() =>
                navigate(
                  user?.role === "citizen" ? "/citizen/profile" : "/settings",
                )
              }
            >
              {t("common.profile", "Profile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigate(
                  user?.role === "citizen" ? "/citizen/settings" : "/settings",
                )
              }
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

      <CommandDialog
        open={isMobileSearchOpen}
        onOpenChange={setIsMobileSearchOpen}
      >
        <CommandInput
          value={searchTerm}
          onValueChange={setSearchTerm}
          placeholder={t(
            "common.search.placeholder",
            "Search requests, tasks, users...",
          )}
        />
        <CommandList>
          <CommandEmpty>
            {t("common.search.noResults", "No matching pages")}
          </CommandEmpty>
          <CommandGroup heading={t("common.search.results", "Pages")}>
            {searchMatches.map((item) => (
              <CommandItem
                key={`${item.path}-${item.title}`}
                value={`${item.title} ${item.path}`}
                onSelect={() => executeSearchNavigation(item.path)}
              >
                <span>{item.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.path}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

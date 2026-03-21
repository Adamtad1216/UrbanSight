import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Globe, Database, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const phoneErrorMessage = "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "").trim();

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const isCitizen = user?.role === "citizen";
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
    dailyDigest: true,
  });
  const [systemPrefs, setSystemPrefs] = useState({
    maintenanceMode: false,
    autoAssignTasks: true,
    multiLanguage: true,
  });
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedNotifications = window.localStorage.getItem(
        "urbansight_notification_preferences",
      );
      if (storedNotifications) {
        setNotificationPrefs(JSON.parse(storedNotifications));
      }
    } catch {
      // Ignore malformed local preferences and fallback to defaults.
    }
  }, []);

  useEffect(() => {
    const loadSystemSettings = async () => {
      if (user?.role !== "admin") return;

      try {
        const response = await apiRequest<{
          settings: { maintenanceMode: boolean; autoAssignTasks: boolean };
        }>("/system/settings");

        setSystemPrefs((previous) => ({
          ...previous,
          maintenanceMode: Boolean(response.settings?.maintenanceMode),
          autoAssignTasks: Boolean(response.settings?.autoAssignTasks),
        }));
      } catch {
        // Keep the local UI defaults when API is unavailable.
      }
    };

    loadSystemSettings();
  }, [user?.role]);

  const initials = useMemo(() => {
    if (!user?.name) return "US";

    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(profileForm.phone);
    if (normalizedPhone && !etPhoneRegex.test(normalizedPhone)) {
      toast({
        title: "Invalid phone number",
        description: phoneErrorMessage,
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);

    try {
      await apiRequest("/auth/profile", {
        method: "PATCH",
        body: {
          name: profileForm.name,
          email: profileForm.email,
          phone: normalizedPhone,
        },
      });

      await refreshUser();

      toast({
        title: "Profile updated",
        description: "Your account information was saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Weak password",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);

    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast({
        title: "Password changed",
        description: "Your password was updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Password change failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const updateNotificationPref = (
    key: keyof typeof notificationPrefs,
    value: boolean,
  ) => {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "urbansight_notification_preferences",
        JSON.stringify(next),
      );
    }
  };

  const updateSystemPref = async (
    key: "maintenanceMode" | "autoAssignTasks",
    value: boolean,
  ) => {
    if (user?.role !== "admin") {
      toast({
        title: "Access denied",
        description: "Only admins can change system controls.",
        variant: "destructive",
      });
      return;
    }

    const previous = systemPrefs;
    const next = { ...systemPrefs, [key]: value };
    setSystemPrefs(next);
    setSavingSystem(true);

    try {
      const response = await apiRequest<{
        settings: { maintenanceMode: boolean; autoAssignTasks: boolean };
      }>("/system/settings", {
        method: "PATCH",
        body: {
          maintenanceMode: next.maintenanceMode,
          autoAssignTasks: next.autoAssignTasks,
        },
      });

      setSystemPrefs((current) => ({
        ...current,
        maintenanceMode: Boolean(response.settings?.maintenanceMode),
        autoAssignTasks: Boolean(response.settings?.autoAssignTasks),
      }));

      toast({
        title: "System updated",
        description: "System controls were saved successfully.",
      });
    } catch (error) {
      setSystemPrefs(previous);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingSystem(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.title", "Settings")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("settings.subtitle", "Manage your account and preferences")}
        </p>
      </motion.div>

      <Tabs defaultValue={isCitizen ? "notifications" : "profile"} className="w-full">
        <TabsList className="bg-muted/50 border border-border/50">
          {!isCitizen && (
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> {t("common.profile", "Profile")}
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />{" "}
            {t("common.notifications", "Notifications")}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Shield className="h-4 w-4" /> {t("common.system", "System")}
          </TabsTrigger>
        </TabsList>

        {!isCitizen && (
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6 mt-4 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  {initials}
                </div>
                <div>
                  <h3 className="font-semibold">{user?.name || "Account"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    Role: {(user?.role || "-").replace("_", " ")}
                    {user?.branch ? ` | Branch: ${user.branch}` : ""}
                  </p>
                </div>
              </div>
              <Separator />

              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Full Name</Label>
                    <Input
                      id="settings-name"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">Email</Label>
                    <Input
                      id="settings-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="settings-phone">Phone</Label>
                    <Input
                      id="settings-phone"
                      value={profileForm.phone}
                      type="tel"
                      inputMode="tel"
                      placeholder="+251 94 741 4313"
                      onChange={(event) =>
                        setProfileForm((previous) => ({
                          ...previous,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <Button size="sm" type="submit" disabled={savingProfile}>
                  {savingProfile
                    ? t("settings.profile.saving", "Saving...")
                    : t("settings.profile.save", "Save Profile")}
                </Button>
              </form>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">
                    {t("settings.password.change", "Change Password")}
                  </h4>
                </div>

                <form
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  onSubmit={changePassword}
                >
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="old-password">
                      {t("settings.password.current", "Current Password")}
                    </Label>
                    <Input
                      id="old-password"
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          oldPassword: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">
                      {t("settings.password.new", "New Password")}
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          newPassword: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      {t("settings.password.confirm", "Confirm Password")}
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          confirmPassword: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button size="sm" type="submit" disabled={savingPassword}>
                      {savingPassword
                        ? t("settings.password.updating", "Updating...")
                        : t("settings.password.update", "Update Password")}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 mt-4 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive alerts for workflow and payments
                </p>
              </div>
              <Switch
                checked={notificationPrefs.email}
                onCheckedChange={(value) =>
                  updateNotificationPref("email", value)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  Browser notifications for live events
                </p>
              </div>
              <Switch
                checked={notificationPrefs.push}
                onCheckedChange={(value) =>
                  updateNotificationPref("push", value)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS alerts</p>
                <p className="text-xs text-muted-foreground">
                  Emergency notifications by SMS
                </p>
              </div>
              <Switch
                checked={notificationPrefs.sms}
                onCheckedChange={(value) =>
                  updateNotificationPref("sms", value)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Daily digest</p>
                <p className="text-xs text-muted-foreground">
                  Daily summary of account updates
                </p>
              </div>
              <Switch
                checked={notificationPrefs.dailyDigest}
                onCheckedChange={(value) =>
                  updateNotificationPref("dailyDigest", value)
                }
              />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="system">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 mt-4 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Maintenance mode</p>
                  <p className="text-xs text-muted-foreground">
                    Disable public access temporarily
                  </p>
                </div>
              </div>
              <Switch
                checked={systemPrefs.maintenanceMode}
                onCheckedChange={(value) =>
                  void updateSystemPref("maintenanceMode", value)
                }
                disabled={user?.role !== "admin" || savingSystem}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-assign tasks</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically assign tasks to available technicians
                  </p>
                </div>
              </div>
              <Switch
                checked={systemPrefs.autoAssignTasks}
                onCheckedChange={(value) =>
                  void updateSystemPref("autoAssignTasks", value)
                }
                disabled={user?.role !== "admin" || savingSystem}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t(
                      "settings.system.multiLanguage",
                      "Multi-language support",
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "settings.system.multiLanguageDesc",
                      "Choose your preferred interface language",
                    )}
                  </p>
                </div>
              </div>
              <div className="w-40">
                <Label htmlFor="language-select" className="sr-only">
                  {t("common.language", "Language")}
                </Label>
                <select
                  id="language-select"
                  title={t("common.language", "Language")}
                  aria-label={t("common.language", "Language")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value === "am" ? "am" : "en")
                  }
                >
                  <option value="en">{t("common.english", "English")}</option>
                  <option value="am">{t("common.amharic", "Amharic")}</option>
                </select>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

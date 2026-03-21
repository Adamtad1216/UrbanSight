import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, User } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const phoneErrorMessage = "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "").trim();

export default function CitizenProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user]);

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
      toast({ title: "Profile updated", description: "Your account information was saved successfully." });
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

      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed", description: "Your password was updated successfully." });
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

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">{t("common.profile", "Profile")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and account security.
        </p>
      </motion.div>

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
            <p className="text-sm text-muted-foreground">{user?.email || "-"}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              <User className="inline h-3.5 w-3.5 mr-1" />
              Role: {(user?.role || "-").replace("_", " ")}
            </p>
          </div>
        </div>
        <Separator />

        <form className="space-y-4" onSubmit={saveProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profileForm.phone}
                type="tel"
                inputMode="tel"
                placeholder="+251 94 741 4313"
                onChange={(event) =>
                  setProfileForm((previous) => ({ ...previous, phone: event.target.value }))
                }
              />
            </div>
          </div>
          <Button size="sm" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Change Password</h4>
          </div>

          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={changePassword}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-old-password">Current Password</Label>
              <Input
                id="profile-old-password"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, oldPassword: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-new-password">New Password</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-confirm-password">Confirm Password</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))
                }
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button size="sm" type="submit" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

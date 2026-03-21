import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  Shield,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { AuthUser, BranchName, UserRole } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  director: "bg-primary/10 text-primary border-primary/20",
  coordinator: "bg-accent/10 text-accent border-accent/20",
  surveyor: "bg-info/10 text-info border-info/20",
  technician: "bg-warning/10 text-warning border-warning/20",
  meter_reader: "bg-teal-100 text-teal-700 border-teal-200",
  finance: "bg-success/10 text-success border-success/20",
  citizen: "bg-muted text-muted-foreground border-border",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  director: "Customer Service Director",
  coordinator: "Branch Coordinator",
  surveyor: "Surveyor",
  technician: "Technician",
  meter_reader: "Meter Reader",
  finance: "Finance Officer",
  citizen: "Citizen",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

type AccountStatus = "active" | "inactive";
const branchOptions: BranchName[] = [
  "Sikela Branch",
  "Nech Sar Branch",
  "Secha Branch",
];
const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const phoneErrorMessage = "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "").trim();

type CreateStaffForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  branch: BranchName;
  status: AccountStatus;
};

const defaultCreateStaffForm: CreateStaffForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "director",
  branch: "Sikela Branch",
  status: "active",
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStaffForm>(
    defaultCreateStaffForm,
  );
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "director" as UserRole,
    branch: "Sikela Branch" as BranchName,
    status: "active" as AccountStatus,
  });

  const [deactivateTarget, setDeactivateTarget] = useState<AuthUser | null>(
    null,
  );
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(
    null,
  );

  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await apiRequest<{ users: AuthUser[] }>("/users");
      setUsers(response.users);
    } catch (error) {
      toast({
        title: "Failed to load users",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const setCreateField = <T extends keyof CreateStaffForm>(
    field: T,
    value: CreateStaffForm[T],
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    const normalizedPhone = normalizePhoneNumber(createForm.phone);

    if (!createForm.name.trim()) errors.name = "Full name is required";

    if (!createForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(createForm.email)) {
      errors.email = "Enter a valid email";
    }

    if (!normalizedPhone) {
      errors.phone = "Phone number is required";
    } else if (!etPhoneRegex.test(normalizedPhone)) {
      errors.phone = phoneErrorMessage;
    }
    if (!createForm.branch) errors.branch = "Branch is required";

    const hasAnyPasswordInput =
      createForm.password.trim().length > 0 ||
      createForm.confirmPassword.trim().length > 0;

    if (hasAnyPasswordInput) {
      if (createForm.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }

      if (!createForm.confirmPassword.trim()) {
        errors.confirmPassword = "Please confirm password";
      } else if (createForm.confirmPassword !== createForm.password) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createStaff = async () => {
    if (!validateCreateForm()) return;

    try {
      setIsSaving(true);
      const createPayload: Record<string, unknown> = {
        name: createForm.name,
        email: createForm.email,
        phone: normalizePhoneNumber(createForm.phone),
        role: createForm.role,
        branch: createForm.branch,
        status: createForm.status,
      };

      if (createForm.password.trim()) {
        createPayload.password = createForm.password;
        createPayload.confirmPassword = createForm.confirmPassword;
      }

      await apiRequest("/admin/create-staff", {
        method: "POST",
        body: createPayload,
      });

      toast({
        title: "Staff account created",
        description: "Credentials were sent to the staff user email.",
      });

      setCreateOpen(false);
      setCreateForm(defaultCreateStaffForm);
      setCreateErrors({});
      await loadUsers();
    } catch (error) {
      toast({
        title: "Failed to create account",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditUser = (user: AuthUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      branch: user.branch || "Sikela Branch",
      status: user.status || (user.isActive ? "active" : "inactive"),
    });
    setEditOpen(true);
  };

  const saveEditedUser = async () => {
    if (!selectedUser) return;

    const normalizedPhone = normalizePhoneNumber(editForm.phone);
    if (normalizedPhone && !etPhoneRegex.test(normalizedPhone)) {
      toast({
        title: "Invalid phone number",
        description: phoneErrorMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      await apiRequest(`/users/${selectedUser.id}`, {
        method: "PATCH",
        body: { ...editForm, phone: normalizedPhone },
      });

      toast({ title: "User updated" });
      setEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      toast({
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleUserStatus = async (
    user: AuthUser,
    nextStatus: AccountStatus,
  ) => {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: "PATCH",
        body: { status: nextStatus },
      });

      toast({
        title: nextStatus === "active" ? "User activated" : "User deactivated",
      });
      await loadUsers();
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (user: AuthUser) => {
    try {
      setIsResettingPassword(user.id);
      await apiRequest(`/users/${user.id}/reset-password`, {
        method: "POST",
      });
      toast({
        title: "Password reset",
        description: "Temporary password has been emailed to the user.",
      });
    } catch (error) {
      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(null);
    }
  };

  const getStatus = (user: AuthUser): AccountStatus =>
    user.status || (user.isActive ? "active" : "inactive");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage staff users, access roles, and account security
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-xl font-bold">{users.length}</p>
          </div>
        </div>

        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-xl font-bold">
              {users.filter((u) => getStatus(u) === "active").length}
            </p>
          </div>
        </div>

        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-xl font-bold">
              {users.filter((u) => getStatus(u) === "inactive").length}
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Branch</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">
                Created Date
              </TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const status = getStatus(user);

                return (
                  <TableRow
                    key={user.id}
                    className="border-border/50 hover:bg-muted/30"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {user.name
                            .split(" ")
                            .map((namePart) => namePart[0])
                            .join("")}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${roleColors[user.role] || ""}`}
                      >
                        {roleLabel[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[status]}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.branch || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUser(user)}
                        >
                          Edit User
                        </Button>

                        {status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeactivateTarget(user)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user, "active")}
                          >
                            Activate
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => resetPassword(user)}
                          disabled={isResettingPassword === user.id}
                        >
                          {isResettingPassword === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-3.5 w-3.5" />
                          )}
                          Reset Password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Staff User</DialogTitle>
            <DialogDescription>
              Add a staff account and configure role and security settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Personal Info
              </p>

              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateField("name", event.target.value)
                  }
                />
                {createErrors.name ? (
                  <p className="text-xs text-destructive">
                    {createErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateField("email", event.target.value)
                    }
                  />
                  {createErrors.email ? (
                    <p className="text-xs text-destructive">
                      {createErrors.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Phone Number
                  </Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="+251 94 741 4313"
                    value={createForm.phone}
                    onChange={(event) =>
                      setCreateField("phone", event.target.value)
                    }
                  />
                  {createErrors.phone ? (
                    <p className="text-xs text-destructive">
                      {createErrors.phone}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Role
              </p>

              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value: UserRole) => {
                    setCreateField("role", value);

                    // Keep a valid default branch internally when role hides branch UI.
                    if (value === "director" && !createForm.branch) {
                      setCreateField("branch", "Sikela Branch");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">
                      Customer Service Director
                    </SelectItem>
                    <SelectItem value="coordinator">
                      Branch Coordinator
                    </SelectItem>
                    <SelectItem value="surveyor">Surveyor</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="meter_reader">Meter Reader</SelectItem>
                    <SelectItem value="finance">Finance Officer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createForm.role !== "director" ? (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> Branch
                  </Label>
                  <Select
                    value={createForm.branch}
                    onValueChange={(value: BranchName) =>
                      setCreateField("branch", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createErrors.branch ? (
                    <p className="text-xs text-destructive">
                      {createErrors.branch}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Security
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateField("password", event.target.value)
                    }
                    placeholder="Leave blank to auto-generate temporary password"
                  />
                  {createErrors.password ? (
                    <p className="text-xs text-destructive">
                      {createErrors.password}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(event) =>
                      setCreateField("confirmPassword", event.target.value)
                    }
                    placeholder="Required only if password is entered"
                  />
                  {createErrors.confirmPassword ? (
                    <p className="text-xs text-destructive">
                      {createErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inactive users cannot log into the system.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={createForm.status === "active"}
                    onCheckedChange={(checked) =>
                      setCreateField("status", checked ? "active" : "inactive")
                    }
                    className={
                      createForm.status === "active"
                        ? "data-[state=checked]:bg-emerald-500"
                        : "data-[state=unchecked]:bg-destructive/50"
                    }
                  />
                  <Badge
                    variant="outline"
                    className={statusColors[createForm.status]}
                  >
                    {createForm.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              onClick={createStaff}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isSaving ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+251 94 741 4313"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: UserRole) =>
                    setEditForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">
                      Customer Service Director
                    </SelectItem>
                    <SelectItem value="coordinator">
                      Branch Coordinator
                    </SelectItem>
                    <SelectItem value="surveyor">Surveyor</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="meter_reader">Meter Reader</SelectItem>
                    <SelectItem value="finance">Finance Officer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Branch</Label>
                <Select
                  value={editForm.branch}
                  onValueChange={(value: BranchName) =>
                    setEditForm((prev) => ({ ...prev, branch: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Account Status</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inactive users cannot log into the system.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={editForm.status === "active"}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: checked ? "active" : "inactive",
                    }))
                  }
                />
                <Badge
                  variant="outline"
                  className={statusColors[editForm.status]}
                >
                  {editForm.status}
                </Badge>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={saveEditedUser}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving changes..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.name} will not be able to log in until reactivated.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deactivateTarget) return;
                await toggleUserStatus(deactivateTarget, "inactive");
                setDeactivateTarget(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

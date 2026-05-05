import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Shield, MapPin, Mail, Phone, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthUser } from "@/types/auth";

interface StaffDirectoryResponse {
  users: AuthUser[];
}

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  director: "bg-primary/10 text-primary border-primary/20",
  coordinator: "bg-accent/10 text-accent border-accent/20",
  surveyor: "bg-info/10 text-info border-info/20",
  technician: "bg-warning/10 text-warning border-warning/20",
  meter_reader: "bg-teal-100 text-teal-700 border-teal-200",
  finance: "bg-success/10 text-success border-success/20",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  director: "Customer Service Director",
  coordinator: "Branch Coordinator",
  surveyor: "Surveyor",
  technician: "Technician",
  meter_reader: "Meter Reader",
  finance: "Finance Officer",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function BranchStaff() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<StaffDirectoryResponse>(
        "/users/staff-directory",
      );
      setUsers(data.users ?? []);
    } catch (error) {
      toast({
        title: "Failed to load staff directory",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Branch Staff</h1>
          <p className="text-muted-foreground text-sm">
            View the staff assigned to your branch and their contact details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            {users.length} Staff
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            {activeCount} Active
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Branch Scoped
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Staff</p>
            <p className="text-xl font-bold">{users.length}</p>
          </div>
        </div>

        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{activeCount}</p>
          </div>
        </div>

        <div className="stat-card rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-xl font-bold">{inactiveCount}</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl overflow-hidden border border-border/50"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Branch</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading staff directory...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No staff members found for this branch.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-border/50 hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${roleColors[user.role] || ""}`}
                    >
                      {roleLabel[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 opacity-50" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 opacity-50" />
                      {user.phone || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 opacity-50" />
                      {user.branch || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status =
                        user.status || (user.isActive ? "active" : "inactive");
                      return (
                        <Badge
                          variant="outline"
                          className={statusColors[status]}
                        >
                          {status}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

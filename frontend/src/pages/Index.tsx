import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileText, Clock, CheckCircle2, DollarSign, Users } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StaffRole = "coordinator" | "surveyor" | "technician" | "meter_reader";

interface DashboardStatsResponse {
  stats: {
    totalRequests: number;
    pendingTasks: number;
    completedTasks: number;
    revenueCollected: number;
    activeStaff: number;
  };
}

interface DashboardActivityResponse {
  activity: Array<{
    id: string;
    message: string;
    createdAt: string;
    read: boolean;
  }>;
}

interface DashboardChartsResponse {
  charts: {
    requestsOverTime: Array<{ month: string; requests: number; completed: number }>;
    statusDistribution: Array<{ name: string; value: number }>;
    revenueTrend: Array<{ month: string; revenue: number }>;
  };
}

interface StaffDirectoryResponse {
  users: Array<{
    _id: string;
    name: string;
    role: string;
    branch?: string;
  }>;
}

interface RequestItem {
  _id: string;
  requestId?: string;
  branch?: string;
  status: string;
  assignedSurveyor?: { _id: string } | string | null;
  assignedTechnicians?: Array<{ _id: string } | string>;
}

interface RequestsResponse {
  requests: RequestItem[];
}

interface IssueItem {
  _id: string;
  issueId?: string;
  branch?: string;
  status: string;
  assignedTechnician?: { _id: string } | string | null;
}

interface IssuesResponse {
  issues: IssueItem[];
}

function isAssigned(value: unknown) {
  if (!value) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return Boolean((value as { _id?: string })._id);
  }
  return false;
}

function formatRoleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Index() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsResponse["stats"] | null>(null);
  const [activity, setActivity] = useState<DashboardActivityResponse["activity"]>([]);
  const [charts, setCharts] = useState<DashboardChartsResponse["charts"] | null>(null);

  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryResponse["users"]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);

  const [requestAssignRole, setRequestAssignRole] = useState<Record<string, StaffRole>>({});
  const [requestAssignee, setRequestAssignee] = useState<Record<string, string>>({});
  const [issueAssignee, setIssueAssignee] = useState<Record<string, string>>({});

  const isCoordinator = user?.role === "coordinator";
  const isAdmin = user?.role === "admin";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, chartsRes] = await Promise.all([
        apiRequest<DashboardStatsResponse>("/dashboard/stats"),
        apiRequest<DashboardActivityResponse>("/dashboard/activity"),
        apiRequest<DashboardChartsResponse>("/dashboard/charts"),
      ]);

      setStats(statsRes.stats);
      setActivity(activityRes.activity || []);
      setCharts(chartsRes.charts);
    } catch (error) {
      toast({
        title: "Dashboard error",
        description: error instanceof Error ? error.message : "Unable to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCoordinatorData = useCallback(async () => {
    if (!isCoordinator) return;

    try {
      const [staffRes, requestRes, issueRes] = await Promise.all([
        apiRequest<StaffDirectoryResponse>("/users/staff-directory"),
        apiRequest<RequestsResponse>("/requests"),
        apiRequest<IssuesResponse>("/issues"),
      ]);

      setStaffDirectory(staffRes.users || []);
      setRequests(requestRes.requests || []);
      setIssues(issueRes.issues || []);
    } catch (error) {
      toast({
        title: "Assignment data error",
        description: error instanceof Error ? error.message : "Unable to load assignment queues",
        variant: "destructive",
      });
    }
  }, [isCoordinator, toast]);

  useEffect(() => {
    loadDashboard();
    loadCoordinatorData();
  }, [loadCoordinatorData, loadDashboard]);

  const roleTitle = useMemo(() => {
    const map: Record<string, string> = {
      citizen: "Citizen Service Dashboard",
      director: "Director Operations Dashboard",
      coordinator: "Coordinator Branch Dashboard",
      surveyor: "Surveyor Work Dashboard",
      technician: "Technician Field Dashboard",
      meter_reader: "Meter Reader Dashboard",
      finance: "Finance Control Dashboard",
      admin: "Admin Command Dashboard",
    };
    return map[user?.role || ""] || "Dashboard";
  }, [user?.role]);

  const unassignedSurveyRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          ["under_review", "inspection"].includes(request.status) &&
          !isAssigned(request.assignedSurveyor),
      ),
    [requests],
  );

  const unassignedTechnicianRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "approved" &&
          (!Array.isArray(request.assignedTechnicians) || request.assignedTechnicians.length === 0),
      ),
    [requests],
  );

  const unassignedIssueTechnicians = useMemo(
    () =>
      issues.filter(
        (issue) =>
          ["approved", "payment_verified", "waiting_payment"].includes(issue.status) &&
          !isAssigned(issue.assignedTechnician),
      ),
    [issues],
  );

  const getEligibleStaff = useCallback(
    (requestOrIssueBranch: string | undefined, role: StaffRole) => {
      return staffDirectory.filter(
        (member) =>
          member.role === role &&
          (!requestOrIssueBranch || !member.branch || member.branch === requestOrIssueBranch),
      );
    },
    [staffDirectory],
  );

  const assignRequest = async (requestId: string) => {
    const role = requestAssignRole[requestId] || "surveyor";
    const selectedUser = requestAssignee[requestId];

    if (!selectedUser) {
      toast({ title: "Assignee required", description: "Choose a staff member first", variant: "destructive" });
      return;
    }

    const payload: {
      assignedSurveyor?: string;
      assignedMeterReader?: string;
      assignedTechnicians?: string[];
      assignedBranchOfficer?: string;
    } = {};

    if (role === "surveyor") payload.assignedSurveyor = selectedUser;
    if (role === "meter_reader") payload.assignedMeterReader = selectedUser;
    if (role === "coordinator") payload.assignedBranchOfficer = selectedUser;
    if (role === "technician") payload.assignedTechnicians = [selectedUser];

    try {
      await apiRequest(`/requests/request/${requestId}/manual-assign`, {
        method: "PATCH",
        body: payload,
      });

      toast({ title: "Assignment updated", description: "Task was assigned successfully" });
      await loadCoordinatorData();
      await loadDashboard();
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Unable to assign task",
        variant: "destructive",
      });
    }
  };

  const assignIssueTechnician = async (issueId: string) => {
    const technicianId = issueAssignee[issueId];

    if (!technicianId) {
      toast({ title: "Technician required", description: "Select a technician first", variant: "destructive" });
      return;
    }

    try {
      await apiRequest(`/issues/${issueId}/assign`, {
        method: "PATCH",
        body: { technicianId },
      });

      toast({ title: "Issue assigned", description: "Technician assigned successfully" });
      await loadCoordinatorData();
      await loadDashboard();
    } catch (error) {
      toast({
        title: "Issue assignment failed",
        description: error instanceof Error ? error.message : "Unable to assign issue",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">{roleTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Real-time operational metrics and global controls"
            : "Real-time operational metrics and workflow activity"}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Requests"
          value={String(stats?.totalRequests ?? 0)}
          change={loading ? "Loading..." : "Live from backend"}
          changeType="neutral"
          icon={FileText}
          delay={0}
        />
        <StatCard
          title="Pending Tasks"
          value={String(stats?.pendingTasks ?? 0)}
          change={loading ? "Loading..." : "Needs action"}
          changeType="negative"
          icon={Clock}
          delay={0.05}
        />
        <StatCard
          title="Completed"
          value={String(stats?.completedTasks ?? 0)}
          change={loading ? "Loading..." : "Fulfilled"}
          changeType="positive"
          icon={CheckCircle2}
          delay={0.1}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats?.revenueCollected ?? 0)}
          change={loading ? "Loading..." : "Verified payments"}
          changeType="positive"
          icon={DollarSign}
          delay={0.15}
        />
        <StatCard
          title="Active Staff"
          value={String(stats?.activeStaff ?? 0)}
          change={loading ? "Loading..." : "Non-citizen active users"}
          changeType="neutral"
          icon={Users}
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1">Request Throughput</h3>
          <p className="text-xs text-muted-foreground mb-4">Requests versus completed over time</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts?.requestsOverTime || []}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
              <Tooltip />
              <Area type="monotone" dataKey="requests" stroke="hsl(199, 89%, 48%)" fill="url(#reqGrad)" />
              <Area type="monotone" dataKey="completed" stroke="hsl(160, 84%, 40%)" fill="url(#doneGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-1">Status Mix</h3>
          <p className="text-xs text-muted-foreground mb-4">Current request status distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={charts?.statusDistribution || []}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                fill="hsl(199, 89%, 48%)"
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent notifications.</p>
            )}
            {activity.map((item) => (
              <div key={item.id} className="border-b border-border/60 pb-2 last:border-0">
                <p className="text-sm">{item.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-1">Revenue Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Verified collections by month</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts?.revenueTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
              <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(142, 72%, 35%)" fill="hsl(142, 72%, 35%, 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isCoordinator && (
        <div className="glass-card rounded-xl p-5 space-y-5">
          <h3 className="font-semibold">Manual Assignment Queue</h3>

          <div className="space-y-3">
            <p className="text-sm font-medium">Unassigned Request Tasks</p>
            {[...unassignedSurveyRequests, ...unassignedTechnicianRequests].slice(0, 8).map((request) => {
              const selectedRole = requestAssignRole[request._id] || "surveyor";
              const staffOptions = getEligibleStaff(request.branch, selectedRole);

              return (
                <div key={request._id} className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-center border border-border/60 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{request.requestId || request._id}</p>
                    <p className="text-xs text-muted-foreground">{request.status} {request.branch ? `• ${request.branch}` : ""}</p>
                  </div>

                  <Select
                    value={selectedRole}
                    onValueChange={(value) =>
                      setRequestAssignRole((previous) => ({
                        ...previous,
                        [request._id]: value as StaffRole,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surveyor">Surveyor</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="meter_reader">Meter Reader</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={requestAssignee[request._id] || ""}
                    onValueChange={(value) =>
                      setRequestAssignee((previous) => ({
                        ...previous,
                        [request._id]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptions.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name} ({formatRoleLabel(staff.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={() => assignRequest(request._id)}>Assign</Button>
                </div>
              );
            })}

            {unassignedSurveyRequests.length + unassignedTechnicianRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No unassigned request tasks.</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Unassigned Issue Technicians</p>
            {unassignedIssueTechnicians.slice(0, 8).map((issue) => {
              const technicians = getEligibleStaff(issue.branch, "technician");
              return (
                <div key={issue._id} className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-center border border-border/60 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{issue.issueId || issue._id}</p>
                    <p className="text-xs text-muted-foreground">{issue.status} {issue.branch ? `• ${issue.branch}` : ""}</p>
                  </div>

                  <Select
                    value={issueAssignee[issue._id] || ""}
                    onValueChange={(value) =>
                      setIssueAssignee((previous) => ({
                        ...previous,
                        [issue._id]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={() => assignIssueTechnician(issue._id)}>Assign Technician</Button>
                </div>
              );
            })}

            {unassignedIssueTechnicians.length === 0 && (
              <p className="text-sm text-muted-foreground">No unassigned issue tasks.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

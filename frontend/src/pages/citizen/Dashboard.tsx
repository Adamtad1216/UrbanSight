import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FilePlus2,
  MapPin,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { RequestStatusTracker } from "@/components/citizen/RequestStatusTracker";
import { NewConnectionRequest } from "@/types/request";
import { SystemNotification } from "@/types/notification";

interface CitizenIssue {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  totalEstimatedCost?: number;
  payment?: { status?: string };
  location?: { latitude: number; longitude: number };
}

interface DashboardItem {
  id: string;
  type: "New Connection" | "Issue";
  status: string;
  date: string;
  progress: number;
  needsPayment: boolean;
  amount: number;
  location?: { latitude: number; longitude: number };
}

const markerIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function needsPayment(status: string) {
  return ["waiting_payment", "payment_rejected"].includes(String(status));
}

function statusProgressPercent(status: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "submitted") return 20;
  if (normalized === "under_review" || normalized === "inspection") return 40;
  if (
    normalized === "waiting_payment" ||
    normalized === "payment_submitted" ||
    normalized === "payment_verified" ||
    normalized === "payment_rejected"
  ) {
    return 60;
  }
  if (normalized === "approved") return 80;
  if (normalized === "completed") return 100;

  return 20;
}

function statusColor(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "text-emerald-600";
  if (needsPayment(normalized)) return "text-amber-500";
  if (normalized === "rejected") return "text-rose-600";
  return "text-sky-600";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [issues, setIssues] = useState<CitizenIssue[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [apiSummary, setApiSummary] = useState<{
    totalRequests?: number;
    activeRequests?: number;
    completedRequests?: number;
    pendingPayments?: number;
  } | null>(null);

  const loadCitizenRequests = useCallback(async () => {
    try {
      const response = await apiRequest<{
        requests?: NewConnectionRequest[];
        issues?: CitizenIssue[];
      }>("/citizen/requests");

      return {
        requests: response.requests || [],
        issues: response.issues || [],
      };
    } catch {
      const [requestFallback, issueFallback] = await Promise.all([
        apiRequest<{ requests: NewConnectionRequest[] }>("/requests/my"),
        apiRequest<{ issues: CitizenIssue[] }>("/issues/my"),
      ]);

      return {
        requests: requestFallback.requests || [],
        issues: issueFallback.issues || [],
      };
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiRequest<{ notifications: SystemNotification[] }>(
        "/citizen/notifications",
      );
      return response.notifications || [];
    } catch {
      const fallback = await apiRequest<{ notifications: SystemNotification[] }>(
        "/notifications?limit=8",
      );
      return fallback.notifications || [];
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiRequest<{
        summary?: {
          totalRequests?: number;
          activeRequests?: number;
          completedRequests?: number;
          pendingPayments?: number;
        };
      }>("/citizen/dashboard");
      return response.summary || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [requestData, notificationData, summaryData] = await Promise.all([
          loadCitizenRequests(),
          loadNotifications(),
          loadSummary(),
        ]);

        setRequests(requestData.requests || []);
        setIssues(requestData.issues || []);
        setNotifications(notificationData || []);
        setApiSummary(summaryData);
      } catch (error) {
        toast({
          title: "Dashboard load failed",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadCitizenRequests, loadNotifications, loadSummary, toast]);

  const allItems = useMemo<DashboardItem[]>(() => {
    const requestItems = requests.map((request) => ({
      id: request._id,
      type: "New Connection" as const,
      status: request.status,
      date: request.createdAt,
      progress: statusProgressPercent(request.status),
      needsPayment: needsPayment(request.status),
      amount: asNumber(request.totalEstimatedCost),
      location: request.location,
    }));

    const issueItems = issues.map((issue) => {
      const issueStatus = issue.status || issue.payment?.status || "submitted";
      return {
        id: issue._id,
        type: "Issue" as const,
        status: issueStatus,
        date: issue.createdAt,
        progress: statusProgressPercent(issueStatus),
        needsPayment: needsPayment(issueStatus),
        amount: asNumber(issue.totalEstimatedCost),
        location: issue.location,
      };
    });

    return [...requestItems, ...issueItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [issues, requests]);

  const stats = useMemo(() => {
    const computed = {
      totalRequests: allItems.length,
      activeRequests: allItems.filter(
        (item) => !["completed", "rejected"].includes(item.status),
      ).length,
      completedRequests: allItems.filter((item) => item.status === "completed")
        .length,
      pendingPayments: allItems.filter((item) => item.needsPayment).length,
    };

    return {
      totalRequests: apiSummary?.totalRequests ?? computed.totalRequests,
      activeRequests: apiSummary?.activeRequests ?? computed.activeRequests,
      completedRequests: apiSummary?.completedRequests ?? computed.completedRequests,
      pendingPayments: apiSummary?.pendingPayments ?? computed.pendingPayments,
    };
  }, [allItems, apiSummary]);

  const pendingPaymentItems = useMemo(
    () => allItems.filter((item) => item.needsPayment),
    [allItems],
  );

  const activeItems = useMemo(
    () =>
      allItems.filter((item) => !["completed", "rejected"].includes(item.status)),
    [allItems],
  );

  const mapItems = useMemo(
    () =>
      allItems.filter(
        (item) =>
          item.location &&
          typeof item.location.latitude === "number" &&
          typeof item.location.longitude === "number",
      ),
    [allItems],
  );

  const greetingName = user?.name || "Citizen";

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const monthKeys: string[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const current = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthKeys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
    }

    const trendMap: Record<string, { requests: number; issues: number }> = Object.fromEntries(
      monthKeys.map((key) => [key, { requests: 0, issues: 0 }]),
    );

    for (const request of requests) {
      const date = new Date(request.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (trendMap[key]) trendMap[key].requests += 1;
    }

    for (const issue of issues) {
      const date = new Date(issue.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (trendMap[key]) trendMap[key].issues += 1;
    }

    return monthKeys.map((key) => {
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleString("en-US", {
        month: "short",
      });
      return {
        month: label,
        requests: trendMap[key].requests,
        issues: trendMap[key].issues,
      };
    });
  }, [issues, requests]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const item of allItems) {
      const key = item.status;
      counts[key] = (counts[key] || 0) + 1;
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allItems]);

  const statusColors = ["#0ea5e9", "#10b981", "#f59e0b", "#64748b", "#8b5cf6", "#ef4444"];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 p-6 lg:p-8 bg-gradient-to-br from-sky-100/70 via-background to-emerald-100/70 dark:from-sky-950/40 dark:to-emerald-950/30"
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-700 dark:text-sky-300 font-semibold">
              UrbanSight Citizen Control Center
            </p>
            <h1 className="text-2xl lg:text-4xl font-bold mt-2 tracking-tight">
              Welcome back, {greetingName}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Track your connection requests, monitor issue resolution, and complete pending payments from one place.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button asChild className="gap-2 rounded-xl">
              <Link to="/citizen/new-connection">
                <FilePlus2 className="h-4 w-4" /> Apply for New Connection
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2 rounded-xl">
              <Link to="/citizen/report-issue">
                <Wrench className="h-4 w-4" /> Report an Issue
              </Link>
            </Button>
            <Button variant="secondary" asChild className="gap-2 rounded-xl">
              <Link to="/citizen/my-requests">
                <CreditCard className="h-4 w-4" /> Make Payment
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalRequests}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-sky-600" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Requests</p>
                  <p className="text-3xl font-bold mt-1">{stats.activeRequests}</p>
                </div>
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed Requests</p>
                  <p className="text-3xl font-bold mt-1">{stats.completedRequests}</p>
                </div>
                <FileCheck2 className="h-8 w-8 text-emerald-600" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending Payments</p>
                  <p className="text-3xl font-bold mt-1">{stats.pendingPayments}</p>
                </div>
                <CreditCard className="h-8 w-8 text-amber-500" />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {pendingPaymentItems.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/20 p-5"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <TriangleAlert className="h-4 w-4" /> Payment Required
              </p>
              <p className="text-sm mt-1 text-amber-700/90 dark:text-amber-200/90">
                Request ID {pendingPaymentItems[0].id.slice(-8).toUpperCase()} requires payment of {formatCurrency(pendingPaymentItems[0].amount)}.
              </p>
            </div>
            <Button asChild>
              <Link to={`/citizen/payment/${pendingPaymentItems[0].id}`}>Pay Now</Link>
            </Button>
          </div>
        </motion.section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Active Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border p-4 space-y-3">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : activeItems.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p className="font-medium">No active requests right now.</p>
                <p className="text-sm mt-1">Start a new connection request or report an issue to see live tracking here.</p>
              </div>
            ) : (
              activeItems.slice(0, 6).map((item) => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/70 p-4 bg-card/60 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.type} ID</p>
                      <p className="font-mono text-sm font-semibold">{item.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(item.date).toLocaleDateString()}
                  </p>

                  <div className="mt-3">
                    <RequestStatusTracker status={item.status} />
                  </div>

                  <div className="mt-3">
                    <Progress value={item.progress} className="h-2" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={item.type === "New Connection" ? `/citizen/requests/${item.id}` : "/citizen/my-requests"}>
                        View Details
                      </Link>
                    </Button>
                    {item.type === "New Connection" && item.needsPayment && (
                      <Button size="sm" asChild>
                        <Link to={`/citizen/payment/${item.id}`}>Proceed to Payment</Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-center text-muted-foreground text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <div key={notification._id} className="rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? "bg-muted-foreground" : "bg-sky-500"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Request Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="requests" name="Connections" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="issues" name="Issues" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : statusDistribution.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No status data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`status-${entry.name}`} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, String(name).replace(/_/g, " ")]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Request Map View
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mapItems.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
                No geotagged requests available yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <MapContainer
                  center={[mapItems[0].location!.latitude, mapItems[0].location!.longitude]}
                  zoom={12}
                  className="h-[320px] w-full"
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapItems.map((item) => (
                    <Marker
                      key={`map-${item.type}-${item.id}`}
                      position={[item.location!.latitude, item.location!.longitude]}
                      icon={markerIcon}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                          <p className="font-mono text-sm">{item.id.slice(-8).toUpperCase()}</p>
                          <p className={`text-xs font-medium ${statusColor(item.status)}`}>
                            {item.status.replace(/_/g, " ")}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

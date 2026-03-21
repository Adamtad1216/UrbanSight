import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { monthlyData } from "@/data/dummy";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiRequest } from "@/lib/api";
import { NewConnectionRequest } from "@/types/request";
import { useToast } from "@/hooks/use-toast";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { useAuth } from "@/hooks/use-auth";

interface IssuePaymentRow {
  _id: string;
  title: string;
  citizen: string | { name?: string };
  totalEstimatedCost?: number;
  payment?: {
    transactionId?: string;
    paymentMethod?: string;
    receiptUrl?: string;
    submittedAt?: string;
    status?: "pending" | "verified" | "rejected";
  };
  assignedFinanceOfficer?:
    | string
    | { _id?: string; id?: string; name?: string };
}

type FinancePaymentRow = {
  id: string;
  source: "request" | "issue";
  citizenName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  receiptUrl: string;
  submittedAt: string;
  status: string;
};

function asId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const maybe = value as {
      id?: unknown;
      _id?: unknown;
      toString?: () => string;
    };
    if (typeof maybe.id === "string") return maybe.id;
    if (typeof maybe._id === "string") return maybe._id;
    if (maybe._id) return String(maybe._id);
    if (maybe.id) return String(maybe.id);
    if (typeof maybe.toString === "function") return maybe.toString();
  }
  return String(value);
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [issues, setIssues] = useState<IssuePaymentRow[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      const requestResponse = await apiRequest<{
        requests: NewConnectionRequest[];
      }>("/requests?status=payment_submitted");
      setRequests(requestResponse.requests);

      const issueResponse = await apiRequest<{ issues: IssuePaymentRow[] }>(
        "/issues?status=payment_submitted",
      );
      setIssues(issueResponse.issues);
    } catch (error) {
      toast({
        title: "Failed to load payments",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const currentUserId = asId(
    user?.id || (user as unknown as { _id?: string })?._id,
  );

  const paymentRows = useMemo<FinancePaymentRow[]>(
    () => [
      ...requests
        .filter((requestDoc) => {
          if (user?.role !== "finance") return true;

          const assignedId = asId(requestDoc.assignedFinanceOfficer);

          // Backward compatibility: show legacy unassigned pending items too.
          return !assignedId || assignedId === currentUserId;
        })
        .filter((requestDoc) => requestDoc.payment)
        .map((requestDoc) => ({
          id: requestDoc._id,
          source: "request" as const,
          citizenName:
            typeof requestDoc.citizen === "string"
              ? requestDoc.customerName
              : requestDoc.citizen?.name || requestDoc.customerName,
          amount: Number(requestDoc.totalEstimatedCost || 0),
          transactionId: requestDoc.payment?.transactionId || "-",
          paymentMethod: requestDoc.payment?.paymentMethod || "-",
          receiptUrl: requestDoc.payment?.receiptUrl || "",
          submittedAt: requestDoc.payment?.submittedAt || requestDoc.createdAt,
          status: requestDoc.payment?.status || "pending",
        })),
      ...issues
        .filter((issueDoc) => {
          if (user?.role !== "finance") return true;

          const assignedId = asId(issueDoc.assignedFinanceOfficer);

          // Backward compatibility: show legacy unassigned pending items too.
          return !assignedId || assignedId === currentUserId;
        })
        .filter((issueDoc) => issueDoc.payment)
        .map((issueDoc) => ({
          id: issueDoc._id,
          source: "issue" as const,
          citizenName:
            typeof issueDoc.citizen === "string"
              ? issueDoc.title
              : issueDoc.citizen?.name || issueDoc.title,
          amount: Number(issueDoc.totalEstimatedCost || 0),
          transactionId: issueDoc.payment?.transactionId || "-",
          paymentMethod: issueDoc.payment?.paymentMethod || "-",
          receiptUrl: issueDoc.payment?.receiptUrl || "",
          submittedAt:
            issueDoc.payment?.submittedAt || new Date().toISOString(),
          status: issueDoc.payment?.status || "pending",
        })),
    ],
    [currentUserId, issues, requests, user?.role],
  );

  const pendingRows = paymentRows.filter((row) => row.status === "pending");

  const handleFinanceAction = async (
    row: FinancePaymentRow,
    action: "verify" | "reject",
  ) => {
    try {
      setBusyKey(`${row.source}-${row.id}-${action}`);

      const path =
        row.source === "request"
          ? `/requests/request/${row.id}/payment/${action}`
          : `/issues/${row.id}/payment/${action}`;

      await apiRequest(path, {
        method: "PATCH",
        body:
          action === "verify"
            ? { note: "Finance verified payment" }
            : { rejectionReason: "Finance rejected payment" },
      });

      await loadPayments();
      openModal(
        action === "verify"
          ? "Payment verified successfully."
          : "Payment rejected successfully.",
        "/finance/dashboard",
      );
    } catch (error) {
      toast({
        title: "Payment action failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const totalRevenue = paymentRows
    .filter((row) => row.status === "verified")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingTotal = pendingRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Finance verification queue for request and issue payments
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Verified Revenue"
          value={`$${totalRevenue}`}
          icon={CheckCircle2}
          delay={0}
        />
        <StatCard
          title="Pending"
          value={`$${pendingTotal}`}
          icon={Clock}
          delay={0.05}
        />
        <StatCard
          title="Total Transactions"
          value={paymentRows.length}
          icon={DollarSign}
          delay={0.1}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingRows.length}
          icon={XCircle}
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Revenue Trend</h3>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(152, 69%, 40%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(152, 69%, 40%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(214, 20%, 90%)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="hsl(215, 13%, 50%)"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid hsl(214, 20%, 90%)",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(152, 69%, 40%)"
              fill="url(#revGrad)"
              strokeWidth={2}
              name="Revenue ($)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Citizen</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">
                Source
              </TableHead>
              <TableHead className="font-semibold hidden md:table-cell">
                Transaction
              </TableHead>
              <TableHead className="font-semibold hidden md:table-cell">
                Method
              </TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">
                Submitted
              </TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRows.map((row) => (
              <TableRow
                key={`${row.source}-${row.id}`}
                className="border-border/50 hover:bg-muted/30"
              >
                <TableCell className="font-mono text-sm">
                  {row.id.slice(-8).toUpperCase()}
                </TableCell>
                <TableCell>{row.citizenName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {row.source}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {row.transactionId}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {row.paymentMethod}
                </TableCell>
                <TableCell className="font-semibold">${row.amount}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {new Date(row.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {row.receiptUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => window.open(row.receiptUrl, "_blank")}
                      >
                        <Eye className="h-3.5 w-3.5" /> Receipt
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={busyKey === `${row.source}-${row.id}-verify`}
                      onClick={() => handleFinanceAction(row, "verify")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={busyKey === `${row.source}-${row.id}-reject`}
                      onClick={() => handleFinanceAction(row, "reject")}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

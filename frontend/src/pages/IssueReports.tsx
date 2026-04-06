import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IssueUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface IssueRecord {
  _id: string;
  title: string;
  category?: string;
  status: string;
  branch?: string;
  citizen?: string | IssueUser;
  assignedBranchOfficer?: string | IssueUser;
  assignedTechnician?: string | IssueUser;
  assignedFinanceOfficer?: string | IssueUser;
  totalEstimatedCost?: number;
  createdAt: string;
}

interface ToolDraft {
  code: string;
  description: string;
  source: string;
  quantity: number;
  unitPrice: number;
}

const defaultToolDraft: ToolDraft = {
  code: "",
  description: "",
  source: "store",
  quantity: 1,
  unitPrice: 1,
};

const statuses = [
  "all",
  "submitted",
  "approved",
  "waiting_payment",
  "payment_submitted",
  "payment_verified",
  "payment_rejected",
  "completed",
  "rejected",
] as const;

function userName(user: string | IssueUser | undefined) {
  if (!user) return "-";
  if (typeof user === "string") return user;
  return user.name || user.email || "-";
}

export default function IssueReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<(typeof statuses)[number]>("all");
  const [toolDraftByIssueId, setToolDraftByIssueId] = useState<
    Record<string, ToolDraft>
  >({});
  const [rejectIssueId, setRejectIssueId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadIssues = useCallback(async () => {
    try {
      const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await apiRequest<{ issues: IssueRecord[] }>(
        `/issues${query}`,
      );
      setIssues(response.issues || []);
    } catch (error) {
      toast({
        title: "Failed to load issues",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const stat = useMemo(() => {
    const submitted = issues.filter(
      (issue) => issue.status === "submitted",
    ).length;
    const approved = issues.filter(
      (issue) => issue.status === "approved",
    ).length;
    const payment = issues.filter(
      (issue) => issue.status === "payment_submitted",
    ).length;
    const completed = issues.filter(
      (issue) => issue.status === "completed",
    ).length;

    return { submitted, approved, payment, completed };
  }, [issues]);

  const mutateIssue = async (
    key: string,
    endpoint: string,
    body: Record<string, unknown> = {},
    successMessage: string,
  ) => {
    try {
      setBusyKey(key);
      await apiRequest(endpoint, { method: "PATCH", body });
      await loadIssues();
      openModal(successMessage, `/${user?.role}/dashboard`);
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const onCoordinatorApprove = (issueId: string) =>
    mutateIssue(
      `approve-${issueId}`,
      `/issues/${issueId}/approve`,
      { note: "Branch officer approved issue" },
      "Issue approved and assigned to technician.",
    );

  const onCoordinatorReject = (issueId: string, reason: string) =>
    mutateIssue(
      `reject-${issueId}`,
      `/issues/${issueId}/reject`,
      { note: reason },
      "Issue rejected successfully.",
    );

  const openRejectDialog = (issueId: string) => {
    setRejectIssueId(issueId);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectIssueId) return;

    const reason = rejectReason.trim();
    if (reason.length < 3) {
      toast({
        title: "Reject reason required",
        description: "Please provide at least 3 characters.",
        variant: "destructive",
      });
      return;
    }

    await onCoordinatorReject(rejectIssueId, reason);
    setRejectIssueId(null);
    setRejectReason("");
  };

  const onTechnicianCompleteWithoutTools = (issueId: string) =>
    mutateIssue(
      `complete-now-${issueId}`,
      `/issues/${issueId}/technician-update`,
      { note: "Resolved without additional tools", toolsRequired: [] },
      "Issue completed successfully.",
    );

  const onTechnicianRequestPayment = async (issueId: string) => {
    const toolDraft = toolDraftByIssueId[issueId] || defaultToolDraft;

    if (!toolDraft.code || !toolDraft.description || !toolDraft.source) {
      toast({
        title: "Tool details required",
        description: "Enter tool code, description, and source first.",
        variant: "destructive",
      });
      return;
    }

    if (toolDraft.quantity <= 0 || toolDraft.unitPrice <= 0) {
      toast({
        title: "Invalid quantity or price",
        description: "Quantity and unit price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    await mutateIssue(
      `request-payment-${issueId}`,
      `/issues/${issueId}/technician-update`,
      {
        note: "Tools required, waiting for citizen payment",
        toolsRequired: [toolDraft],
      },
      "Payment request sent to citizen.",
    );
  };

  const onTechnicianFinalize = (issueId: string) =>
    mutateIssue(
      `finalize-${issueId}`,
      `/issues/${issueId}/finalize`,
      { note: "Issue finalized after verified payment" },
      "Issue finalized successfully.",
    );

  const canCoordinatorAct = user?.role === "coordinator";
  const canRejectIssueRole =
    user?.role === "coordinator" ||
    user?.role === "director" ||
    user?.role === "admin";
  const canTechnicianAct = user?.role === "technician";
  const isFinance = user?.role === "finance";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Issue Reports Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Workflow visibility for branch officer, technician, and finance
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Label htmlFor="issue-status-filter" className="sr-only">
            Filter by issue status
          </Label>
          <select
            id="issue-status-filter"
            title="Issue status filter"
            aria-label="Issue status filter"
            className="w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as (typeof statuses)[number])
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.submitted}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.approved}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.payment}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.completed}
          </CardContent>
        </Card>
      </div>

      {issues.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            No issues found for this queue filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {issues.map((issue) => {
            const toolDraft = toolDraftByIssueId[issue._id] || defaultToolDraft;

            return (
              <Card key={issue._id} className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Issue ID</p>
                      <p className="font-mono text-sm">
                        {issue._id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                    <StatusBadge status={issue.status} />
                  </div>

                  <div>
                    <p className="font-medium text-sm">{issue.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {(issue.category || "general").replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>Citizen: {userName(issue.citizen)}</p>
                    <p>Branch: {issue.branch || "-"}</p>
                    <p>
                      Branch Officer: {userName(issue.assignedBranchOfficer)}
                    </p>
                    <p>Technician: {userName(issue.assignedTechnician)}</p>
                    <p>Finance: {userName(issue.assignedFinanceOfficer)}</p>
                    <p>
                      Submitted:{" "}
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {typeof issue.totalEstimatedCost === "number" &&
                  issue.totalEstimatedCost > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Estimated tools/payment: ${issue.totalEstimatedCost}
                    </p>
                  ) : null}

                  {canCoordinatorAct && issue.status === "submitted" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onCoordinatorApprove(issue._id)}
                        disabled={busyKey === `approve-${issue._id}`}
                      >
                        {busyKey === `approve-${issue._id}`
                          ? "Approving..."
                          : "Approve"}
                      </Button>
                    </div>
                  ) : null}

                  {canRejectIssueRole && issue.status === "submitted" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(issue._id)}
                        disabled={busyKey === `reject-${issue._id}`}
                      >
                        {busyKey === `reject-${issue._id}`
                          ? "Rejecting..."
                          : "Reject"}
                      </Button>
                    </div>
                  ) : null}

                  {canTechnicianAct && issue.status === "approved" ? (
                    <div className="space-y-3 rounded-md border border-border/70 p-3">
                      <p className="text-xs font-medium">Technician Actions</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`tool-code-${issue._id}`}>
                            Tool Code
                          </Label>
                          <Input
                            id={`tool-code-${issue._id}`}
                            value={toolDraft.code}
                            onChange={(event) =>
                              setToolDraftByIssueId((previous) => ({
                                ...previous,
                                [issue._id]: {
                                  ...toolDraft,
                                  code: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`tool-source-${issue._id}`}>
                            Source
                          </Label>
                          <Input
                            id={`tool-source-${issue._id}`}
                            value={toolDraft.source}
                            onChange={(event) =>
                              setToolDraftByIssueId((previous) => ({
                                ...previous,
                                [issue._id]: {
                                  ...toolDraft,
                                  source: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`tool-description-${issue._id}`}>
                          Description
                        </Label>
                        <Input
                          id={`tool-description-${issue._id}`}
                          value={toolDraft.description}
                          onChange={(event) =>
                            setToolDraftByIssueId((previous) => ({
                              ...previous,
                              [issue._id]: {
                                ...toolDraft,
                                description: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`tool-quantity-${issue._id}`}>
                            Quantity
                          </Label>
                          <Input
                            id={`tool-quantity-${issue._id}`}
                            type="number"
                            min={1}
                            value={toolDraft.quantity}
                            onChange={(event) =>
                              setToolDraftByIssueId((previous) => ({
                                ...previous,
                                [issue._id]: {
                                  ...toolDraft,
                                  quantity: Number(event.target.value || 1),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`tool-unit-price-${issue._id}`}>
                            Unit Price
                          </Label>
                          <Input
                            id={`tool-unit-price-${issue._id}`}
                            type="number"
                            min={1}
                            value={toolDraft.unitPrice}
                            onChange={(event) =>
                              setToolDraftByIssueId((previous) => ({
                                ...previous,
                                [issue._id]: {
                                  ...toolDraft,
                                  unitPrice: Number(event.target.value || 1),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            onTechnicianCompleteWithoutTools(issue._id)
                          }
                          disabled={busyKey === `complete-now-${issue._id}`}
                        >
                          {busyKey === `complete-now-${issue._id}`
                            ? "Completing..."
                            : "Complete Without Tools"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onTechnicianRequestPayment(issue._id)}
                          disabled={busyKey === `request-payment-${issue._id}`}
                        >
                          {busyKey === `request-payment-${issue._id}`
                            ? "Sending..."
                            : "Request Tools Payment"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {canTechnicianAct && issue.status === "payment_verified" ? (
                    <Button
                      size="sm"
                      onClick={() => onTechnicianFinalize(issue._id)}
                      disabled={busyKey === `finalize-${issue._id}`}
                    >
                      {busyKey === `finalize-${issue._id}`
                        ? "Finalizing..."
                        : "Finalize Issue"}
                    </Button>
                  ) : null}

                  {isFinance && issue.status === "payment_submitted" ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/payments">Open Payments Queue</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={rejectIssueId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectIssueId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="issue-reject-reason">Reason</Label>
            <Textarea
              id="issue-reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Write rejection reason for the citizen"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectIssueId(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmReject}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
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
import { Tool } from "@/types/tool";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  toolId: string;
  code: string;
  description: string;
  source: string;
  quantity: number;
  measurement: string;
  stockPrice: number;
  unitPrice: number;
}

const defaultToolDraft: ToolDraft = {
  toolId: "",
  code: "",
  description: "",
  source: "",
  quantity: 1,
  measurement: "",
  stockPrice: 0,
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
    Record<string, ToolDraft[]>
  >({});
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [openToolPickerKey, setOpenToolPickerKey] = useState<string | null>(
    null,
  );
  const [rejectIssueId, setRejectIssueId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const loadIssues = useCallback(async () => {
    try {
      const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await apiRequest<{ issues: IssueRecord[] }>(
        `/issues${query}`,
      );
      const fetchedIssues = response.issues || [];
      setIssues(
        statusFilter === "all"
          ? fetchedIssues.filter((issue) => issue.status !== "completed")
          : fetchedIssues,
      );
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

  useEffect(() => {
    if (user?.role !== "technician") return;

    const loadToolCatalog = async () => {
      try {
        setLoadingTools(true);
        const response = await apiRequest<{ tools: Tool[] }>(
          "/tools?limit=200&page=1",
        );
        setAvailableTools(response.tools || []);
      } catch (error) {
        toast({
          title: "Failed to load tools",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
      } finally {
        setLoadingTools(false);
      }
    };

    loadToolCatalog();
  }, [toast, user?.role]);

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
    const ongoing = issues.filter(
      (issue) => issue.status !== "completed",
    ).length;

    return { submitted, approved, payment, ongoing };
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

  const getIssueToolRows = (issueId: string) => {
    const rows = toolDraftByIssueId[issueId];
    return rows && rows.length > 0 ? rows : [defaultToolDraft];
  };

  const setIssueToolRows = (issueId: string, rows: ToolDraft[]) => {
    setToolDraftByIssueId((previous) => ({
      ...previous,
      [issueId]: rows,
    }));
  };

  const updateIssueToolRow = (
    issueId: string,
    index: number,
    key: keyof ToolDraft,
    value: string,
  ) => {
    const currentRows = getIssueToolRows(issueId);
    const nextRows = currentRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;

      if (key === "quantity" || key === "unitPrice" || key === "stockPrice") {
        const parsed = Number(value);
        return {
          ...row,
          [key]: Number.isFinite(parsed) ? parsed : 0,
        };
      }

      return {
        ...row,
        [key]: value,
      };
    });

    setIssueToolRows(issueId, nextRows);
  };

  const selectIssueToolRow = (issueId: string, index: number, tool: Tool) => {
    const currentRows = getIssueToolRows(issueId);
    const nextRows = currentRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return {
        ...row,
        toolId: tool._id,
        code: tool.code,
        description: tool.description,
        source: tool.source,
        measurement: tool.measurement,
        stockPrice: tool.stockPrice,
        unitPrice: tool.customerPrice,
      };
    });

    if (index === nextRows.length - 1) {
      nextRows.push({ ...defaultToolDraft });
    }

    setIssueToolRows(issueId, nextRows);
    setOpenToolPickerKey(null);
  };

  const addIssueToolRow = (issueId: string) => {
    const currentRows = getIssueToolRows(issueId);
    setIssueToolRows(issueId, [...currentRows, { ...defaultToolDraft }]);
  };

  const removeIssueToolRow = (issueId: string, index: number) => {
    const currentRows = getIssueToolRows(issueId);
    if (currentRows.length === 1) return;
    setIssueToolRows(
      issueId,
      currentRows.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const onTechnicianRequestPayment = async (issueId: string) => {
    const selectedTools = getIssueToolRows(issueId).filter(
      (tool) => tool.toolId.trim().length > 0,
    );

    if (selectedTools.length === 0) {
      toast({
        title: "Tool details required",
        description: "Please select at least one tool from the catalog.",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidTool = selectedTools.some(
      (tool) =>
        !tool.toolId.trim() ||
        !tool.code.trim() ||
        !tool.description.trim() ||
        !tool.source.trim() ||
        !Number.isFinite(tool.quantity) ||
        tool.quantity <= 0 ||
        !Number.isFinite(tool.unitPrice) ||
        tool.unitPrice <= 0,
    );

    if (hasInvalidTool) {
      toast({
        title: "Invalid quantity or price",
        description: "Each selected tool must have quantity and price > 0.",
        variant: "destructive",
      });
      return;
    }

    await mutateIssue(
      `request-payment-${issueId}`,
      `/issues/${issueId}/technician-update`,
      {
        note: "Tools required, waiting for citizen payment",
        toolsRequired: selectedTools.map((tool) => ({
          code: tool.code,
          description: tool.description,
          source: tool.source,
          quantity: tool.quantity,
          unitPrice: tool.unitPrice,
        })),
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
            <CardTitle className="text-sm">Ongoing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.ongoing}
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
            const toolRows = getIssueToolRows(issue._id);
            const grandTotal = toolRows.reduce(
              (sum, tool) => sum + tool.quantity * tool.unitPrice,
              0,
            );

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

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Tools / Materials</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => addIssueToolRow(issue._id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Row
                          </Button>
                        </div>

                        <div className="space-y-2 pb-1">
                          <div className="grid grid-cols-12 gap-1 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sm:text-[11px]">
                            <span className="col-span-3">Tool</span>
                            <span className="col-span-1">Code</span>
                            <span className="col-span-2">Source</span>
                            <span className="col-span-1">Qty</span>
                            <span className="col-span-1">Measure</span>
                            <span className="col-span-1">Stock</span>
                            <span className="col-span-1">Price</span>
                            <span className="col-span-2">Total</span>
                          </div>

                          {toolRows.map((tool, index) => {
                            const rowTotal = tool.quantity * tool.unitPrice;
                            const selectedToolIds = new Set(
                              toolRows
                                .filter(
                                  (row, rowIndex) =>
                                    rowIndex !== index && row.toolId,
                                )
                                .map((row) => row.toolId),
                            );
                            const pickerKey = `${issue._id}-${index}`;

                            return (
                              <div
                                key={`${tool.code}-${index}`}
                                className="grid grid-cols-12 gap-1 border rounded-md p-2"
                              >
                                <div className="col-span-3">
                                  <Popover
                                    open={openToolPickerKey === pickerKey}
                                    onOpenChange={(open) => {
                                      setOpenToolPickerKey(
                                        open ? pickerKey : null,
                                      );
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                      >
                                        <span className="truncate text-left">
                                          {tool.description || "Select tool"}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-[420px] p-0"
                                      align="start"
                                    >
                                      <Command>
                                        <CommandInput placeholder="Search tools (e.g. PVC)..." />
                                        <CommandList>
                                          <CommandEmpty>
                                            {loadingTools
                                              ? "Loading tools..."
                                              : "No tool found."}
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {availableTools.map(
                                              (catalogTool) => (
                                                <CommandItem
                                                  key={catalogTool._id}
                                                  value={`${catalogTool.code} ${catalogTool.description} ${catalogTool.source}`}
                                                  disabled={selectedToolIds.has(
                                                    catalogTool._id,
                                                  )}
                                                  onSelect={() =>
                                                    selectIssueToolRow(
                                                      issue._id,
                                                      index,
                                                      catalogTool,
                                                    )
                                                  }
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      tool.toolId ===
                                                        catalogTool._id
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                    )}
                                                  />
                                                  <span className="truncate">
                                                    {catalogTool.code} -{" "}
                                                    {catalogTool.description}
                                                  </span>
                                                </CommandItem>
                                              ),
                                            )}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                <div className="col-span-1 flex items-center text-xs font-medium text-muted-foreground">
                                  {tool.code || "-"}
                                </div>

                                <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                                  {tool.source || "-"}
                                </div>

                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Qty"
                                  value={tool.quantity}
                                  className="col-span-1"
                                  onChange={(event) =>
                                    updateIssueToolRow(
                                      issue._id,
                                      index,
                                      "quantity",
                                      event.target.value,
                                    )
                                  }
                                />

                                <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                                  {tool.measurement || "-"}
                                </div>

                                <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                                  {formatCurrency(tool.stockPrice)}
                                </div>

                                <Input
                                  type="number"
                                  min={1}
                                  step="0.01"
                                  placeholder="Unit price"
                                  value={tool.unitPrice}
                                  className="col-span-1"
                                  onChange={(event) =>
                                    updateIssueToolRow(
                                      issue._id,
                                      index,
                                      "unitPrice",
                                      event.target.value,
                                    )
                                  }
                                />

                                <div className="col-span-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(rowTotal)}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      removeIssueToolRow(issue._id, index)
                                    }
                                    disabled={toolRows.length === 1}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          Grand Total
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(grandTotal)}
                        </span>
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

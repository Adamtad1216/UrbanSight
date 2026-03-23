import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  UserPlus,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { NewConnectionRequest } from "@/types/request";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tool } from "@/types/tool";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { getDashboardPathByRole } from "@/lib/role-dashboard";
import { ApplicationDetailView } from "@/components/request/ApplicationDetailView";

type InspectionToolDraft = {
  toolId: string;
  code: string;
  description: string;
  source: string;
  quantity: number;
  measurement: string;
  stockPrice: number;
  customerUnitPrice: number;
};

const emptyToolDraft = (): InspectionToolDraft => ({
  toolId: "",
  code: "",
  description: "",
  source: "",
  quantity: 1,
  measurement: "",
  stockPrice: 0,
  customerUnitPrice: 0,
});

function getCitizenName(request: NewConnectionRequest) {
  return typeof request.citizen === "string"
    ? "Citizen"
    : request.citizen?.name;
}

function getAssignedStaffName(request: NewConnectionRequest) {
  const technicians = request.assignedTechnicians || [];
  const firstTechnician = technicians[0];

  const technicianName =
    typeof firstTechnician === "string" ? "Technician" : firstTechnician?.name;
  const surveyorName =
    typeof request.assignedSurveyor === "string"
      ? "Surveyor"
      : request.assignedSurveyor?.name;
  const financeOfficerName =
    typeof request.assignedFinanceOfficer === "string"
      ? "Finance Officer"
      : request.assignedFinanceOfficer?.name;
  const branchOfficerName =
    typeof request.assignedBranchOfficer === "string"
      ? "Branch Officer"
      : request.assignedBranchOfficer?.name;

  return (
    technicianName ||
    surveyorName ||
    financeOfficerName ||
    branchOfficerName ||
    "Unassigned"
  );
}

function asUserId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  const candidate = value as { id?: unknown; _id?: unknown };
  if (typeof candidate.id === "string") return candidate.id;
  if (typeof candidate._id === "string") return candidate._id;
  if (candidate.id) return String(candidate.id);
  if (candidate._id) return String(candidate._id);

  return String(value);
}

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [selected, setSelected] = useState<NewConnectionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionTools, setInspectionTools] = useState<InspectionToolDraft[]>(
    [emptyToolDraft()],
  );
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [openToolPickerRow, setOpenToolPickerRow] = useState<number | null>(null);

  const currentUserId = asUserId(
    user?.id || (user as unknown as { _id?: string })?._id,
  );

  const selectedBranchApprovalStage = selected?.branchApprovalStage || 0;
  const isBranchApproverRole =
    user?.role === "director" ||
    user?.role === "coordinator" ||
    user?.role === "admin";
  const isAssignedBranchReviewer =
    user?.role === "admin" ||
    asUserId(selected?.assignedBranchOfficer) === currentUserId;
  const canDoFirstBranchApproval =
    selected?.status === "under_review" && selectedBranchApprovalStage === 0;
  const canDoSecondBranchApproval =
    selected?.status === "under_review" &&
    selectedBranchApprovalStage === 1 &&
    selected?.payment?.status === "verified";
  const assignedTechnicianCount = selected?.assignedTechnicians?.length || 0;
  const completedTechnicianCount =
    selected?.implementationCompletion?.technicianCompletions?.length || 0;
  const canDoFinalBranchApproval =
    selected?.status === "approved" &&
    selectedBranchApprovalStage === 2 &&
    assignedTechnicianCount > 0 &&
    completedTechnicianCount >= assignedTechnicianCount;
  const canRejectByBranch =
    selected?.status === "under_review" && selectedBranchApprovalStage <= 1;

  useEffect(() => {
    if (!selected) return;

    setInspectionNotes(selected.inspection?.notes || "");
    if (selected.toolsRequired?.length) {
      setInspectionTools(
        selected.toolsRequired.map((tool) => ({
          toolId: tool.toolId || "",
          code: tool.code || "",
          description: tool.description || "",
          source: tool.source || "",
          quantity: tool.quantity || 1,
          measurement: tool.measurement || "",
          stockPrice: tool.stockPrice || 0,
          customerUnitPrice: tool.customerUnitPrice || 0,
        })),
      );
      return;
    }

    setInspectionTools([emptyToolDraft()]);
  }, [selected]);

  const updateInspectionTool = (
    index: number,
    key: keyof InspectionToolDraft,
    value: string,
  ) => {
    setInspectionTools((previous) =>
      previous.map((tool, rowIndex) => {
        if (rowIndex !== index) return tool;
        if (key === "quantity") {
          const parsedQuantity = Number(value);
          return {
            ...tool,
            [key]: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
          };
        }

        return {
          ...tool,
          [key]: value,
        };
      }),
    );
  };

  const selectInspectionTool = (index: number, tool: Tool) => {
    setInspectionTools((previous) => {
      const next = previous.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return {
          ...row,
          toolId: tool._id,
          code: tool.code,
          description: tool.description,
          source: tool.source,
          measurement: tool.measurement,
          stockPrice: tool.stockPrice,
          customerUnitPrice: tool.customerPrice,
        };
      });

      const isLastRow = index === next.length - 1;
      if (isLastRow) {
        next.push(emptyToolDraft());
      }

      return next;
    });
    setOpenToolPickerRow(null);
  };

  const addInspectionToolRow = () => {
    setInspectionTools((previous) => [...previous, emptyToolDraft()]);
  };

  const removeInspectionToolRow = (index: number) => {
    setInspectionTools((previous) => {
      if (previous.length === 1) return previous;
      return previous.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const inspectionGrandTotal = useMemo(
    () =>
      inspectionTools.reduce(
        (sum, tool) => sum + tool.quantity * tool.customerUnitPrice,
        0,
      ),
    [inspectionTools],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const handleActionError = useCallback(
    (title: string, error: unknown) => {
      toast({
        title,
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    },
    [toast],
  );

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
        "/requests",
      );
      setRequests(response.requests);
    } catch (error) {
      handleActionError("Failed to load requests", error);
    } finally {
      setLoading(false);
    }
  }, [handleActionError]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (user?.role !== "surveyor") return;

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

  const isVisibleToCurrentRole = useCallback(
    (requestDoc: NewConnectionRequest) => {
      const branchStage = requestDoc.branchApprovalStage || 0;
      const assignedSurveyorId = asUserId(requestDoc.assignedSurveyor);
      const assignedTechnicianIds = (requestDoc.assignedTechnicians || []).map(
        asUserId,
      );
      const assignedTechnicianCount = requestDoc.assignedTechnicians?.length || 0;
      const completedTechnicianCount =
        requestDoc.implementationCompletion?.technicianCompletions?.length || 0;
      const isReadyForBranchFinalApproval =
        requestDoc.workflowLogs?.some(
          (entry) => entry.action === "implementation_ready_for_final_branch_approval",
        ) || false;
      const assignedFinanceId = asUserId(requestDoc.assignedFinanceOfficer);
      const assignedMeterReaderId = asUserId(requestDoc.assignedMeterReader);

      if (user?.role === "surveyor") {
        return (
          requestDoc.status === "inspection" &&
          branchStage >= 1 &&
          assignedSurveyorId === currentUserId
        );
      }

      if (user?.role === "technician") {
        const allTechniciansCompleted =
          assignedTechnicianCount > 0 &&
          completedTechnicianCount >= assignedTechnicianCount;

        return (
          requestDoc.status === "approved" &&
          assignedTechnicianIds.includes(currentUserId) &&
          !allTechniciansCompleted &&
          !isReadyForBranchFinalApproval
        );
      }

      if (user?.role === "finance") {
        return (
          requestDoc.status === "payment_submitted" &&
          assignedFinanceId === currentUserId
        );
      }

      if (user?.role === "meter_reader") {
        return assignedMeterReaderId === currentUserId;
      }

      return true;
    },
    [currentUserId, user?.role],
  );

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const requestId = r._id.toLowerCase();
        const citizenName =
          typeof r.citizen === "string"
            ? ""
            : r.citizen?.name?.toLowerCase() || "";
        const matchSearch =
          requestId.includes(search.toLowerCase()) ||
          citizenName.includes(search.toLowerCase()) ||
          r.serviceType.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || r.status === statusFilter;
        return matchSearch && matchStatus && isVisibleToCurrentRole(r);
      }),
    [requests, search, statusFilter, isVisibleToCurrentRole],
  );

  const runRequestAction = async (
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
    errorTitle: string,
  ) => {
    if (!selected) return;

    try {
      await apiRequest(path, {
        method: "PATCH",
        body,
      });
      await loadRequests();
      openModal(successMessage, getDashboardPathByRole(user?.role));
    } catch (error) {
      handleActionError(errorTitle, error);
    }
  };

  const updateStatus = async (status: string, note: string) => {
    if (!selected) return;
    await runRequestAction(
      `/requests/${selected._id}/status`,
      { status, note },
      "Status updated",
      "Action failed",
    );
  };

  const approveByBranchOfficer = async () => {
    if (!selected) return;

    let note = "Branch coordinator approved request";
    if (canDoFirstBranchApproval) {
      note = "Branch coordinator first approval and surveyor assignment";
    } else if (canDoSecondBranchApproval) {
      note =
        "Branch coordinator second approval and implementation team assignment";
    } else if (canDoFinalBranchApproval) {
      note = "Branch coordinator final approval and meter reader assignment";
    }

    await runRequestAction(
      `/requests/request/${selected._id}/branch-officer/approve`,
      { note },
      "Branch approval completed successfully.",
      "Branch approval failed",
    );
  };

  const approveByDirector = async () => {
    if (!selected) return;
    await runRequestAction(
      `/requests/request/${selected._id}/approve`,
      { note: "Director approved request" },
      "Request approved successfully.",
      "Action failed",
    );
  };

  const rejectByDirector = async () => {
    if (!selected) return;
    await runRequestAction(
      `/requests/request/${selected._id}/reject`,
      { note: "Director rejected request" },
      "Request rejected successfully.",
      "Action failed",
    );
  };

  const rejectByBranchOfficer = async () => {
    if (!selected) return;
    await runRequestAction(
      `/requests/request/${selected._id}/branch-officer/reject`,
      { note: "Branch officer rejected request" },
      "Request rejected successfully.",
      "Action failed",
    );
  };

  const submitInspection = async () => {
    if (!selected) return;

    const selectedTools = inspectionTools.filter((tool) => tool.toolId.trim().length > 0);

    if (selectedTools.length === 0) {
      toast({
        title: "Tools required",
        description: "Please select at least one tool.",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidTools = selectedTools.some(
      (tool) =>
        !tool.toolId.trim() ||
        !Number.isFinite(tool.quantity) ||
        tool.quantity <= 0,
    );

    if (hasInvalidTools) {
      toast({
        title: "Invalid tools",
        description: "Please select active tools and set quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (inspectionNotes.trim().length < 3) {
      toast({
        title: "Inspection notes required",
        description: "Please add at least 3 characters for notes.",
        variant: "destructive",
      });
      return;
    }

    await runRequestAction(
      `/requests/request/${selected._id}/inspection`,
      {
        notes: inspectionNotes,
        toolsRequired: selectedTools.map((tool) => ({
          toolId: tool.toolId,
          quantity: tool.quantity,
        })),
      },
      "Inspection submitted. Waiting for customer payment.",
      "Inspection update failed",
    );
  };

  const submitTechnicalUpdate = async () => {
    if (!selected) return;

    const assignedTechnicianIds = (selected.assignedTechnicians || []).map(asUserId);
    const completedTechnicianIds =
      selected.implementationCompletion?.technicianCompletions?.map((entry) =>
        asUserId(entry.technician),
      ) || [];

    const alreadyCompletedByCurrentTechnician = completedTechnicianIds.includes(
      currentUserId,
    );

    if (alreadyCompletedByCurrentTechnician) {
      const pending = Math.max(
        assignedTechnicianIds.length - completedTechnicianIds.length,
        0,
      );
      toast({
        title: "Implementation already submitted",
        description:
          pending > 0
            ? `Waiting for ${pending} technician(s) approval.`
            : "All technician approvals are completed. Waiting branch officer final approval.",
      });
      return;
    }

    try {
      const response = await apiRequest<{ request: NewConnectionRequest }>(
        `/requests/request/${selected._id}/complete`,
        {
          method: "PATCH",
          body: {
            note: "Technician marked implementation complete",
          },
        },
      );

      await loadRequests();
      setSelected(response.request);

      const totalTechnicians = response.request.assignedTechnicians?.length || 0;
      const completedTechnicians =
        response.request.implementationCompletion?.technicianCompletions?.length || 0;
      const pending = Math.max(totalTechnicians - completedTechnicians, 0);

      if (pending > 0) {
        toast({
          title: "Implementation submitted",
          description: `Waiting for ${pending} technician(s) approval.`,
        });
      } else {
        openModal(
          "All technicians approved. Workflow moved for branch final approval.",
          getDashboardPathByRole(user?.role),
        );
      }
    } catch (error) {
      handleActionError("Technical update failed", error);
    }
  };

  const hasCompletableTask = (requestDoc: NewConnectionRequest) => {
    const branchStage = requestDoc.branchApprovalStage || 0;
    const assignedBranchOfficerId = asUserId(requestDoc.assignedBranchOfficer);
    const isBranchApprover =
      user?.role === "coordinator" ||
      user?.role === "director" ||
      user?.role === "admin";
    const canReviewBranch =
      user?.role === "admin" || assignedBranchOfficerId === currentUserId;
    const assignedTechnicianIds = (requestDoc.assignedTechnicians || []).map(
      asUserId,
    );
    const assignedTechnicianCount = requestDoc.assignedTechnicians?.length || 0;
    const completedTechnicianCount =
      requestDoc.implementationCompletion?.technicianCompletions?.length || 0;
    const isReadyForBranchFinalApproval =
      requestDoc.workflowLogs?.some(
        (entry) => entry.action === "implementation_ready_for_final_branch_approval",
      ) || false;
    const assignedSurveyorId = asUserId(requestDoc.assignedSurveyor);
    const assignedFinanceId = asUserId(requestDoc.assignedFinanceOfficer);

    if (
      (user?.role === "director" || user?.role === "admin") &&
      requestDoc.status === "submitted"
    ) {
      return true;
    }

    if (
      isBranchApprover &&
      canReviewBranch &&
      ((requestDoc.status === "under_review" && branchStage === 0) ||
        (requestDoc.status === "under_review" &&
          branchStage === 1 &&
          requestDoc.payment?.status === "verified") ||
        (requestDoc.status === "approved" &&
          branchStage === 2 &&
          assignedTechnicianCount > 0 &&
          completedTechnicianCount >= assignedTechnicianCount) ||
        (requestDoc.status === "under_review" && branchStage <= 1))
    ) {
      return true;
    }

    if (
      user?.role === "surveyor" &&
      requestDoc.status === "inspection" &&
      branchStage >= 1 &&
      assignedSurveyorId === currentUserId
    ) {
      return true;
    }

    if (
      user?.role === "technician" &&
      requestDoc.status === "approved" &&
      assignedTechnicianIds.includes(currentUserId)
    ) {
      const totalTechnicians = requestDoc.assignedTechnicians?.length || 0;
      const completedTechnicians =
        requestDoc.implementationCompletion?.technicianCompletions?.length || 0;

      // Keep visible until both technicians complete; hide once workflow is ready for branch final approval.
      return !(
        (totalTechnicians > 0 && completedTechnicians >= totalTechnicians) ||
        isReadyForBranchFinalApproval
      );
    }

    if (
      user?.role === "finance" &&
      requestDoc.status === "payment_submitted" &&
      assignedFinanceId === currentUserId
    ) {
      return true;
    }

    return false;
  };

  const openWorkTask = (requestDoc: NewConnectionRequest) => {
    if (user?.role === "finance") {
      navigate("/payments");
      return;
    }

    void openRequestDetail(requestDoc);
  };

  const openRequestDetail = async (requestDoc: NewConnectionRequest) => {
    try {
      const response = await apiRequest<{ request: NewConnectionRequest }>(
        `/requests/${requestDoc._id}`,
      );
      setSelected(response.request);
    } catch {
      // Fallback to list payload if detail fetch fails.
      setSelected(requestDoc);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Service Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage citizen service requests
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-muted/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="waiting_payment">Waiting Payment</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Citizen</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">
                Service
              </TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">
                Location
              </TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">
                Assigned
              </TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r._id}
                  className="border-border/50 hover:bg-muted/30 cursor-pointer"
                  onClick={() => {
                    void openRequestDetail(r);
                  }}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {r._id.slice(-8).toUpperCase()}
                  </TableCell>
                  <TableCell>{getCitizenName(r)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {r.serviceType}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {r.readingZone}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {getAssignedStaffName(r)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openRequestDetail(r);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {hasCompletableTask(r) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openWorkTask(r);
                          }}
                        >
                          Work Task
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="w-[99vw] max-w-[98vw] max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">
                    {selected._id.slice(-8).toUpperCase()}
                  </span>
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <ApplicationDetailView request={selected} showAssignedStaff />

                {(user?.role === "director" || user?.role === "admin") &&
                  selected.status === "submitted" && (
                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={approveByDirector}
                      >
                        {" "}
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive"
                        onClick={rejectByDirector}
                      >
                        {" "}
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}

                {isBranchApproverRole &&
                  isAssignedBranchReviewer &&
                  (canDoFirstBranchApproval ||
                    canDoSecondBranchApproval ||
                    canDoFinalBranchApproval ||
                    canRejectByBranch) && (
                    <div className="flex gap-2 pt-2 flex-wrap">
                      {(canDoFirstBranchApproval ||
                        canDoSecondBranchApproval ||
                        canDoFinalBranchApproval) && (
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={approveByBranchOfficer}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {canDoFirstBranchApproval &&
                            " First Approval (Assign Surveyor)"}
                          {canDoSecondBranchApproval &&
                            " Second Approval (Assign Implementation Team)"}
                          {canDoFinalBranchApproval &&
                            " Final Approval (Close & Assign Meter Reader)"}
                        </Button>
                      )}
                      {canRejectByBranch && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive"
                          onClick={rejectByBranchOfficer}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      )}
                    </div>
                  )}

                {user?.role === "surveyor" && hasCompletableTask(selected) && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <Label className="text-sm">Inspection Form</Label>
                    <div className="space-y-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Site inspection details"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Tools / Materials</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={addInspectionToolRow}
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
                          <span className="col-span-1">Measurement</span>
                          <span className="col-span-1">Stock Price</span>
                          <span className="col-span-1">Customer Price</span>
                          <span className="col-span-2">Total Price</span>
                        </div>
                        {inspectionTools.map((tool, index) => {
                          const rowTotal =
                            tool.quantity * tool.customerUnitPrice;
                          const selectedToolIds = new Set(
                            inspectionTools
                              .filter((row, rowIndex) => rowIndex !== index && row.toolId)
                              .map((row) => row.toolId),
                          );
                          return (
                            <div
                              key={`${tool.code}-${index}`}
                              className="grid grid-cols-12 gap-1 border rounded-md p-2"
                            >
                              <div className="col-span-3">
                                <Popover
                                  open={openToolPickerRow === index}
                                  onOpenChange={(open) => {
                                    setOpenToolPickerRow(open ? index : null);
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
                                  <PopoverContent className="w-[420px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search tools (e.g. PVC)..." />
                                      <CommandList>
                                        <CommandEmpty>
                                          {loadingTools ? "Loading tools..." : "No tool found."}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {availableTools.map((catalogTool) => (
                                            <CommandItem
                                              key={catalogTool._id}
                                              value={`${catalogTool.code} ${catalogTool.description} ${catalogTool.source}`}
                                              disabled={selectedToolIds.has(catalogTool._id)}
                                              onSelect={() =>
                                                selectInspectionTool(index, catalogTool)
                                              }
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  tool.toolId === catalogTool._id
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                                )}
                                              />
                                              <span className="truncate">
                                                {catalogTool.code} - {catalogTool.description}
                                              </span>
                                            </CommandItem>
                                          ))}
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
                                onChange={(e) =>
                                  updateInspectionTool(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                              />

                              <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                                {tool.measurement || "-"}
                              </div>

                              <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                                {formatCurrency(tool.stockPrice)}
                              </div>

                              <div className="col-span-1 flex items-center text-xs text-muted-foreground">
                                {formatCurrency(tool.customerUnitPrice)}
                              </div>

                              <div className="col-span-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {formatCurrency(rowTotal)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeInspectionToolRow(index)}
                                  disabled={inspectionTools.length === 1}
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
                      <span className="text-muted-foreground">Grand Total</span>
                      <span className="font-semibold">
                        {formatCurrency(inspectionGrandTotal)}
                      </span>
                    </div>

                    <Button size="sm" onClick={submitInspection}>
                      Submit Inspection Report
                    </Button>
                  </div>
                )}

                {user?.role === "technician" && hasCompletableTask(selected) && (
                  <div className="space-y-2">
                    {(() => {
                      const assignedTechnicianIds =
                        (selected.assignedTechnicians || []).map(asUserId);
                      const completedTechnicianIds =
                        selected.implementationCompletion?.technicianCompletions?.map(
                          (entry) => asUserId(entry.technician),
                        ) || [];
                      const alreadyCompletedByCurrentTechnician = completedTechnicianIds.includes(
                        currentUserId,
                      );
                      const pending = Math.max(
                        assignedTechnicianIds.length - completedTechnicianIds.length,
                        0,
                      );

                      return (
                        <>
                          <Button
                            size="sm"
                            onClick={submitTechnicalUpdate}
                            disabled={alreadyCompletedByCurrentTechnician}
                          >
                            {alreadyCompletedByCurrentTechnician
                              ? "Submitted"
                              : "Update Technical Progress"}
                          </Button>
                          {alreadyCompletedByCurrentTechnician && pending > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Waiting for second technician approval.
                            </p>
                          )}
                          {alreadyCompletedByCurrentTechnician && pending === 0 && (
                            <p className="text-sm text-muted-foreground">
                              All technicians approved. Waiting branch officer final approval.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

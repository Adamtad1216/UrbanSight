import { IssueReport } from "../models/IssueReport.js";
import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import {
  roles,
  terminalIssueStatuses,
  terminalRequestStatuses,
} from "../utils/constants.js";
import { sendError, sendOk } from "../utils/response.js";
import {
  appendWorkflowLog,
  assertValidTransition,
} from "../services/workflowService.js";
import { getLeastLoadedUser } from "../services/assignmentService.js";
import { notificationService } from "../services/notificationService.js";
import { uploadBufferToCloudinary } from "../services/cloudinaryUploadService.js";
import { User } from "../models/User.js";

function ensureActorIsActive(req, res) {
  if (req.user.status !== "active" || !req.user.isActive) {
    sendError(res, 403, "Inactive users cannot perform this action");
    return false;
  }

  return true;
}

async function getIssueOr404(issueId, res) {
  const issue = await IssueReport.findById(issueId);
  if (!issue) {
    sendError(res, 404, "Issue not found");
    return null;
  }

  return issue;
}

function isBranchScopedStaffRole(role) {
  return (
    role !== roles.CITIZEN && role !== roles.ADMIN && role !== roles.DIRECTOR
  );
}

function ensureStaffCanAccessIssueBranch(req, res, issue) {
  if (!isBranchScopedStaffRole(req.user.role)) {
    return true;
  }

  if (!req.user.branch) {
    sendError(res, 403, "Staff branch is not configured");
    return false;
  }

  if (req.user.branch !== issue.branch) {
    sendError(res, 403, "You can only access issues from your branch");
    return false;
  }

  return true;
}

function transitionIssueStatus({ issue, nextStatus, action, note, req, meta }) {
  assertValidTransition({
    type: "issue",
    fromStatus: issue.status,
    toStatus: nextStatus,
  });

  const previousStatus = issue.status;
  issue.status = nextStatus;
  appendWorkflowLog(issue, {
    action,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    note,
    actor: req.user._id,
    actorRole: req.user.role,
    meta,
  });
}

export async function createIssue(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const [activeRequest, activeIssue] = await Promise.all([
    NewConnectionRequest.findOne({
      citizen: req.user._id,
      status: { $nin: terminalRequestStatuses },
    })
      .select("_id")
      .lean(),
    IssueReport.findOne({
      citizen: req.user._id,
      status: { $nin: terminalIssueStatuses },
    })
      .select("_id")
      .lean(),
  ]);

  if (activeRequest || activeIssue) {
    return sendError(
      res,
      409,
      "You already have an active application. Complete or close it before submitting a new one.",
    );
  }

  const waterConnectionCode = String(req.body.waterConnectionCode || "")
    .trim()
    .toUpperCase();
  const customerCode = String(req.body.customerCode || "")
    .trim()
    .toUpperCase();

  const matchedConnection = await NewConnectionRequest.findOne({
    citizen: req.user._id,
    status: "completed",
    waterConnectionCode,
    customerCode,
  })
    .select("_id branch")
    .lean();

  if (!matchedConnection) {
    return sendError(
      res,
      400,
      "Invalid Water Connection Code or Customer Code for this account",
    );
  }

  const assignedBranchOfficer = await getLeastLoadedUser(roles.COORDINATOR, {
    branch: matchedConnection.branch,
  });

  const issue = await IssueReport.create({
    ...req.body,
    waterConnectionCode,
    customerCode,
    branch: matchedConnection.branch,
    assignedBranchOfficer,
    citizen: req.user._id,
    status: "submitted",
    workflowLogs: [
      {
        action: "submit_issue",
        toStatus: "submitted",
        note: "Citizen submitted issue report",
        actor: req.user._id,
        actorRole: req.user.role,
      },
    ],
  });

  if (assignedBranchOfficer) {
    await notificationService.notify({
      recipientId: assignedBranchOfficer,
      message: "A new issue report is waiting for your branch review",
      context: { issueId: issue._id, service: "issue_reporting" },
    });
  }

  return sendOk(res, { issue }, 201);
}

export async function listMyIssues(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issues = await IssueReport.find({ citizen: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  return sendOk(res, { issues });
}

export async function listIssues(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  if (isBranchScopedStaffRole(req.user.role)) {
    query.branch = req.user.branch;
  }

  if (req.user.role === roles.COORDINATOR) {
    query.assignedBranchOfficer = req.user._id;
  }

  if (req.user.role === roles.TECHNICIAN) {
    query.assignedTechnician = req.user._id;
  }

  if (req.user.role === roles.FINANCE) {
    query.assignedFinanceOfficer = req.user._id;
  }

  const issues = await IssueReport.find(query)
    .populate("citizen", "name email phone")
    .populate("assignedBranchOfficer", "name email role status branch")
    .populate("assignedTechnician", "name email role status")
    .populate("assignedFinanceOfficer", "name email role status branch")
    .sort({ createdAt: -1 })
    .lean();

  return sendOk(res, { issues });
}

export async function approveIssue(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  const isAssignedBranchOfficer =
    issue.assignedBranchOfficer &&
    String(issue.assignedBranchOfficer) === String(req.user._id);
  const canApproveUnassignedIssue =
    !issue.assignedBranchOfficer &&
    req.user.role === roles.COORDINATOR &&
    req.user.branch === issue.branch;

  if (!isAssignedBranchOfficer && !canApproveUnassignedIssue) {
    return sendError(
      res,
      403,
      "Only assigned branch officer can approve this issue",
    );
  }

  if (!issue.assignedBranchOfficer) {
    issue.assignedBranchOfficer = req.user._id;
  }

  if (issue.status !== "submitted") {
    return sendError(
      res,
      400,
      "Only submitted issues can be reviewed by branch officer",
    );
  }

  const technician = await getLeastLoadedUser(roles.TECHNICIAN, {
    branch: issue.branch,
  });
  if (technician) {
    issue.assignedTechnician = technician;
  }

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "approved",
      action: "coordinator_approved_issue",
      note:
        req.body.note ||
        (technician
          ? "Coordinator approved issue and assigned technician"
          : "Coordinator approved issue; waiting for manual technician assignment"),
      req,
      meta: { assignedTechnician: technician },
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  if (technician) {
    await notificationService.notify({
      recipientId: technician,
      message: "You have been assigned a new issue",
      context: { issueId: issue._id, service: "issue_reporting" },
    });
  }

  await notificationService.notify({
    recipientId: issue.citizen,
    message: "Your issue was approved and assigned to a technician",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function rejectIssue(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  const isAssignedBranchOfficer =
    issue.assignedBranchOfficer &&
    String(issue.assignedBranchOfficer) === String(req.user._id);
  const canRejectAsSenior = [roles.ADMIN, roles.DIRECTOR].includes(
    req.user.role,
  );

  if (!isAssignedBranchOfficer && !canRejectAsSenior) {
    return sendError(
      res,
      403,
      "Only assigned branch officer can reject this issue",
    );
  }

  if (issue.status !== "submitted") {
    return sendError(
      res,
      400,
      "Only submitted issues can be rejected by branch officer",
    );
  }

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "rejected",
      action: "branch_officer_rejected_issue",
      note: req.body.note || "Branch officer rejected issue",
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  await notificationService.notify({
    recipientId: issue.citizen,
    message: "Your issue was rejected by branch officer",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function technicianUpdate(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  if (String(issue.assignedTechnician) !== String(req.user._id)) {
    return sendError(
      res,
      403,
      "Only assigned technician can update this issue",
    );
  }

  const toolsRequired = (req.body.toolsRequired || []).map((tool) => ({
    ...tool,
    totalPrice: Number(tool.quantity) * Number(tool.unitPrice),
  }));
  const totalEstimatedCost = toolsRequired.reduce(
    (sum, tool) => sum + tool.totalPrice,
    0,
  );

  if (toolsRequired.length) {
    issue.toolsRequired = toolsRequired;
    issue.totalEstimatedCost = totalEstimatedCost;
    try {
      transitionIssueStatus({
        issue,
        nextStatus: "waiting_payment",
        action: "tools_required",
        note: req.body.note || "Technician requested tools payment",
        req,
        meta: { toolsRequired, totalEstimatedCost },
      });
    } catch (error) {
      return sendError(res, 400, error.message);
    }

    await issue.save();

    notificationService.notify({
      recipientId: issue.citizen,
      message: "Please complete payment for required tools",
      context: { issueId: issue._id, service: "issue_reporting" },
    });

    return sendOk(res, { issue });
  }

  issue.resolutionNotes =
    req.body.note || "Issue resolved without additional tools";

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "completed",
      action: "issue_fixed",
      note: issue.resolutionNotes,
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();
  return sendOk(res, { issue });
}

export async function submitIssuePayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (String(issue.citizen) !== String(req.user._id)) {
    return sendError(
      res,
      403,
      "You can only submit payment for your own issue",
    );
  }

  if (issue.status !== "waiting_payment") {
    return sendError(
      res,
      400,
      "Payment can only be submitted when issue is waiting for payment",
    );
  }

  if (!req.file) {
    return sendError(res, 400, "Receipt file is required");
  }

  let uploadResult;
  try {
    uploadResult = await uploadBufferToCloudinary(
      req.file,
      "urbansight/issue-receipts",
    );
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error ? error.message : "Receipt upload failed",
    );
  }

  const submittedAt = new Date();

  issue.payment = {
    transactionId: req.body.transactionId,
    paymentMethod: req.body.paymentMethod,
    receiptUrl: uploadResult.secure_url,
    submittedAt,
    status: "pending",
  };

  const assignedFinanceOfficer = await getLeastLoadedUser(roles.FINANCE, {
    branch: issue.branch,
  });
  if (!assignedFinanceOfficer) {
    return sendError(
      res,
      400,
      "No active finance officer available for this branch",
    );
  }

  issue.assignedFinanceOfficer = assignedFinanceOfficer;

  issue.paymentInfo = {
    ...issue.paymentInfo,
    transactionId: req.body.transactionId,
    method: req.body.paymentMethod,
    receiptImage: uploadResult.secure_url,
    status: "submitted",
    submittedAt,
    rejectionReason: "",
  };

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "payment_submitted",
      action: "issue_payment_submitted",
      note: "Citizen submitted payment for issue",
      req,
      meta: {
        transactionId: req.body.transactionId,
        paymentMethod: req.body.paymentMethod,
        receiptUrl: uploadResult.secure_url,
        assignedFinanceOfficer,
      },
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  await notificationService.notify({
    recipientId: assignedFinanceOfficer,
    message: "New payment submitted for verification",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function verifyIssuePayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  if (issue.status !== "payment_submitted") {
    return sendError(res, 400, "Only payment_submitted issues can be verified");
  }

  if (
    issue.assignedFinanceOfficer &&
    String(issue.assignedFinanceOfficer) !== String(req.user._id)
  ) {
    return sendError(
      res,
      403,
      "Only assigned finance officer can verify this payment",
    );
  }

  if (!issue.assignedFinanceOfficer) {
    issue.assignedFinanceOfficer = req.user._id;
  }

  issue.payment = {
    ...issue.payment,
    status: "verified",
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
  };

  issue.paymentInfo = {
    ...issue.paymentInfo,
    status: "verified",
    verifiedAt: new Date(),
    rejectionReason: "",
  };

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "payment_verified",
      action: "issue_payment_verified",
      note: req.body.note || "Finance verified issue payment",
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  await notificationService.notify({
    recipientId: issue.assignedTechnician,
    message: "Issue payment verified. Please proceed and finalize ground work.",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function rejectIssuePayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  if (issue.status !== "payment_submitted") {
    return sendError(res, 400, "Only payment_submitted issues can be rejected");
  }

  if (
    issue.assignedFinanceOfficer &&
    String(issue.assignedFinanceOfficer) !== String(req.user._id)
  ) {
    return sendError(
      res,
      403,
      "Only assigned finance officer can reject this payment",
    );
  }

  if (!issue.assignedFinanceOfficer) {
    issue.assignedFinanceOfficer = req.user._id;
  }

  issue.payment = {
    ...issue.payment,
    status: "rejected",
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
  };

  issue.paymentInfo = {
    ...issue.paymentInfo,
    status: "rejected",
    verifiedAt: new Date(),
    rejectionReason: req.body.rejectionReason,
  };

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "payment_rejected",
      action: "issue_payment_rejected",
      note: req.body.rejectionReason,
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  await notificationService.notify({
    recipientId: issue.citizen,
    message: `Payment rejected: ${req.body.rejectionReason}`,
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function finalizeIssueFix(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  if (String(issue.assignedTechnician) !== String(req.user._id)) {
    return sendError(res, 403, "Only assigned technician can finalize issue");
  }

  if (!["approved", "payment_verified"].includes(issue.status)) {
    return sendError(
      res,
      400,
      "Issue can be finalized only after approval or verified payment",
    );
  }

  issue.resolutionNotes =
    req.body.note || issue.resolutionNotes || "Issue resolved after payment";

  try {
    transitionIssueStatus({
      issue,
      nextStatus: "completed",
      action: "issue_finalized",
      note: issue.resolutionNotes,
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await issue.save();

  await notificationService.notify({
    recipientId: issue.citizen,
    message: "Your reported issue has been resolved and completed",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

export async function assignIssueTechnician(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const issue = await getIssueOr404(req.params.id, res);
  if (!issue) return;

  if (!ensureStaffCanAccessIssueBranch(req, res, issue)) return;

  const technicianId = req.body?.technicianId;
  if (!technicianId) {
    return sendError(res, 400, "technicianId is required");
  }

  const technician = await User.findById(technicianId)
    .select("_id role branch status isActive")
    .lean();

  if (
    !technician ||
    technician.role !== roles.TECHNICIAN ||
    technician.branch !== issue.branch ||
    technician.status !== "active" ||
    !technician.isActive
  ) {
    return sendError(res, 400, "Invalid technician assignment");
  }

  issue.assignedTechnician = technician._id;

  appendWorkflowLog(issue, {
    action: "manual_issue_assignment",
    fromStatus: issue.status,
    toStatus: issue.status,
    note: "Coordinator manually assigned technician",
    actor: req.user._id,
    actorRole: req.user.role,
    meta: { technicianId: technician._id },
  });

  await issue.save();

  await notificationService.notify({
    recipientId: technician._id,
    message: "You have been manually assigned a new issue",
    context: { issueId: issue._id, service: "issue_reporting" },
  });

  return sendOk(res, { issue });
}

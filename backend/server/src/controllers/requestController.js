import { NewConnectionRequest } from "../models/NewConnectionRequest.js";
import { Tool } from "../models/Tool.js";
import { Configuration } from "../models/Configuration.js";
import { User } from "../models/User.js";
import { roles } from "../utils/constants.js";
import { sendError, sendOk } from "../utils/response.js";
import {
  appendWorkflowLog,
  assertValidTransition,
} from "../services/workflowService.js";
import {
  getLeastLoadedUser,
  getLeastLoadedUsers,
} from "../services/assignmentService.js";
import { notificationService } from "../services/notificationService.js";
import { uploadBufferToCloudinary } from "../services/cloudinaryUploadService.js";

async function getRequiredTechniciansForCompletion() {
  try {
    const config = await Configuration.findOne({ key: "global" })
      .select("workflow.requiredTechniciansForCompletion")
      .lean();

    const configuredValue = config?.workflow?.requiredTechniciansForCompletion;
    if (typeof configuredValue === "number" && configuredValue > 0) {
      return configuredValue;
    }
  } catch {
    // Fall back to legacy default when configuration is unavailable.
  }

  return 2;
}

function isBranchScopedStaffRole(role) {
  return (
    role !== roles.CITIZEN && role !== roles.ADMIN && role !== roles.DIRECTOR
  );
}

async function getRequestOr404(requestId, res) {
  const requestDoc = await NewConnectionRequest.findById(requestId);
  if (!requestDoc) {
    sendError(res, 404, "Request not found");
    return null;
  }

  return requestDoc;
}

function ensureActorIsActive(req, res) {
  if (req.user.status !== "active" || !req.user.isActive) {
    sendError(res, 403, "Inactive users cannot perform this action");
    return false;
  }

  return true;
}

function ensureCitizenOwnsRequest(req, res, requestDoc) {
  if (String(requestDoc.citizen) !== String(req.user._id)) {
    sendError(res, 403, "You can only access your own requests");
    return false;
  }

  return true;
}

function ensureStaffCanAccessRequestBranch(req, res, requestDoc) {
  if (!isBranchScopedStaffRole(req.user.role)) {
    return true;
  }

  if (!req.user.branch) {
    sendError(res, 403, "Staff branch is not configured");
    return false;
  }

  if (req.user.branch !== requestDoc.branch) {
    sendError(res, 403, "You can only access requests from your branch");
    return false;
  }

  return true;
}

function transitionRequestStatus({
  requestDoc,
  nextStatus,
  action,
  note,
  req,
  meta,
}) {
  assertValidTransition({
    type: "new_connection",
    fromStatus: requestDoc.status,
    toStatus: nextStatus,
  });

  const previousStatus = requestDoc.status;
  requestDoc.status = nextStatus;
  appendWorkflowLog(requestDoc, {
    action,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    note,
    actor: req.user._id,
    actorRole: req.user.role,
    meta,
  });
}

function branchCode(branch) {
  return String(branch || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function randomDigits(length = 6) {
  return Array.from({ length })
    .map(() => Math.floor(Math.random() * 10))
    .join("");
}

async function generateUniqueServiceCodes(requestDoc) {
  const branchPrefix = branchCode(requestDoc.branch) || "BR";
  const yearSuffix = new Date().getFullYear().toString().slice(-2);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = randomDigits(6);
    const waterConnectionCode = `WTR-${branchPrefix}-${yearSuffix}${token}`;
    const customerCode = `CUS-${branchPrefix}-${yearSuffix}${token}`;

    const exists = await NewConnectionRequest.exists({
      $or: [{ waterConnectionCode }, { customerCode }],
    });

    if (!exists) {
      return { waterConnectionCode, customerCode };
    }
  }

  throw new Error("Failed to generate unique service codes");
}

async function resolveBranchCoordinator(requestDoc) {
  let assignedBranchOfficer = requestDoc.assignedBranchOfficer;

  if (assignedBranchOfficer) {
    const assignedOfficer = await User.findById(assignedBranchOfficer)
      .select("_id role branch status isActive")
      .lean();

    const isValidAssignedOfficer =
      assignedOfficer &&
      assignedOfficer.role === roles.COORDINATOR &&
      assignedOfficer.branch === requestDoc.branch &&
      assignedOfficer.status === "active" &&
      assignedOfficer.isActive;

    if (!isValidAssignedOfficer) {
      assignedBranchOfficer = null;
    }
  }

  if (!assignedBranchOfficer) {
    assignedBranchOfficer = await getLeastLoadedUser(roles.COORDINATOR, {
      branch: requestDoc.branch,
    });
  }

  return assignedBranchOfficer;
}

export async function createNewConnectionRequest(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const doc = await NewConnectionRequest.create({
    ...req.body,
    citizen: req.user._id,
    status: "submitted",
    workflowLogs: [
      {
        action: "submit",
        toStatus: "submitted",
        note: "Citizen submitted new connection request",
        actor: req.user._id,
        actorRole: req.user.role,
      },
    ],
  });

  return sendOk(res, { request: doc }, 201);
}

export async function listMyRequests(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requests = await NewConnectionRequest.find({ citizen: req.user._id })
    .populate("assignedMeterReader", "name email phone role status branch")
    .sort({ createdAt: -1 })
    .lean();

  return sendOk(res, { requests });
}

export async function listRequests(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const query = {};
  const requestedStatus = req.query.status;
  if (requestedStatus) {
    if (
      requestedStatus === "submitted" &&
      ![roles.DIRECTOR, roles.ADMIN].includes(req.user.role)
    ) {
      return sendOk(res, { requests: [] });
    }

    query.status = requestedStatus;
  } else if (![roles.DIRECTOR, roles.ADMIN].includes(req.user.role)) {
    query.status = { $ne: "submitted" };
  }

  if (isBranchScopedStaffRole(req.user.role)) {
    query.branch = req.user.branch;
  }

  const requests = await NewConnectionRequest.find(query)
    .populate("citizen", "name email phone")
    .populate("assignedSurveyor", "name email role status")
    .populate("assignedTechnicians", "name email role status")
    .populate("assignedFinanceOfficer", "name email role status branch")
    .populate("assignedBranchOfficer", "name email role status branch")
    .populate("assignedMeterReader", "name email role status branch")
    .sort({ createdAt: -1 })
    .lean();

  return sendOk(res, { requests });
}

export async function getRequestById(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await NewConnectionRequest.findById(req.params.id)
    .populate("citizen", "name email phone")
    .populate("assignedSurveyor", "name email role status")
    .populate("assignedTechnicians", "name email role status")
    .populate("assignedFinanceOfficer", "name email role status branch")
    .populate("assignedBranchOfficer", "name email role status branch")
    .populate("assignedMeterReader", "name email phone role status branch")
    .populate("workflowLogs.actor", "name role")
    .lean();

  if (!requestDoc) {
    return sendError(res, 404, "Request not found");
  }

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) {
    return;
  }

  if (
    requestDoc.status === "submitted" &&
    req.user.role !== roles.CITIZEN &&
    ![roles.DIRECTOR, roles.ADMIN].includes(req.user.role)
  ) {
    return sendError(
      res,
      403,
      "Only Customer Service Director can review submitted requests",
    );
  }

  const isOwner =
    String(requestDoc.citizen?._id || requestDoc.citizen) ===
    String(req.user._id);
  const canAccess =
    req.user.role !== roles.CITIZEN ||
    isOwner ||
    String(requestDoc.assignedSurveyor?._id || requestDoc.assignedSurveyor) ===
      String(req.user._id) ||
    (requestDoc.assignedTechnicians || []).some(
      (technician) =>
        String(technician?._id || technician) === String(req.user._id),
    );

  if (!canAccess) {
    return sendError(res, 403, "Forbidden");
  }

  return sendOk(res, { request: requestDoc });
}

export async function approveByDirector(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  const assignedBranchOfficer = await resolveBranchCoordinator(requestDoc);

  requestDoc.assignedBranchOfficer = assignedBranchOfficer;
  requestDoc.branchApprovalStage = 0;
  requestDoc.assignedSurveyor = undefined;
  requestDoc.assignedTechnicians = [];
  requestDoc.assignedMeterReader = undefined;
  requestDoc.implementationCompletion = { technicianCompletions: [] };

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "under_review",
      action: "director_approved",
      note: req.body.note || "Director approved and moved to under_review",
      req,
      meta: { assignedBranchOfficer },
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  if (assignedBranchOfficer) {
    await notificationService.notify({
      recipientId: assignedBranchOfficer,
      message: "New request is awaiting your branch approval",
      context: { requestId: requestDoc._id, service: "new_connection" },
    });
  }

  return sendOk(res, { request: requestDoc });
}

export async function rejectByDirector(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "rejected",
      action: "director_rejected",
      note: req.body.note || "Director rejected request",
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  notificationService.notify({
    recipientId: requestDoc.citizen,
    message: "Your new connection request was rejected",
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function submitInspection(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  if (String(requestDoc.assignedSurveyor) !== String(req.user._id)) {
    return sendError(res, 403, "Only assigned surveyor can submit inspection");
  }

  if (!["under_review", "inspection"].includes(requestDoc.status)) {
    return sendError(
      res,
      400,
      "Inspection can only be submitted from under_review or inspection status",
    );
  }

  const requestedTools = req.body.toolsRequired || [];
  const requestedToolIds = requestedTools.map((tool) => String(tool.toolId));
  const uniqueToolIds = [...new Set(requestedToolIds)];

  if (uniqueToolIds.length !== requestedToolIds.length) {
    return sendError(res, 400, "Duplicate tools are not allowed");
  }

  const toolCatalog = await Tool.find({
    _id: { $in: uniqueToolIds },
    isActive: true,
  })
    .select("code description source measurement stockPrice customerPrice")
    .lean();

  if (toolCatalog.length !== uniqueToolIds.length) {
    return sendError(res, 400, "One or more selected tools are invalid or inactive");
  }

  const toolById = new Map(toolCatalog.map((tool) => [String(tool._id), tool]));

  const toolsRequired = requestedTools.map((selectedTool) => {
    const catalogTool = toolById.get(String(selectedTool.toolId));
    const quantity = Number(selectedTool.quantity);

    return {
      toolId: catalogTool._id,
      code: catalogTool.code,
      description: catalogTool.description,
      source: catalogTool.source,
      quantity,
      measurement: catalogTool.measurement,
      stockPrice: Number(catalogTool.stockPrice),
      customerUnitPrice: Number(catalogTool.customerPrice),
      totalPrice: quantity * Number(catalogTool.customerPrice),
    };
  });

  const totalEstimatedCost = toolsRequired.reduce(
    (sum, tool) => sum + tool.totalPrice,
    0,
  );

  requestDoc.inspectionReport = {
    requiredTools: toolsRequired.map((tool) => tool.description),
    notes: req.body.notes,
    estimatedCost: totalEstimatedCost,
    submittedBy: req.user._id,
    submittedAt: new Date(),
  };

  requestDoc.inspection = {
    surveyor: req.user._id,
    notes: req.body.notes,
    submittedAt: new Date(),
  };
  requestDoc.toolsRequired = toolsRequired;
  requestDoc.totalEstimatedCost = totalEstimatedCost;

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "waiting_payment",
      action: "inspection_submitted",
      note:
        req.body.notes ||
        "Surveyor submitted inspection report and moved request to waiting_payment",
      req,
      meta: {
        toolsRequired,
        totalEstimatedCost,
      },
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  await notificationService.notify({
    recipientId: requestDoc.citizen,
    message:
      "Inspection completed. Please proceed with payment for required materials.",
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function submitPayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureCitizenOwnsRequest(req, res, requestDoc)) return;

  if (requestDoc.status !== "waiting_payment") {
    return sendError(
      res,
      400,
      "Payment can only be submitted when request is waiting for payment",
    );
  }

  if (!req.file) {
    return sendError(res, 400, "Receipt file is required");
  }

  let uploadResult;
  try {
    uploadResult = await uploadBufferToCloudinary(
      req.file,
      "urbansight/request-receipts",
    );
  } catch (error) {
    return sendError(
      res,
      400,
      error instanceof Error ? error.message : "Receipt upload failed",
    );
  }

  const submittedAt = new Date();

  requestDoc.payment = {
    transactionId: req.body.transactionId,
    paymentMethod: req.body.paymentMethod,
    receiptUrl: uploadResult.secure_url,
    submittedAt,
    status: "pending",
  };

  const assignedFinanceOfficer = await getLeastLoadedUser(roles.FINANCE, {
    branch: requestDoc.branch,
  });
  if (!assignedFinanceOfficer) {
    return sendError(
      res,
      400,
      "No active finance officer available for branch",
    );
  }

  requestDoc.assignedFinanceOfficer = assignedFinanceOfficer;

  requestDoc.paymentInfo = {
    ...requestDoc.paymentInfo,
    transactionId: req.body.transactionId,
    method: req.body.paymentMethod,
    receiptImage: uploadResult.secure_url,
    status: "submitted",
    submittedAt,
    rejectionReason: "",
  };

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "payment_submitted",
      action: "payment_submitted",
      note: "Citizen submitted payment information",
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

  await requestDoc.save();

  await notificationService.notify({
    recipientId: assignedFinanceOfficer,
    message: "New payment submitted for verification",
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function verifyPayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  if (
    requestDoc.assignedFinanceOfficer &&
    String(requestDoc.assignedFinanceOfficer) !== String(req.user._id)
  ) {
    return sendError(
      res,
      403,
      "Only assigned finance officer can verify this payment",
    );
  }

  if (!requestDoc.assignedFinanceOfficer) {
    requestDoc.assignedFinanceOfficer = req.user._id;
  }

  if (requestDoc.status !== "payment_submitted") {
    return sendError(
      res,
      400,
      "Only payment_submitted requests can be verified",
    );
  }

  requestDoc.payment = {
    ...requestDoc.payment,
    status: "verified",
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
  };

  requestDoc.paymentInfo = {
    ...requestDoc.paymentInfo,
    status: "verified",
    verifiedAt: new Date(),
    rejectionReason: "",
  };

  try {
    const assignedBranchOfficer = await resolveBranchCoordinator(requestDoc);
    if (!assignedBranchOfficer) {
      return sendError(res, 400, "No active branch officer available");
    }

    requestDoc.assignedBranchOfficer = assignedBranchOfficer;

    transitionRequestStatus({
      requestDoc,
      nextStatus: "under_review",
      action: "finance_payment_verification",
      note:
        req.body.note || "Finance verified payment and moved to under_review",
      req,
      meta: { assignedBranchOfficer },
    });

    await notificationService.notify({
      recipientId: assignedBranchOfficer,
      message: "Payment verified. Request is waiting for your branch approval",
      context: { requestId: requestDoc._id, service: "new_connection" },
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  await notificationService.notify({
    recipientId: requestDoc.citizen,
    message: "Your payment has been verified",
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function rejectPayment(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  if (
    requestDoc.assignedFinanceOfficer &&
    String(requestDoc.assignedFinanceOfficer) !== String(req.user._id)
  ) {
    return sendError(
      res,
      403,
      "Only assigned finance officer can reject this payment",
    );
  }

  if (!requestDoc.assignedFinanceOfficer) {
    requestDoc.assignedFinanceOfficer = req.user._id;
  }

  if (requestDoc.status !== "payment_submitted") {
    return sendError(
      res,
      400,
      "Only payment_submitted requests can be rejected",
    );
  }

  requestDoc.payment = {
    ...requestDoc.payment,
    status: "rejected",
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
  };

  requestDoc.paymentInfo = {
    ...requestDoc.paymentInfo,
    status: "rejected",
    verifiedAt: new Date(),
    rejectionReason: req.body.rejectionReason,
  };

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "payment_rejected",
      action: "finance_payment_rejected",
      note: req.body.rejectionReason,
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  await notificationService.notify({
    recipientId: requestDoc.citizen,
    message: `Payment rejected: ${req.body.rejectionReason}`,
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function approveByBranchOfficer(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  const isAssignedBranchOfficer =
    requestDoc.assignedBranchOfficer &&
    String(requestDoc.assignedBranchOfficer) === String(req.user._id);
  const canApproveUnassignedRequest =
    !requestDoc.assignedBranchOfficer &&
    req.user.role === roles.COORDINATOR &&
    req.user.branch === requestDoc.branch;

  if (!isAssignedBranchOfficer && !canApproveUnassignedRequest) {
    return sendError(
      res,
      403,
      "Only assigned branch officer can approve this request",
    );
  }

  if (!requestDoc.assignedBranchOfficer) {
    requestDoc.assignedBranchOfficer = req.user._id;
  }

  try {
    const stage = requestDoc.branchApprovalStage || 0;

    if (requestDoc.status === "under_review" && stage === 0) {
      const assignedSurveyor = await getLeastLoadedUser(roles.SURVEYOR, {
        branch: requestDoc.branch,
      });
      if (!assignedSurveyor) {
        return sendError(res, 400, "No active surveyor available");
      }

      requestDoc.assignedSurveyor = assignedSurveyor;
      requestDoc.branchApprovalStage = 1;

      transitionRequestStatus({
        requestDoc,
        nextStatus: "inspection",
        action: "branch_officer_first_approval",
        note:
          req.body.note ||
          "Branch coordinator approved and assigned surveyor for inspection",
        req,
        meta: { assignedSurveyor, stage: 1 },
      });

      await requestDoc.save();

      await notificationService.notify({
        recipientId: assignedSurveyor,
        message: "You have been assigned to inspect a new connection request",
        context: { requestId: requestDoc._id, service: "new_connection" },
      });

      return sendOk(res, { request: requestDoc });
    }

    if (requestDoc.status === "under_review" && stage === 1) {
      if (requestDoc.payment?.status !== "verified") {
        return sendError(
          res,
          400,
          "Final branch approval requires verified payment",
        );
      }

      const requiredTechnicians = await getRequiredTechniciansForCompletion();
      const assignedTechnicians = await getLeastLoadedUsers(
        roles.TECHNICIAN,
        requiredTechnicians,
        {
          branch: requestDoc.branch,
        },
      );

      if (assignedTechnicians.length < requiredTechnicians) {
        return sendError(
          res,
          400,
          `At least ${requiredTechnicians} active technicians are required for implementation`,
        );
      }

      requestDoc.assignedTechnicians = assignedTechnicians;
      requestDoc.branchApprovalStage = 2;
      requestDoc.implementationCompletion = { technicianCompletions: [] };

      transitionRequestStatus({
        requestDoc,
        nextStatus: "approved",
        action: "branch_officer_second_approval",
        note:
          req.body.note ||
          "Branch coordinator approved and auto-assigned implementation technicians",
        req,
        meta: { assignedTechnicians, stage: 2 },
      });

      await requestDoc.save();

      await Promise.all(
        assignedTechnicians.map((technicianId) =>
          notificationService.notify({
            recipientId: technicianId,
            message: "You have been assigned for field implementation",
            context: { requestId: requestDoc._id, service: "new_connection" },
          }),
        ),
      );

      await notificationService.notify({
        recipientId: requestDoc.citizen,
        message: "Implementation team assigned. Field work will start soon.",
        context: { requestId: requestDoc._id, service: "new_connection" },
      });

      return sendOk(res, { request: requestDoc });
    }

    if (requestDoc.status === "approved" && stage === 2) {
      const completion = requestDoc.implementationCompletion || {
        technicianCompletions: [],
      };
      const requiredTechnicians = await getRequiredTechniciansForCompletion();
      const totalTechnicians = requestDoc.assignedTechnicians.length;
      const completedTechnicians = completion.technicianCompletions.length;

      if (
        totalTechnicians < requiredTechnicians ||
        completedTechnicians < totalTechnicians
      ) {
        return sendError(
          res,
          400,
          "Final branch approval requires all assigned technicians to complete field work",
        );
      }

      const assignedMeterReader = await getLeastLoadedUser(roles.METER_READER, {
        branch: requestDoc.branch,
      });

      if (!assignedMeterReader) {
        return sendError(res, 400, "No active meter reader available");
      }

      requestDoc.assignedMeterReader = assignedMeterReader;
      requestDoc.branchApprovalStage = 3;

      if (!requestDoc.waterConnectionCode || !requestDoc.customerCode) {
        const generatedCodes = await generateUniqueServiceCodes(requestDoc);
        requestDoc.waterConnectionCode = generatedCodes.waterConnectionCode;
        requestDoc.customerCode = generatedCodes.customerCode;
      }

      transitionRequestStatus({
        requestDoc,
        nextStatus: "completed",
        action: "branch_officer_final_approval",
        note:
          req.body.note ||
          "Branch coordinator finalized implementation and assigned meter reader",
        req,
        meta: { assignedMeterReader, stage: 3 },
      });

      await requestDoc.save();

      await Promise.all([
        notificationService.notify({
          recipientId: assignedMeterReader,
          message: "A completed connection has been assigned for meter reading",
          context: { requestId: requestDoc._id, service: "new_connection" },
        }),
        notificationService.notify({
          recipientId: requestDoc.citizen,
          message: `Your application is approved and completed. Water Connection Code: ${requestDoc.waterConnectionCode} | Customer Code: ${requestDoc.customerCode}`,
          context: { requestId: requestDoc._id, service: "new_connection" },
        }),
      ]);

      return sendOk(res, { request: requestDoc });
    }

    return sendError(
      res,
      400,
      "Branch approval is not allowed at the current workflow stage",
    );
  } catch (error) {
    return sendError(res, 400, error.message);
  }
}

export async function rejectByBranchOfficer(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  if (String(requestDoc.assignedBranchOfficer) !== String(req.user._id)) {
    return sendError(
      res,
      403,
      "Only assigned branch officer can reject this request",
    );
  }

  if (requestDoc.status !== "under_review") {
    return sendError(
      res,
      400,
      "Branch rejection is only allowed in review stage",
    );
  }

  if (
    (requestDoc.branchApprovalStage || 0) === 1 &&
    requestDoc.payment?.status !== "verified"
  ) {
    return sendError(
      res,
      400,
      "Second branch rejection requires verified payment stage",
    );
  }

  try {
    transitionRequestStatus({
      requestDoc,
      nextStatus: "rejected",
      action: "branch_officer_rejected",
      note: req.body.note || "Branch officer rejected request",
      req,
    });
  } catch (error) {
    return sendError(res, 400, error.message);
  }

  await requestDoc.save();

  await notificationService.notify({
    recipientId: requestDoc.citizen,
    message: "Your request was rejected by branch officer",
    context: { requestId: requestDoc._id, service: "new_connection" },
  });

  return sendOk(res, { request: requestDoc });
}

export async function assignFinalTeam(req, res) {
  return approveByBranchOfficer(req, res);
}

export async function manualAssignTask(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  const {
    assignedBranchOfficer,
    assignedSurveyor,
    assignedTechnicians,
    assignedMeterReader,
  } = req.body || {};

  const updates = {};

  if (assignedBranchOfficer) {
    const user = await User.findById(assignedBranchOfficer)
      .select("_id role branch status isActive")
      .lean();

    if (
      !user ||
      user.role !== roles.COORDINATOR ||
      user.branch !== requestDoc.branch ||
      user.status !== "active" ||
      !user.isActive
    ) {
      return sendError(res, 400, "Invalid branch officer assignment");
    }

    updates.assignedBranchOfficer = user._id;
  }

  if (assignedSurveyor) {
    const user = await User.findById(assignedSurveyor)
      .select("_id role branch status isActive")
      .lean();

    if (
      !user ||
      user.role !== roles.SURVEYOR ||
      user.branch !== requestDoc.branch ||
      user.status !== "active" ||
      !user.isActive
    ) {
      return sendError(res, 400, "Invalid surveyor assignment");
    }

    updates.assignedSurveyor = user._id;
  }

  if (Array.isArray(assignedTechnicians)) {
    const technicians = await User.find({ _id: { $in: assignedTechnicians } })
      .select("_id role branch status isActive")
      .lean();

    const allValid =
      technicians.length === assignedTechnicians.length &&
      technicians.every(
        (user) =>
          user.role === roles.TECHNICIAN &&
          user.branch === requestDoc.branch &&
          user.status === "active" &&
          user.isActive,
      );

    if (!allValid) {
      return sendError(res, 400, "Invalid technician assignment");
    }

    updates.assignedTechnicians = technicians.map((user) => user._id);
  }

  if (assignedMeterReader) {
    const user = await User.findById(assignedMeterReader)
      .select("_id role branch status isActive")
      .lean();

    if (
      !user ||
      user.role !== roles.METER_READER ||
      user.branch !== requestDoc.branch ||
      user.status !== "active" ||
      !user.isActive
    ) {
      return sendError(res, 400, "Invalid meter reader assignment");
    }

    updates.assignedMeterReader = user._id;
  }

  Object.assign(requestDoc, updates);

  appendWorkflowLog(requestDoc, {
    action: "manual_assignment",
    fromStatus: requestDoc.status,
    toStatus: requestDoc.status,
    note: "Coordinator manually assigned field staff",
    actor: req.user._id,
    actorRole: req.user.role,
    meta: updates,
  });

  await requestDoc.save();

  return sendOk(res, { request: requestDoc });
}

export async function completeImplementation(req, res) {
  if (!ensureActorIsActive(req, res)) return;

  const requestDoc = await getRequestOr404(req.params.id, res);
  if (!requestDoc) return;

  if (!ensureStaffCanAccessRequestBranch(req, res, requestDoc)) return;

  if (requestDoc.status !== "approved") {
    return sendError(
      res,
      400,
      "Implementation can only be completed from approved status",
    );
  }

  const actorId = String(req.user._id);
  const isAssignedTechnician = requestDoc.assignedTechnicians.some(
    (technicianId) => String(technicianId) === actorId,
  );

  if (!isAssignedTechnician) {
    return sendError(
      res,
      403,
      "Only assigned technicians can complete this request",
    );
  }

  const completion = requestDoc.implementationCompletion || {
    technicianCompletions: [],
  };

  const alreadyCompleted = completion.technicianCompletions.some(
    (entry) => String(entry.technician) === actorId,
  );

  if (alreadyCompleted) {
    const technicianCount = requestDoc.assignedTechnicians.length;
    const completedTechnicians = completion.technicianCompletions.length;
    const pendingTechnicians = Math.max(technicianCount - completedTechnicians, 0);

    return sendOk(res, {
      request: requestDoc,
      message:
        pendingTechnicians > 0
          ? `Waiting for ${pendingTechnicians} technician(s) to complete implementation`
          : "Implementation already marked as completed by all assigned technicians",
    });
  }

  completion.technicianCompletions.push({
    technician: req.user._id,
    completedAt: new Date(),
  });

  requestDoc.implementationCompletion = completion;

  appendWorkflowLog(requestDoc, {
    action: "team_member_completed",
    fromStatus: requestDoc.status,
    toStatus: requestDoc.status,
    note: "Assigned team member marked implementation complete",
    actor: req.user._id,
    actorRole: req.user.role,
  });

  const technicianCount = requestDoc.assignedTechnicians.length;
  const completedTechnicians = completion.technicianCompletions.length;

  if (technicianCount > 0 && completedTechnicians >= technicianCount) {
    appendWorkflowLog(requestDoc, {
      action: "implementation_ready_for_final_branch_approval",
      fromStatus: requestDoc.status,
      toStatus: requestDoc.status,
      note:
        req.body.note ||
        "All assigned technicians completed implementation; waiting for final branch approval",
      actor: req.user._id,
      actorRole: req.user.role,
      meta: {
        completedTechnicians,
        technicianCount,
      },
    });

    if (requestDoc.assignedBranchOfficer) {
      await notificationService.notify({
        recipientId: requestDoc.assignedBranchOfficer,
        message:
          "All technicians have completed implementation. Final branch approval is required.",
        context: { requestId: requestDoc._id, service: "new_connection" },
      });
    }
  }

  await requestDoc.save();

  return sendOk(res, { request: requestDoc });
}

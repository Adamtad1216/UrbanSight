import { issueStatuses, requestStatuses } from "../utils/constants.js";

const newConnectionAllowedTransitions = {
  submitted: ["under_review", "rejected"],
  under_review: ["inspection", "waiting_payment", "approved", "rejected"],
  inspection: ["waiting_payment", "payment_submitted"],
  waiting_payment: ["payment_submitted"],
  payment_submitted: ["under_review", "payment_rejected"],
  payment_rejected: ["payment_submitted"],
  payment_verified: ["approved", "under_review"],
  approved: ["completed"],
  completed: [],
  rejected: [],
};

const issueAllowedTransitions = {
  submitted: ["approved", "rejected"],
  approved: ["waiting_payment", "completed"],
  waiting_payment: ["payment_submitted"],
  payment_submitted: ["payment_verified", "payment_rejected"],
  payment_rejected: ["payment_submitted"],
  payment_verified: ["completed"],
  completed: [],
  rejected: [],
};

function mapForType(type) {
  return type === "issue"
    ? issueAllowedTransitions
    : newConnectionAllowedTransitions;
}

function statusesForType(type) {
  return type === "issue" ? issueStatuses : requestStatuses;
}

export function assertValidTransition({ type, fromStatus, toStatus }) {
  const statuses = statusesForType(type);
  if (!statuses.includes(toStatus)) {
    throw new Error(`Invalid target status: ${toStatus}`);
  }

  const allowed = mapForType(type)[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new Error(
      `Invalid status transition from ${fromStatus} to ${toStatus}`,
    );
  }
}

export function appendWorkflowLog(
  doc,
  { action, fromStatus, toStatus, note, actor, actorRole, meta },
) {
  if (!Array.isArray(doc.workflowLogs)) {
    doc.workflowLogs = [];
  }

  doc.workflowLogs.push({
    action,
    fromStatus,
    toStatus,
    note: note || "",
    actor,
    actorRole: actorRole || "system",
    meta: meta || {},
    createdAt: new Date(),
  });
}

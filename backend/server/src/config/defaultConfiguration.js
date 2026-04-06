import { requestStatuses } from "../utils/constants.js";

export const REQUEST_WORKFLOW_NOTIFICATION_STEPS = [...requestStatuses];

function toStatusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .join(" ");
}

const defaultRequestWorkflowTemplates =
  REQUEST_WORKFLOW_NOTIFICATION_STEPS.reduce((acc, status) => {
    const statusLabel = toStatusLabel(status);
    acc[status] = {
      push: `Your application is now ${statusLabel}.`,
      email: `Hello {{customerName}}, your application status is now ${statusLabel}.`,
    };
    return acc;
  }, {});

defaultRequestWorkflowTemplates.waiting_payment = {
  push: "Inspection is complete. Please proceed with payment.",
  email:
    "Hello {{customerName}}, inspection is complete and payment is now required to continue your application.",
};

defaultRequestWorkflowTemplates.payment_rejected = {
  push: "Your payment was rejected. Reason: {{reason}}",
  email:
    "Hello {{customerName}}, your payment was rejected. Reason: {{reason}}. Please fix and resubmit.",
};

defaultRequestWorkflowTemplates.adjustment_requested = {
  push: "Adjustment requested on your application. Reason: {{reason}}",
  email:
    "Hello {{customerName}}, a staff member requested adjustments on your application. Reason: {{reason}}.",
};

defaultRequestWorkflowTemplates.completed = {
  push: "Your application is completed. Water Connection Code: {{waterConnectionCode}} | Customer Code: {{customerCode}}",
  email:
    "Hello {{customerName}}, your application is completed. Water Connection Code: {{waterConnectionCode}} and Customer Code: {{customerCode}}.",
};

export const DEFAULT_CONFIGURATION = {
  workflow: {
    requiredTechniciansForCompletion: 2,
    autoAssignSurveyor: true,
    autoAssignTechnicians: true,
    autoAssignMeterReader: true,
  },
  payments: {
    requireReceiptUpload: true,
    allowResubmissionAfterRejection: true,
    supportedMethods: [],
  },
  tools: {
    maxImportFileSizeMb: 5,
    updateDuplicateCodeOnImport: true,
  },
  notifications: {
    notifyCitizenOnStatusChange: true,
    notifyAssigneeOnAutoAssignment: true,
    enablePush: true,
    enableEmail: true,
    accountCreationTemplate: {
      push: "Welcome to UrbanSight, {{name}}. Your {{role}} account has been created successfully.",
      email:
        "Hello {{name}},\n\nWelcome to UrbanSight. Your {{role}} account has been created successfully for {{email}}.\n\nRegards,\nUrbanSight Team",
    },
    workflowStepTemplates: {
      new_connection: defaultRequestWorkflowTemplates,
    },
  },
  citizenPortal: {
    showAssignedMeterReaderInfo: true,
  },
};

function mergeRequestTemplates(baseTemplates = {}, overrideTemplates = {}) {
  const merged = { ...baseTemplates };

  for (const [status, template] of Object.entries(overrideTemplates || {})) {
    merged[status] = {
      ...(baseTemplates?.[status] || {}),
      ...(template || {}),
    };
  }

  return merged;
}

export function mergeConfiguration(base, override) {
  const mergedNotifications = {
    ...base.notifications,
    ...(override?.notifications || {}),
  };

  mergedNotifications.workflowStepTemplates = {
    ...(base.notifications?.workflowStepTemplates || {}),
    ...(override?.notifications?.workflowStepTemplates || {}),
    new_connection: mergeRequestTemplates(
      base.notifications?.workflowStepTemplates?.new_connection || {},
      override?.notifications?.workflowStepTemplates?.new_connection || {},
    ),
  };

  mergedNotifications.accountCreationTemplate = {
    ...(base.notifications?.accountCreationTemplate || {}),
    ...(override?.notifications?.accountCreationTemplate || {}),
  };

  return {
    workflow: {
      ...base.workflow,
      ...(override?.workflow || {}),
    },
    payments: {
      ...base.payments,
      ...(override?.payments || {}),
    },
    tools: {
      ...base.tools,
      ...(override?.tools || {}),
    },
    notifications: mergedNotifications,
    citizenPortal: {
      ...base.citizenPortal,
      ...(override?.citizenPortal || {}),
    },
  };
}

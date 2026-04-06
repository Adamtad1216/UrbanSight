export const roles = {
  CITIZEN: "citizen",
  DIRECTOR: "director",
  COORDINATOR: "coordinator",
  SURVEYOR: "surveyor",
  TECHNICIAN: "technician",
  METER_READER: "meter_reader",
  FINANCE: "finance",
  ADMIN: "admin",
};

export const branches = ["Sikela Branch", "Nech Sar Branch", "Secha Branch"];

export const requestStatuses = [
  "submitted",
  "adjustment_requested",
  "under_review",
  "rejected",
  "inspection",
  "waiting_payment",
  "payment_submitted",
  "payment_verified",
  "payment_rejected",
  "approved",
  "completed",
];

export const issueStatuses = [
  "submitted",
  "approved",
  "waiting_payment",
  "payment_submitted",
  "payment_verified",
  "payment_rejected",
  "completed",
  "rejected",
];

export const terminalRequestStatuses = ["completed", "rejected"];
export const terminalIssueStatuses = ["completed", "rejected"];

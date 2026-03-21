import { AuthUser, BranchName } from "./auth";

type StaffUserRef = Pick<AuthUser, "id" | "name" | "email" | "role"> & {
  _id?: string;
};

export type WorkflowStatus =
  | "submitted"
  | "under_review"
  | "rejected"
  | "inspection"
  | "waiting_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"
  | "approved"
  | "completed";

export interface RequestTimelineItem {
  status: WorkflowStatus;
  note: string;
  changedBy?: Pick<AuthUser, "name" | "role">;
  changedAt: string;
}

export interface RequestWorkflowLogItem {
  action: string;
  fromStatus?: WorkflowStatus;
  toStatus: WorkflowStatus;
  note?: string;
  actor?: Pick<AuthUser, "name" | "role">;
  createdAt: string;
}

export interface NewConnectionRequest {
  _id: string;
  citizen: string | Pick<AuthUser, "name" | "email" | "phone">;
  customerName: string;
  customerNameAmharic?: string;
  email: string;
  tinNumber: string;
  phoneNumber: string;
  numberOfFamily: number;
  address: string;
  houseNumberZone: string;
  readingZone: string;
  meterSize:
    | "15mm"
    | "20mm"
    | "25mm"
    | "32mm"
    | "3/8 Inch"
    | "1/4 Inch"
    | "1/2 Inch"
    | "3/4 Inch"
    | "1 Inch"
    | "1 1/2 Inch"
    | "2 Inch";
  customerGroup:
    | "Domestic"
    | "Commercial"
    | "Government"
    | "Residential"
    | "Industry"
    | "Communal"
    | "Hydrant"
    | "NGO"
    | "Religious Organization"
    | "Public Fountain"
    | "Master Meter"
    | "Bono"
    | "Administrative"
    | "Employee"
    | "Lavaggio"
    | "Public Health Institute"
    | "Regional and Federal Institution"
    | "Local Government";
  type:
    | "Private"
    | "Shared"
    | "Tap"
    | "Hydrant"
    | "Cattle Drink"
    | "Well";
  serviceType: string;
  description: string;
  branch: BranchName;
  location: {
    latitude: number;
    longitude: number;
  };
  housePlan: string;
  idCard: string;
  attachments: string[];
  status: WorkflowStatus;
  inspectionReport?: {
    summary?: string;
    findingsUrl?: string;
    note?: string;
    inspectedAt?: string;
  };
  inspection?: {
    surveyor?: string | StaffUserRef;
    notes?: string;
    submittedAt?: string;
  };
  toolsRequired?: Array<{
    toolId?: string;
    code: string;
    description: string;
    source: string;
    quantity: number;
    measurement: string;
    stockPrice: number;
    customerUnitPrice: number;
    totalPrice: number;
  }>;
  totalEstimatedCost?: number;
  technicalUpdate?: {
    status?: string;
    note?: string;
    updatedAt?: string;
  };
  payment?: {
    transactionId?: string;
    paymentMethod?: string;
    receiptUrl?: string;
    submittedAt?: string;
    status: "pending" | "verified" | "rejected";
    amount?: number;
    verifiedAt?: string;
    verifiedBy?: string | StaffUserRef;
  };
  paymentInfo?: {
    transactionId?: string;
    method?: string;
    receiptImage?: string;
    status?: "pending" | "submitted" | "verified" | "rejected";
    submittedAt?: string;
    verifiedAt?: string;
    rejectionReason?: string;
  };
  assignedSurveyor?: string | StaffUserRef;
  assignedFinanceOfficer?: string | StaffUserRef;
  assignedBranchOfficer?: string | StaffUserRef;
  assignedMeterReader?: string | StaffUserRef;
  waterConnectionCode?: string;
  customerCode?: string;
  assignedTechnicians?: Array<string | StaffUserRef>;
  implementationCompletion?: {
    technicianCompletions?: Array<{
      technician: string | StaffUserRef;
      completedAt: string;
    }>;
  };
  branchApprovalStage?: number;
  assignedTo?: {
    coordinator?: Pick<AuthUser, "name" | "email">;
    surveyor?: Pick<AuthUser, "name" | "email">;
    technician?: Pick<AuthUser, "name" | "email">;
  };
  timeline?: RequestTimelineItem[];
  workflowLogs?: RequestWorkflowLogItem[];
  createdAt: string;
}

import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  FileUp,
  Layers3,
  MapPinned,
  Radar,
  Shield,
  Timer,
  UserCheck,
} from "lucide-react";
import type { Feature, LandingMetrics, LandingTrend } from "./types";

export const features: Feature[] = [
  {
    title: "Digital Service Intake",
    description:
      "Citizens submit new connection and issue requests through one guided, transparent process.",
    icon: Activity,
  },
  {
    title: "Geo-Aware Water Operations",
    description:
      "Location-tagged submissions improve dispatch speed, inspection quality, and response coordination.",
    icon: MapPinned,
  },
  {
    title: "Role-Orchestrated Workflow",
    description:
      "Director, coordinator, survey, technician, and finance flows are aligned in one operational chain.",
    icon: Layers3,
  },
  {
    title: "Citizen Profile & Request History",
    description:
      "Every application, payment, and issue update is available in a single citizen timeline.",
    icon: UserCheck,
  },
  {
    title: "Secure Digital Records",
    description:
      "Attachments, approvals, and audit trails are stored centrally for accountable service delivery.",
    icon: FileUp,
  },
  {
    title: "Integrated Notifications & Alerts",
    description:
      "Status changes are communicated quickly so citizens always know what happens next.",
    icon: Bell,
  },
  {
    title: "Payment Visibility",
    description:
      "Payment submission and verification are tracked with clear confirmation checkpoints.",
    icon: CreditCard,
  },
];

export const citizenCapabilities = [
  {
    title: "Apply for New Connection",
    description:
      "Start a water service application with guided forms, document upload, and branch-based routing.",
    icon: Building2,
  },
  {
    title: "Report Water Issues",
    description:
      "Submit leak, pressure, or service disruption reports with map location and attachments.",
    icon: Radar,
  },
  {
    title: "Track Status in Real Time",
    description:
      "Follow each stage from submission and review to implementation and completion.",
    icon: Timer,
  },
  {
    title: "Submit and Verify Payments",
    description:
      "Upload receipts, monitor verification, and get confirmation once finance completes review.",
    icon: CreditCard,
  },
  {
    title: "Receive Actionable Notifications",
    description:
      "Get timely updates whenever your request changes stage or needs additional input.",
    icon: Bell,
  },
  {
    title: "Access a Unified Service Record",
    description:
      "Keep request history, issue records, and service outcomes inside one secure citizen workspace.",
    icon: Shield,
  },
];

export const defaultMetrics: LandingMetrics = {
  totalRequests: 0,
  totalIssues: 0,
  completedServices: 0,
  pendingServices: 0,
  activeCitizens: 0,
  activeStaff: 0,
  verifiedTransactions: 0,
  branchesCovered: 0,
};

export const defaultMonthly: LandingTrend[] = [
  { month: "M1", value: 1 },
  { month: "M2", value: 2 },
  { month: "M3", value: 3 },
  { month: "M4", value: 4 },
  { month: "M5", value: 5 },
  { month: "M6", value: 4 },
];

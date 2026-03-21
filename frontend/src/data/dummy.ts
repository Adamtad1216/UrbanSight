export type RequestStatus = "pending" | "approved" | "in-progress" | "completed" | "rejected";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStage = "requested" | "approved" | "inspection" | "repair" | "completed";

export interface ServiceRequest {
  id: string;
  citizenName: string;
  location: string;
  address: string;
  status: RequestStatus;
  priority: Priority;
  assignedStaff: string;
  type: string;
  date: string;
  lat: number;
  lng: number;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  stage: TaskStage;
  priority: Priority;
  assignee: string;
  requestId: string;
  dueDate: string;
}

export interface Payment {
  id: string;
  citizenName: string;
  amount: number;
  status: "pending" | "verified" | "rejected";
  date: string;
  type: string;
  receiptUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: string;
  read: boolean;
}

export const serviceRequests: ServiceRequest[] = [
  { id: "SR-001", citizenName: "Ahmad Al-Rashid", location: "District A", address: "45 Main St", status: "pending", priority: "high", assignedStaff: "Omar K.", type: "Water Leak", date: "2026-03-14", lat: 24.71, lng: 46.67 },
  { id: "SR-002", citizenName: "Fatima Hassan", location: "District B", address: "12 Palm Ave", status: "approved", priority: "medium", assignedStaff: "Khalid M.", type: "Sewerage Block", date: "2026-03-13", lat: 24.72, lng: 46.68 },
  { id: "SR-003", citizenName: "Yusuf Ibrahim", location: "District C", address: "78 Cedar Rd", status: "in-progress", priority: "critical", assignedStaff: "Ali R.", type: "Pipe Burst", date: "2026-03-12", lat: 24.70, lng: 46.66 },
  { id: "SR-004", citizenName: "Layla Mohammed", location: "District A", address: "33 Oak Lane", status: "completed", priority: "low", assignedStaff: "Sara T.", type: "Meter Issue", date: "2026-03-11", lat: 24.73, lng: 46.69 },
  { id: "SR-005", citizenName: "Nasser Al-Qahtani", location: "District D", address: "91 Birch Blvd", status: "pending", priority: "high", assignedStaff: "Unassigned", type: "Water Quality", date: "2026-03-14", lat: 24.69, lng: 46.65 },
  { id: "SR-006", citizenName: "Mona Saleh", location: "District B", address: "55 Elm St", status: "in-progress", priority: "medium", assignedStaff: "Omar K.", type: "Low Pressure", date: "2026-03-10", lat: 24.715, lng: 46.675 },
  { id: "SR-007", citizenName: "Tariq Mansour", location: "District E", address: "22 River Rd", status: "rejected", priority: "low", assignedStaff: "N/A", type: "Billing Dispute", date: "2026-03-09", lat: 24.725, lng: 46.685 },
  { id: "SR-008", citizenName: "Huda Al-Ameri", location: "District C", address: "67 Jasmine Way", status: "approved", priority: "critical", assignedStaff: "Ali R.", type: "Sewerage Overflow", date: "2026-03-14", lat: 24.705, lng: 46.665 },
];

export const workflowTasks: WorkflowTask[] = [
  { id: "T-001", title: "Inspect water leak at 45 Main St", description: "Citizen reports visible leak on street", stage: "requested", priority: "high", assignee: "Omar K.", requestId: "SR-001", dueDate: "2026-03-16" },
  { id: "T-002", title: "Clear sewerage block at 12 Palm Ave", description: "Blocked sewerage causing flooding", stage: "approved", priority: "medium", assignee: "Khalid M.", requestId: "SR-002", dueDate: "2026-03-17" },
  { id: "T-003", title: "Emergency pipe repair at 78 Cedar Rd", description: "Major pipe burst, street flooded", stage: "inspection", priority: "critical", assignee: "Ali R.", requestId: "SR-003", dueDate: "2026-03-15" },
  { id: "T-004", title: "Replace faulty meter at 33 Oak Lane", description: "Meter showing incorrect readings", stage: "completed", priority: "low", assignee: "Sara T.", requestId: "SR-004", dueDate: "2026-03-13" },
  { id: "T-005", title: "Test water quality in District D", description: "Multiple complaints about water taste", stage: "requested", priority: "high", assignee: "Khalid M.", requestId: "SR-005", dueDate: "2026-03-18" },
  { id: "T-006", title: "Fix low pressure in District B", description: "Low water pressure in multiple buildings", stage: "repair", priority: "medium", assignee: "Omar K.", requestId: "SR-006", dueDate: "2026-03-16" },
  { id: "T-007", title: "Clean sewerage overflow at Jasmine Way", description: "Urgent overflow situation", stage: "approved", priority: "critical", assignee: "Ali R.", requestId: "SR-008", dueDate: "2026-03-15" },
];

export const payments: Payment[] = [
  { id: "PAY-001", citizenName: "Ahmad Al-Rashid", amount: 250, status: "verified", date: "2026-03-10", type: "Water Bill" },
  { id: "PAY-002", citizenName: "Fatima Hassan", amount: 180, status: "pending", date: "2026-03-12", type: "Sewerage Fee" },
  { id: "PAY-003", citizenName: "Yusuf Ibrahim", amount: 320, status: "verified", date: "2026-03-08", type: "Water Bill" },
  { id: "PAY-004", citizenName: "Layla Mohammed", amount: 150, status: "rejected", date: "2026-03-11", type: "Connection Fee" },
  { id: "PAY-005", citizenName: "Nasser Al-Qahtani", amount: 420, status: "pending", date: "2026-03-14", type: "Water Bill" },
  { id: "PAY-006", citizenName: "Mona Saleh", amount: 200, status: "verified", date: "2026-03-13", type: "Sewerage Fee" },
];

export const notifications: Notification[] = [
  { id: "N-001", title: "New Service Request", message: "SR-001 submitted by Ahmad Al-Rashid", type: "info", time: "5 min ago", read: false },
  { id: "N-002", title: "Task Completed", message: "T-004 meter replacement finished", type: "success", time: "1 hour ago", read: false },
  { id: "N-003", title: "Critical Alert", message: "Pipe burst detected in District C", type: "error", time: "2 hours ago", read: true },
  { id: "N-004", title: "Payment Received", message: "PAY-003 verified for Yusuf Ibrahim", type: "success", time: "3 hours ago", read: true },
  { id: "N-005", title: "Leakage Warning", message: "AI detected potential leak in Zone 7", type: "warning", time: "4 hours ago", read: false },
];

export const monthlyData = [
  { month: "Oct", requests: 120, completed: 95, revenue: 28000 },
  { month: "Nov", requests: 145, completed: 118, revenue: 32000 },
  { month: "Dec", requests: 98, completed: 90, revenue: 25000 },
  { month: "Jan", requests: 167, completed: 140, revenue: 38000 },
  { month: "Feb", requests: 189, completed: 165, revenue: 42000 },
  { month: "Mar", requests: 156, completed: 130, revenue: 36000 },
];

export const branchData = [
  { branch: "District A", requests: 45, completed: 38, satisfaction: 87 },
  { branch: "District B", requests: 62, completed: 55, satisfaction: 91 },
  { branch: "District C", requests: 38, completed: 30, satisfaction: 78 },
  { branch: "District D", requests: 51, completed: 45, satisfaction: 85 },
  { branch: "District E", requests: 29, completed: 27, satisfaction: 93 },
];

export const leakagePredictions = [
  { zone: "Zone 1", risk: 87, confidence: 92, historicalLeaks: 12, lat: 24.71, lng: 46.67 },
  { zone: "Zone 2", risk: 23, confidence: 88, historicalLeaks: 2, lat: 24.72, lng: 46.68 },
  { zone: "Zone 3", risk: 65, confidence: 85, historicalLeaks: 7, lat: 24.70, lng: 46.66 },
  { zone: "Zone 4", risk: 45, confidence: 90, historicalLeaks: 4, lat: 24.73, lng: 46.69 },
  { zone: "Zone 5", risk: 91, confidence: 95, historicalLeaks: 15, lat: 24.69, lng: 46.65 },
  { zone: "Zone 6", risk: 34, confidence: 82, historicalLeaks: 3, lat: 24.715, lng: 46.675 },
  { zone: "Zone 7", risk: 78, confidence: 91, historicalLeaks: 9, lat: 24.725, lng: 46.685 },
];

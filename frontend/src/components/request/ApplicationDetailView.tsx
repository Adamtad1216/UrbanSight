import { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Hash } from "lucide-react";
import { NewConnectionRequest } from "@/types/request";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentViewerSection } from "@/components/request/DocumentViewerSection";
import { ApplicationProgressTimeline } from "@/components/request/ApplicationProgressTimeline";
import { RequestTimeline } from "@/components/request/RequestTimeline";
import { RequestLocationMap } from "@/components/request/RequestLocationMap";

interface ApplicationDetailViewProps {
  request: NewConnectionRequest;
  showAssignedStaff?: boolean;
  showCitizenMeterReaderInfo?: boolean;
  actionPanel?: ReactNode;
}

function formatDate(date?: string) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function getAssigneeName(
  assignee?: string | { name?: string },
  fallback = "Unassigned",
) {
  if (!assignee) return fallback;
  if (typeof assignee === "string") return "Assigned";
  return assignee.name || fallback;
}

function getAssigneeEmail(assignee?: string | { email?: string }) {
  if (!assignee || typeof assignee === "string") return "-";
  return assignee.email || "-";
}

export function ApplicationDetailView({
  request,
  showAssignedStaff = false,
  showCitizenMeterReaderInfo = true,
  actionPanel,
}: ApplicationDetailViewProps) {
  const tools = request.toolsRequired || [];
  const computedTotal = tools.reduce(
    (sum, tool) => sum + (tool.totalPrice || tool.customerUnitPrice * tool.quantity),
    0,
  );

  const paymentStatus = request.payment?.status || request.paymentInfo?.status || "pending";
  const paymentMethod = request.payment?.paymentMethod || request.paymentInfo?.method || "-";
  const transactionId = request.payment?.transactionId || request.paymentInfo?.transactionId || "-";

  const documents = [
    request.housePlan
      ? { id: "house-plan", label: "House Plan", url: request.housePlan }
      : null,
    request.idCard ? { id: "id-card", label: "ID Card", url: request.idCard } : null,
    request.payment?.receiptUrl
      ? { id: "payment-receipt", label: "Payment Receipt", url: request.payment.receiptUrl }
      : null,
    !request.payment?.receiptUrl && request.paymentInfo?.receiptImage
      ? {
          id: "payment-receipt",
          label: "Payment Receipt",
          url: request.paymentInfo.receiptImage,
        }
      : null,
    ...(request.attachments || []).map((url, index) => ({
      id: `attachment-${index}`,
      label: `Attachment ${index + 1}`,
      url,
    })),
  ].filter(Boolean) as Array<{ id: string; label: string; url: string }>;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Application Details</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Hash className="h-4 w-4" />
                {request._id}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {request.serviceType}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDate(request.createdAt)}
              </span>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Customer Name" value={request.customerName} />
              <InfoField label="Email" value={request.email} />
              <InfoField label="Phone" value={request.phoneNumber} />
              <InfoField label="TIN" value={request.tinNumber} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Address" value={request.address} />
              <InfoField label="Kebele" value={request.readingZone} />
              <InfoField label="House Number" value={request.houseNumberZone} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Meter Size" value={request.meterSize} />
              <InfoField label="Customer Group" value={request.customerGroup} />
              <InfoField label="Type" value={request.type} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Selected Location</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestLocationMap
                latitude={request.location.latitude}
                longitude={request.location.longitude}
                heightClassName="h-[260px]"
              />
            </CardContent>
          </Card>

          {tools.length > 0 && (
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Tools / Inspection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Unit Price</th>
                        <th className="px-3 py-2">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((tool, index) => (
                        <tr key={`${tool.code}-${index}`} className="border-t">
                          <td className="px-3 py-2 font-medium">{tool.code}</td>
                          <td className="px-3 py-2">{tool.description}</td>
                          <td className="px-3 py-2">{tool.quantity}</td>
                          <td className="px-3 py-2">{formatMoney(tool.customerUnitPrice)}</td>
                          <td className="px-3 py-2">{formatMoney(tool.totalPrice || tool.customerUnitPrice * tool.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <Badge variant="outline" className="rounded-lg px-3 py-1 text-sm">
                    Total Estimated Cost: {formatMoney(request.totalEstimatedCost || computedTotal)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {(request.payment || request.paymentInfo) && (
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <InfoField label="Transaction ID" value={transactionId} />
                <InfoField label="Payment Method" value={paymentMethod} />
                <InfoField label="Payment Status" value={String(paymentStatus)} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Service Type" value={request.serviceType} />
              <SummaryRow label="Status" value={<StatusBadge status={request.status} />} />
              <SummaryRow label="Created" value={formatDate(request.createdAt)} />
              <SummaryRow label="Branch" value={request.branch} />
              {!showAssignedStaff && showCitizenMeterReaderInfo && request.assignedMeterReader && (
                <>
                  <SummaryRow
                    label="Assigned Meter Reader"
                    value={getAssigneeName(request.assignedMeterReader)}
                  />
                  <SummaryRow
                    label="Meter Reader Email"
                    value={getAssigneeEmail(request.assignedMeterReader)}
                  />
                </>
              )}
              {showAssignedStaff && (
                <>
                  <SummaryRow label="Surveyor" value={getAssigneeName(request.assignedSurveyor)} />
                  <SummaryRow
                    label="Technicians"
                    value={
                      request.assignedTechnicians?.length
                        ? request.assignedTechnicians
                            .map((technician) =>
                              typeof technician === "string"
                                ? "Assigned"
                                : technician.name || "Assigned",
                            )
                            .join(", ")
                        : "Unassigned"
                    }
                  />
                  <SummaryRow
                    label="Finance Officer"
                    value={getAssigneeName(request.assignedFinanceOfficer)}
                  />
                  <SummaryRow
                    label="Branch Officer"
                    value={getAssigneeName(request.assignedBranchOfficer)}
                  />
                  <SummaryRow
                    label="Meter Reader"
                    value={getAssigneeName(request.assignedMeterReader)}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {actionPanel ? (
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>{actionPanel}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApplicationProgressTimeline
              status={request.status}
              paymentStatus={request.payment?.status || request.paymentInfo?.status}
              branchApprovalStage={request.branchApprovalStage}
            />
            <RequestTimeline timeline={request.timeline} workflowLogs={request.workflowLogs} />
          </CardContent>
        </Card>

        <DocumentViewerSection documents={documents} />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatMoney(value?: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

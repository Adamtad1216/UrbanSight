import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, uploadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentUploadField } from "@/components/request/DocumentUploadField";
import { DocumentPreviewModal } from "@/components/request/DocumentPreviewModal";
import { getDocumentKind } from "@/components/request/document-utils";
import { RequestLocationMap } from "@/components/request/RequestLocationMap";
import { NewConnectionRequest } from "@/types/request";
import { useLanguage } from "@/hooks/use-language";
import { ExternalLink, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { capturePhotoFile, hapticMedium, isNativeApp } from "@/lib/native";

interface FormState {
  requestId: string;
  waterConnectionCode: string;
  customerCode: string;
  issueType: string;
}

const initialState: FormState = {
  requestId: "",
  waterConnectionCode: "",
  customerCode: "",
  issueType: "billing",
};

export default function CitizenReportIssuePage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [issueAttachmentUrl, setIssueAttachmentUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPreview, setSubmittedPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const { t } = useLanguage();

  useEffect(() => {
    const loadMyConnections = async () => {
      try {
        const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
          "/requests/my",
          {
            cacheKey: "requests.my",
          },
        );

        setRequests(response.requests || []);
      } catch (error) {
        toast({
          title: "Failed to load connections",
          description:
            error instanceof Error ? error.message : "Unable to load data",
          variant: "destructive",
        });
      } finally {
        setLoadingRequests(false);
      }
    };

    loadMyConnections();
  }, [toast]);

  const completedConnections = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "completed" &&
          Boolean(request.waterConnectionCode) &&
          Boolean(request.customerCode),
      ),
    [requests],
  );

  const onSelectConnection = (requestId: string) => {
    const selected = completedConnections.find(
      (request) => request._id === requestId,
    );

    setForm((previous) => ({
      ...previous,
      requestId,
      waterConnectionCode: selected?.waterConnectionCode || "",
      customerCode: selected?.customerCode || "",
    }));
  };

  const captureIssuePhoto = async () => {
    try {
      const file = await capturePhotoFile();
      if (!file) {
        toast({
          title: "Camera unavailable",
          description: "Use file upload to attach an issue image.",
          variant: "destructive",
        });
        return;
      }

      setUploadingAttachment(true);
      const uploadedUrl = await uploadFile(file);
      setIssueAttachmentUrl(uploadedUrl);
      toast({
        title: "Photo attached",
        description: "Captured image uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Camera upload failed",
        description:
          error instanceof Error ? error.message : "Unable to capture image",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const selectedConnection = useMemo(
    () =>
      completedConnections.find((request) => request._id === form.requestId) ||
      null,
    [completedConnections, form.requestId],
  );

  const submittedDocuments = useMemo(() => {
    if (!selectedConnection) {
      return [] as Array<{
        key: string;
        label: string;
        url: string;
        kind: "image" | "pdf" | "file";
      }>;
    }

    const docs: Array<{
      key: string;
      label: string;
      url: string;
      kind: "image" | "pdf" | "file";
    }> = [];

    if (selectedConnection.housePlan) {
      docs.push({
        key: "house-plan",
        label: "House Plan",
        url: selectedConnection.housePlan,
        kind: getDocumentKind(selectedConnection.housePlan),
      });
    }

    if (selectedConnection.idCard) {
      docs.push({
        key: "id-card",
        label: "ID Card",
        url: selectedConnection.idCard,
        kind: getDocumentKind(selectedConnection.idCard),
      });
    }

    (selectedConnection.attachments || []).forEach((url, index) => {
      docs.push({
        key: `attachment-${index + 1}`,
        label: `Attachment ${index + 1}`,
        url,
        kind: getDocumentKind(url),
      });
    });

    return docs;
  }, [selectedConnection]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.requestId || !form.waterConnectionCode || !form.customerCode) {
      toast({
        title: "Connection required",
        description: "Select a completed water connection to report an issue.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedConnection) {
      toast({
        title: "Connection required",
        description: "Please select a completed connection.",
        variant: "destructive",
      });
      return;
    }

    if (!issueAttachmentUrl) {
      toast({
        title: "Attachment required",
        description: "Please upload issue attachment document before submit.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const generatedTitle = `Issue Report - ${form.issueType} - ${form.waterConnectionCode}`;
      const generatedDescription =
        `Citizen submitted ${form.issueType} issue for connection ${form.waterConnectionCode} ` +
        `and customer ${form.customerCode}.`;

      await apiRequest("/issues", {
        method: "POST",
        queueWhenOffline: true,
        body: {
          title: generatedTitle,
          description: generatedDescription,
          waterConnectionCode: form.waterConnectionCode,
          customerCode: form.customerCode,
          category: form.issueType,
          location: {
            latitude: selectedConnection.location.latitude,
            longitude: selectedConnection.location.longitude,
            address: selectedConnection?.address || "",
          },
          attachments: [issueAttachmentUrl],
        },
      });

      if (isNativeApp()) {
        await hapticMedium();
      }

      setForm(initialState);
      setIssueAttachmentUrl("");
      openModal(
        "Issue submitted successfully. You will be redirected to your dashboard.",
        "/citizen/dashboard",
      );
    } catch (error) {
      toast({
        title: "Submission failed",
        description:
          error instanceof Error ? error.message : "Unable to submit issue",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("citizen.reportIssue.title", "Report an Issue")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "citizen.reportIssue.subtitle",
            "Submit a water service issue and the utility team will review it.",
          )}
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4">
          <h2 className="text-lg font-semibold">
            {t(
              "citizen.reportIssue.prevInfo",
              "Previous Submitted Connection Information",
            )}
          </h2>

          <div className="space-y-2">
            <Label htmlFor="issue-connection">
              {t(
                "citizen.reportIssue.completedConnection",
                "Completed Water Connection",
              )}
            </Label>
            <select
              id="issue-connection"
              aria-label={t(
                "citizen.reportIssue.completedConnection",
                "Completed Water Connection",
              )}
              title={t(
                "citizen.reportIssue.completedConnection",
                "Completed Water Connection",
              )}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.requestId}
              onChange={(event) => onSelectConnection(event.target.value)}
              required
              disabled={loadingRequests || completedConnections.length === 0}
            >
              <option value="">
                {loadingRequests
                  ? t("common.loading", "Loading...")
                  : completedConnections.length === 0
                    ? t(
                        "citizen.reportIssue.noCompleted",
                        "No completed connections available",
                      )
                    : t(
                        "citizen.reportIssue.selectConnection",
                        "Select connection",
                      )}
              </option>
              {completedConnections.map((request) => (
                <option key={request._id} value={request._id}>
                  {request.customerName} - {request.address}
                </option>
              ))}
            </select>
          </div>

          {selectedConnection ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer Name</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.branch}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.address}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reading Zone</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.readingZone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meter Size</p>
                  <p className="text-sm font-medium">
                    {selectedConnection.meterSize}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Customer Group
                  </p>
                  <p className="text-sm font-medium">
                    {selectedConnection.customerGroup}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="water-connection-code">
                    {t(
                      "citizen.reportIssue.connectionCode",
                      "Water Connection Code",
                    )}
                  </Label>
                  <Input
                    id="water-connection-code"
                    value={form.waterConnectionCode}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-code">
                    {t("citizen.reportIssue.customerCode", "Customer Code")}
                  </Label>
                  <Input
                    id="customer-code"
                    value={form.customerCode}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t(
                    "citizen.reportIssue.locationReadonly",
                    "Submitted Location (Read Only)",
                  )}
                </Label>
                <RequestLocationMap
                  latitude={selectedConnection.location.latitude}
                  longitude={selectedConnection.location.longitude}
                  heightClassName="h-[260px]"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {t(
                    "citizen.reportIssue.docsReadonly",
                    "Submitted Documents (Read Only)",
                  )}
                </Label>
                {submittedDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {submittedDocuments.map((document) => (
                      <div
                        key={document.key}
                        className="rounded-xl border border-border/70 bg-muted/20 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                            {document.kind === "image" ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {document.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {document.kind === "image"
                                ? "Image document"
                                : document.kind === "pdf"
                                  ? "PDF document"
                                  : "Supporting file"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSubmittedPreview({
                                title: document.label,
                                url: document.url,
                              })
                            }
                          >
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                          <Button
                            asChild
                            type="button"
                            size="sm"
                            variant="outline"
                          >
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="mr-1 h-4 w-4" /> Open
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No submitted documents found for this connection.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                "citizen.reportIssue.selectToView",
                "Select a completed connection to view all previously submitted details.",
              )}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4">
          <h2 className="text-lg font-semibold">
            {t("citizen.reportIssue.issueSubmission", "Issue Submission")}
          </h2>

          <div className="space-y-2">
            <Label htmlFor="issue-type">
              {t("citizen.reportIssue.type", "Type of Issue")}
            </Label>
            <select
              id="issue-type"
              aria-label={t("citizen.reportIssue.type", "Type of Issue")}
              title={t("citizen.reportIssue.type", "Type of Issue")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.issueType}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  issueType: event.target.value,
                }))
              }
              required
            >
              <option value="billing">
                {t("issue.billing", "Billing Issue")}
              </option>
              <option value="leakage">{t("issue.leakage", "Leakage")}</option>
              <option value="meter_fault">
                {t("issue.meterFault", "Meter Fault")}
              </option>
              <option value="no_supply">
                {t("issue.noSupply", "No Water Supply")}
              </option>
              <option value="quality">
                {t("issue.quality", "Water Quality")}
              </option>
              <option value="other">{t("issue.other", "Other")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <DocumentUploadField
              label={t(
                "citizen.reportIssue.attachment",
                "Issue Attachment Document",
              )}
              required
              valueUrl={issueAttachmentUrl}
              onValueChange={setIssueAttachmentUrl}
              onUploadingChange={setUploadingAttachment}
              uploadFn={uploadFile}
            />
            {isNativeApp() ? (
              <Button
                type="button"
                variant="secondary"
                onClick={captureIssuePhoto}
                disabled={uploadingAttachment}
              >
                Capture Photo
              </Button>
            ) : null}
          </div>

          <Button
            disabled={submitting || uploadingAttachment || !selectedConnection}
            type="submit"
          >
            {submitting
              ? t("form.submitting", "Submitting...")
              : t("citizen.reportIssue.submit", "Submit Issue")}
          </Button>
        </div>
      </form>

      {submittedPreview ? (
        <DocumentPreviewModal
          open={Boolean(submittedPreview)}
          title={submittedPreview.title}
          url={submittedPreview.url}
          onOpenChange={(open) => {
            if (!open) {
              setSubmittedPreview(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

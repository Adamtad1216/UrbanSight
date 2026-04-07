import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, uploadFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequestLocationMap } from "@/components/request/RequestLocationMap";
import { NewConnectionRequest } from "@/types/request";
import { useLanguage } from "@/hooks/use-language";
import {
  capturePhotoFile,
  getCurrentCoordinates,
  hapticMedium,
  isNativeApp,
} from "@/lib/native";

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
  const [capturedLocation, setCapturedLocation] = useState<{
    latitude: number;
    longitude: number;
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

  const captureCurrentLocation = async () => {
    try {
      const coords = await getCurrentCoordinates();
      if (!coords) {
        toast({
          title: "Location unavailable",
          description: "Using previously submitted connection location.",
        });
        return;
      }

      setCapturedLocation(coords);
      toast({
        title: "Location captured",
        description: "Current GPS coordinates will be attached to this report.",
      });
    } catch (error) {
      toast({
        title: "Location access failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to access your location.",
        variant: "destructive",
      });
    }
  };

  const selectedConnection = useMemo(
    () =>
      completedConnections.find((request) => request._id === form.requestId) ||
      null,
    [completedConnections, form.requestId],
  );

  const uploadIssueAttachment = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      const uploadedUrl = await uploadFile(file);
      setIssueAttachmentUrl(uploadedUrl);
      toast({
        title: "Attachment uploaded",
        description: "Issue document uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Attachment upload failed",
        description:
          error instanceof Error ? error.message : "Unable to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

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
            latitude:
              capturedLocation?.latitude ??
              selectedConnection.location.latitude,
            longitude:
              capturedLocation?.longitude ??
              selectedConnection.location.longitude,
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
      setCapturedLocation(null);
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <a
                    href={selectedConnection.housePlan}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                  >
                    House Plan
                  </a>
                  <a
                    href={selectedConnection.idCard}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                  >
                    ID Card
                  </a>
                  {(selectedConnection.attachments || []).map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                    >
                      Attachment {index + 1}
                    </a>
                  ))}
                </div>
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
            <Label htmlFor="issue-attachment">
              {t("citizen.reportIssue.attachment", "Issue Attachment Document")}
            </Label>
            <Input
              id="issue-attachment"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={uploadIssueAttachment}
              disabled={uploadingAttachment}
            />
            {uploadingAttachment ? (
              <p className="text-xs text-muted-foreground">
                {t(
                  "citizen.reportIssue.uploadingAttachment",
                  "Uploading attachment...",
                )}
              </p>
            ) : null}
            {issueAttachmentUrl ? (
              <a
                href={issueAttachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                {t(
                  "citizen.reportIssue.viewAttachment",
                  "View uploaded issue attachment",
                )}
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(
                  "citizen.reportIssue.uploadOne",
                  "Upload one supporting document before submit.",
                )}
              </p>
            )}
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

          <div className="space-y-2">
            <Label>Live Location (Optional)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={captureCurrentLocation}
              >
                Use Current Location
              </Button>
              {capturedLocation ? (
                <span className="text-xs text-muted-foreground">
                  {capturedLocation.latitude.toFixed(5)},{" "}
                  {capturedLocation.longitude.toFixed(5)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Defaulting to the saved connection coordinates.
                </span>
              )}
            </div>
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
    </div>
  );
}

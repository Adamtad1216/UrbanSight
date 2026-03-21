import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Eye,
  FileText,
  Image as ImageIcon,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { NewConnectionRequest } from "@/types/request";
import { useToast } from "@/hooks/use-toast";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { useLanguage } from "@/hooks/use-language";
import {
  formatFileSize,
  getDocumentKind,
  isAllowedUploadType,
} from "@/components/request/document-utils";
import { DocumentPreviewModal } from "@/components/request/DocumentPreviewModal";

const defaultPaymentMethods = [
  "Telebirr (ቴሌብር)",
  "CBE Birr (ሲቢኢ ብር)",
  "Amole (አሞሌ)",
  "HelloCash (ሄሎ ካሽ)",
  "M-Pesa Ethiopia (ኤም-ፒሳ ኢትዮጵያ)",
  "Chapa (ቻፓ)",
  "YaYa Wallet (ያያ ዋሌት)",
  "Bank USSD Payments (ባንክ USSD ክፍያ)",
  "Bank Transfers & QR Payments (ባንክ ማስተላለፊያ & ETHQR)",
  "Commercial Bank of Ethiopia (የኢትዮጵያ ንግድ ባንክ)",
  "Awash International Bank (አዋሽ ኢንተርናሽናል ባንክ)",
  "Bank of Abyssinia (አቢሲኒያ ባንክ)",
  "Dashen Bank (ዳሸን ባንክ)",
  "Cooperative Bank of Oromia (ኮኦፕሬቲቭ ባንክ ኦፍ ኦሮሚያ)",
  "Development Bank of Ethiopia (የኢትዮጵያ ልማት ባንክ)",
  "Enat Bank (እናት ባንክ)",
  "Hibret Bank (ሂብረት ባንክ)",
  "Lion International Bank (አንበሳ ኢንተርናሽናል ባንክ)",
  "Zemen Bank (ዘመን ባንክ)",
  "Oromia International Bank (ኦሮሚያ ኢንተርናሽናል ባንክ)",
  "Bunna International Bank (ቡና ኢንተርናሽናል ባንክ)",
  "Amhara Bank (አማራ ባንክ)",
  "Wegagen Bank (ወጋገን ባንክ)",
  "Gadaa Bank (ገዳአ ባንክ)",
  "Berhan Bank (ብርሃን ባንክ)",
  "Abay Bank (አባይ ባንክ)",
  "Nib International Bank (ኒብ ኢንተርናሽናል ባንክ)",
  "Shabelle Bank (ሻቤል ባንክ)",
  "Hijra Bank (ሂጅራ ባንክ)",
  "Sidama Bank (ሲዳማ ባንክ)",
  "Tsehay Bank (ተሻይ ባንክ)",
  "Tsedey Bank (ተስዴይ ባንክ)",
  "Goh Betoch Bank (ጎህ ቤቶች ባንክ)",
  "Omo Bank (ኦሞ ባንክ)",
  "Global Bank (ግሎባል ባንክ)",
] as const;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function CitizenPaymentPage() {
  const { id, requestId } = useParams();
  const effectiveRequestId = id || requestId;
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [requestDoc, setRequestDoc] = useState<NewConnectionRequest | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [transactionId, setTransactionId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    ...defaultPaymentMethods,
  ]);
  const [paymentMethod, setPaymentMethod] = useState<string>(defaultPaymentMethods[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const receiptKind = useMemo(
    () =>
      receiptFile
        ? getDocumentKind(receiptFile.name, receiptFile.type)
        : getDocumentKind(receiptPreviewUrl),
    [receiptFile, receiptPreviewUrl],
  );

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl("");
      return;
    }

    const localUrl = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(localUrl);

    return () => {
      URL.revokeObjectURL(localUrl);
    };
  }, [receiptFile]);

  const openReceiptPicker = () => {
    receiptInputRef.current?.click();
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    if (receiptInputRef.current) {
      receiptInputRef.current.value = "";
    }
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    if (!isAllowedUploadType(file)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and image files are allowed.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10 MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setReceiptFile(file);
  };

  useEffect(() => {
    if (!effectiveRequestId) return;

    const loadRequest = async () => {
      try {
        const response = await apiRequest<{ request: NewConnectionRequest }>(
          `/requests/${effectiveRequestId}`,
        );

        setRequestDoc(response.request);
      } catch (error) {
        toast({
          title: "Failed to load request",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
        navigate("/citizen/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [effectiveRequestId, navigate, toast]);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await apiRequest<{
          configuration?: { payments?: { supportedMethods?: string[] } };
        }>("/configuration");

        const configuredMethods =
          response.configuration?.payments?.supportedMethods?.filter(Boolean) || [];

        if (configuredMethods.length > 0) {
          setPaymentMethods(configuredMethods);
          setPaymentMethod((previous) =>
            configuredMethods.includes(previous)
              ? previous
              : configuredMethods[0],
          );
        }
      } catch {
        // Fallback to default payment methods when configuration is unavailable.
      }
    };

    loadPaymentMethods();
  }, []);

  const totalEstimatedCost = useMemo(
    () => requestDoc?.totalEstimatedCost || 0,
    [requestDoc],
  );

  const handleSubmitPayment = async () => {
    if (!requestDoc || !effectiveRequestId) return;

    if (requestDoc.status !== "waiting_payment") {
      toast({
        title: "Payment unavailable",
        description:
          "Payment is only allowed when request is waiting for payment.",
        variant: "destructive",
      });
      return;
    }

    if (!transactionId.trim() || !paymentMethod || !receiptFile) {
      toast({
        title: "Missing fields",
        description: "Transaction ID, payment method and receipt are required.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("transactionId", transactionId);
    formData.append("paymentMethod", paymentMethod);
    formData.append("receipt", receiptFile);

    try {
      setSubmitting(true);
      await apiRequest(`/requests/request/${effectiveRequestId}/payment`, {
        method: "POST",
        body: formData,
      });

      openModal("Payment submitted successfully.", "/citizen/dashboard");
    } catch (error) {
      toast({
        title: "Payment submission failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground">Loading payment details...</div>
    );
  }

  if (!requestDoc) {
    return <div className="text-destructive">Request not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("citizen.payment.title", "Proceed to Payment")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "citizen.payment.subtitle",
            "Complete payment for required tools/materials",
          )}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>
            {t("citizen.payment.summary", "Request Summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">
              {t("common.requestId", "Request ID")}:
            </span>{" "}
            {requestDoc._id}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t("common.customer", "Customer")}:
            </span>{" "}
            {requestDoc.customerName}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t("form.serviceType", "Service Type")}:
            </span>{" "}
            {requestDoc.serviceType}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t("common.status", "Status")}:
            </span>{" "}
            {requestDoc.status}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>
            {t("citizen.payment.requiredTools", "Required Tools / Materials")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">{t("common.code", "Code")}</th>
                <th className="py-2 pr-3">
                  {t("common.description", "Description")}
                </th>
                <th className="py-2 pr-3">
                  {t("common.quantity", "Quantity")}
                </th>
                <th className="py-2 pr-3">
                  {t("common.unitPrice", "Unit Price")}
                </th>
                <th className="py-2">
                  {t("common.totalPrice", "Total Price")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(requestDoc.toolsRequired || []).map((tool, index) => (
                <tr
                  key={`${tool.code}-${index}`}
                  className="border-b last:border-b-0"
                >
                  <td className="py-2 pr-3">{tool.code}</td>
                  <td className="py-2 pr-3">{tool.description}</td>
                  <td className="py-2 pr-3">{tool.quantity}</td>
                  <td className="py-2 pr-3">{tool.customerUnitPrice}</td>
                  <td className="py-2">{tool.totalPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center pt-3 border-t">
            <span className="text-muted-foreground">
              {t("citizen.payment.totalEstimated", "Total Estimated Cost")}
            </span>
            <span className="font-semibold">{totalEstimatedCost}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>
            {t("citizen.payment.submission", "Payment Submission")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t("citizen.payment.transactionId", "Transaction ID")}
              </Label>
              <Input
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder={t(
                  "citizen.payment.transactionId",
                  "Transaction ID",
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("citizen.payment.method", "Payment Method")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "citizen.payment.selectMethod",
                      "Select payment method",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {t("citizen.payment.receipt", "Receipt Upload (Image/PDF)")}
            </Label>

            <input
              ref={receiptInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
              aria-label="Receipt file input"
              title="Receipt Upload"
              onChange={handleReceiptChange}
              className="hidden"
            />

            {!receiptFile ? (
              <div className="rounded-2xl border border-dashed p-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={openReceiptPicker}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload receipt
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border p-3">
                <div className="mb-3 flex items-center gap-2">
                  {receiptKind === "image" ? (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{receiptFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(receiptFile.size)}
                    </p>
                  </div>
                </div>

                {receiptKind === "image" && receiptPreviewUrl ? (
                  <img
                    src={receiptPreviewUrl}
                    alt={receiptFile.name}
                    className="mb-3 h-24 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-muted/40">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setReceiptPreviewOpen(true)}
                  >
                    <Eye className="mr-1 h-4 w-4" /> View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={openReceiptPicker}
                  >
                    <RefreshCcw className="mr-1 h-4 w-4" /> Change
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearReceipt}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSubmitPayment} disabled={submitting}>
            {submitting
              ? t("form.submitting", "Submitting...")
              : t("citizen.payment.submit", "Submit Payment")}
          </Button>
        </CardContent>
      </Card>

      {receiptFile && receiptPreviewUrl && (
        <DocumentPreviewModal
          open={receiptPreviewOpen}
          title={receiptFile.name}
          url={receiptPreviewUrl}
          mimeType={receiptFile.type}
          onOpenChange={setReceiptPreviewOpen}
        />
      )}
    </div>
  );
}

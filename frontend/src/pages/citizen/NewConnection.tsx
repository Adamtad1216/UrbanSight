import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Eye,
  FileText,
  Image as ImageIcon,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { apiRequest, uploadFile } from "@/lib/api";
import { DocumentUploadField } from "@/components/request/DocumentUploadField";
import { DocumentPreviewModal } from "@/components/request/DocumentPreviewModal";
import {
  formatFileSize,
  getDocumentKind,
  isAllowedUploadType,
} from "@/components/request/document-utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPicker } from "@/components/request/MapPicker";
import { BranchName } from "@/types/auth";
import { NewConnectionRequest } from "@/types/request";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { useLanguage } from "@/hooks/use-language";
import {
  deleteNewConnectionDraft,
  readNewConnectionDraft,
  writeNewConnectionDraft,
  type DraftAttachmentMeta,
  type NewConnectionDraftPreview,
  type NewConnectionDraftRecord,
} from "@/lib/citizen-draft";

const readingZoneOptions = [
  {
    value: "Water Source Kebele",
    en: "Water Source Kebele",
    am: "ውሃ ምንጭ ቀበሌ",
  },
  { value: "Woze Kebele", en: "Woze Kebele", am: "ወዜ ቀበሌ" },
  {
    value: "Edget Ber Kebele",
    en: "Edget Ber Kebele",
    am: "ዕድገት በር ቀበሌ",
  },
  {
    value: "Central City Kebele",
    en: "Central City Kebele",
    am: "መሐል ከተማ ቀበሌ",
  },
  { value: "Bere Kebele", en: "Bere Kebele", am: "በሬ ቀበሌ" },
  { value: "Chamo Kebele", en: "Chamo Kebele", am: "ጫሞ ቀበሌ" },
  { value: "Doysa Kebele", en: "Doysa Kebele", am: "ዶይሳ ቀበሌ" },
  { value: "Dilfana Kebele", en: "Dilfana Kebele", am: "ድልፋና ቀበሌ" },
  { value: "Kulfo Kebele", en: "Kulfo Kebele", am: "ኩልፎ ቀበሌ" },
  { value: "Gurba Kebele", en: "Gurba Kebele", am: "ጉርባ ቀበሌ" },
  { value: "Gizola Kebele", en: "Gizola Kebele", am: "ጊዞላ ቀበሌ" },
  {
    value: "Shara Chano Kebele",
    en: "Shara Chano Kebele",
    am: "ሻራ ጫኖ ቀበሌ",
  },
  {
    value: "Chano Dorega Kebele",
    en: "Chano Dorega Kebele",
    am: "ጫኖ ዶረጋ ቀበሌ",
  },
] as const;

const meterSizeOptions = [
  "3/8 Inch",
  "1/4 Inch",
  "1/2 Inch",
  "3/4 Inch",
  "1 Inch",
  "1 1/2 Inch",
  "2 Inch",
] as const;

const customerGroupOptions = [
  { value: "Residential", en: "Residential", am: "መኖሪያ" },
  { value: "Commercial", en: "Commercial", am: "ንግድ" },
  { value: "Industry", en: "Industry", am: "ኢንዱስትሪ" },
  { value: "Communal", en: "Communal", am: "ጋራ አገልግሎት" },
  { value: "Hydrant", en: "Hydrant", am: "ሃይድራንት" },
  { value: "NGO", en: "NGO", am: "ድርጅት" },
  {
    value: "Religious Organization",
    en: "Religious Organization",
    am: "ሃይማኖታዊ ተቋም",
  },
  {
    value: "Public Fountain",
    en: "Public Fountain",
    am: "የህዝብ ውሃ መጠጫ",
  },
  { value: "Master Meter", en: "Master Meter", am: "ዋና ሜትር" },
  { value: "Bono", en: "Bono", am: "ቦኖ" },
  { value: "Administrative", en: "Administrative", am: "አስተዳደር" },
  { value: "Employee", en: "Employee", am: "ሰራተኛ" },
  { value: "Lavaggio", en: "Lavaggio", am: "ላቫጆ" },
  {
    value: "Public Health Institute",
    en: "Public Health Institute",
    am: "የህዝብ ጤና ተቋም",
  },
  {
    value: "Regional and Federal Institution",
    en: "Regional and Federal Institution",
    am: "ክልል እና ፌዴራል ተቋም",
  },
  {
    value: "Local Government",
    en: "Local Government",
    am: "አካባቢ መንግስት",
  },
] as const;

const connectionTypeOptions = [
  { value: "Tap", en: "Tap", am: "መጠጫ ቧንቧ" },
  { value: "Shared", en: "Shared", am: "ጋራ" },
  { value: "Hydrant", en: "Hydrant", am: "ሃይድራንት" },
  { value: "Cattle Drink", en: "Cattle Drink", am: "ለእንስሳት መጠጫ" },
  { value: "Well", en: "Well", am: "ጉድጓድ" },
] as const;
const branchOptions: BranchName[] = [
  "Sikela Branch",
  "Nech Sar Branch",
  "Secha Branch",
];

const amharicNameRegex = /^[\u1200-\u137F\s]+$/;
const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const phoneErrorMessage =
  "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) =>
  value.replace(/\s+/g, "").trim();
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function renderSelectItems(options: readonly string[]) {
  return options.map((option) => (
    <SelectItem key={option} value={option}>
      {option}
    </SelectItem>
  ));
}

const formSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "Customer name must be at least 3 characters")
    .max(80, "Customer name must not exceed 80 characters"),
  customerNameAmharic: z
    .string()
    .trim()
    .min(2, "Customer name in Amharic must be at least 2 characters")
    .max(80, "Customer name in Amharic must not exceed 80 characters")
    .regex(
      amharicNameRegex,
      "Customer name in Amharic must use Amharic letters only",
    ),
  email: z.string().email("Enter a valid email"),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "TIN number must be exactly 10 digits"),
  phoneNumber: z
    .string()
    .transform(normalizePhoneNumber)
    .refine((value) => etPhoneRegex.test(value), phoneErrorMessage),
  numberOfFamily: z.coerce
    .number()
    .int("Number of family members must be a whole number")
    .min(1, "Number of family members must be at least 1")
    .max(30, "Number of family members must not exceed 30"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(150, "Address must not exceed 150 characters"),
  houseNumberZone: z
    .string()
    .trim()
    .min(2, "House number/zone is required")
    .max(60, "House number/zone must not exceed 60 characters"),
  readingZone: z.enum(
    readingZoneOptions.map((item) => item.value) as [string, ...string[]],
  ),
  meterSize: z.enum(meterSizeOptions),
  customerGroup: z.enum(
    customerGroupOptions.map((item) => item.value) as [string, ...string[]],
  ),
  type: z.enum(
    connectionTypeOptions.map((item) => item.value) as [string, ...string[]],
  ),
  serviceType: z.string().default("New Water Connection"),
  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  branch: z.enum(["Sikela Branch", "Nech Sar Branch", "Secha Branch"]),
  location: z.object({
    latitude: z
      .number()
      .min(3, "Latitude must be within Ethiopia")
      .max(15, "Latitude must be within Ethiopia"),
    longitude: z
      .number()
      .min(33, "Longitude must be within Ethiopia")
      .max(48, "Longitude must be within Ethiopia"),
  }),
  housePlan: z.string().url("House plan upload is required"),
  idCard: z.string().url("ID card upload is required"),
  attachments: z.array(z.string().url()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CitizenNewConnectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adjustmentRequestId = searchParams.get("adjustmentRequestId");
  const shouldContinueDraft = searchParams.get("draft") === "continue";
  const isAdjustmentMode = Boolean(adjustmentRequestId);
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [loadingExistingRequest, setLoadingExistingRequest] =
    useState(isAdjustmentMode);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [attachmentMeta, setAttachmentMeta] = useState<DraftAttachmentMeta[]>(
    [],
  );
  const [replaceAttachmentIndex, setReplaceAttachmentIndex] = useState<
    number | null
  >(null);
  const [savedDraft, setSavedDraft] =
    useState<NewConnectionDraftRecord<NewConnectionDraftPreview> | null>(null);
  const [requiredDocUploading, setRequiredDocUploading] = useState({
    housePlan: false,
    idCard: false,
  });
  const attachmentsInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      meterSize: "3/8 Inch",
      customerGroup: "Residential",
      type: "Tap",
      branch: "Sikela Branch",
      serviceType: "New Water Connection",
      customerNameAmharic: "",
      readingZone: "Water Source Kebele",
      location: {
        latitude: 6.032,
        longitude: 37.55,
      },
      attachments: [],
      description: "",
    },
  });

  const location = watch("location");
  const attachments = watch("attachments") || [];
  const watchedValues = watch();

  const canUseDrafts = !isAdjustmentMode;

  const refreshDraftState = useCallback(() => {
    if (!canUseDrafts) {
      setSavedDraft(null);
      return;
    }

    setSavedDraft(readNewConnectionDraft<NewConnectionDraftPreview>());
  }, [canUseDrafts]);

  const clearDraft = useCallback(() => {
    deleteNewConnectionDraft();
    setSavedDraft(null);
  }, []);

  const saveDraft = useCallback(
    (showToast = true) => {
      if (!canUseDrafts) {
        toast({
          title: "Draft not available",
          description: "Drafts are only available for new applications.",
        });
        return;
      }

      try {
        const payload: NewConnectionDraftRecord<FormValues> = {
          values: getValues(),
          attachmentMeta,
          savedAt: Date.now(),
        };
        writeNewConnectionDraft(payload);
        setSavedDraft(payload);
        if (showToast) {
          toast({
            title: "Draft saved",
            description: "You can continue this application later.",
          });
        }
      } catch {
        toast({
          title: "Unable to save draft",
          description: "Try again",
          variant: "destructive",
        });
      }
    },
    [attachmentMeta, canUseDrafts, getValues, toast],
  );

  useEffect(() => {
    refreshDraftState();
  }, [refreshDraftState]);

  useEffect(() => {
    if (!canUseDrafts || !shouldContinueDraft) return;

    const draft = readNewConnectionDraft<NewConnectionDraftPreview>();
    if (!draft?.values) return;

    reset(draft.values as FormValues);
    setAttachmentMeta(
      Array.isArray(draft.attachmentMeta) ? draft.attachmentMeta : [],
    );
    setSavedDraft(draft);
    toast({
      title: "Draft restored",
      description: "Your saved application has been loaded.",
    });
  }, [canUseDrafts, reset, shouldContinueDraft, toast]);

  useEffect(() => {
    if (!canUseDrafts) return;

    if (!formState.isDirty) return;

    const timeoutId = window.setTimeout(() => {
      saveDraft(false);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    attachmentMeta,
    canUseDrafts,
    formState.isDirty,
    saveDraft,
    watchedValues,
  ]);

  useEffect(() => {
    if (!isAdjustmentMode || !adjustmentRequestId) {
      setLoadingExistingRequest(false);
      return;
    }

    const loadRequestForAdjustment = async () => {
      try {
        const response = await apiRequest<{ request: NewConnectionRequest }>(
          `/requests/${adjustmentRequestId}`,
        );

        if (response.request.status !== "adjustment_requested") {
          toast({
            title: "Cannot edit this request",
            description:
              "Only adjustment-requested applications can be edited.",
            variant: "destructive",
          });
          navigate(`/citizen/requests/${adjustmentRequestId}`);
          return;
        }

        reset({
          customerName: response.request.customerName,
          customerNameAmharic: response.request.customerNameAmharic || "",
          email: response.request.email,
          tinNumber: response.request.tinNumber,
          phoneNumber: response.request.phoneNumber,
          numberOfFamily: response.request.numberOfFamily,
          address: response.request.address,
          houseNumberZone: response.request.houseNumberZone,
          readingZone: response.request
            .readingZone as FormValues["readingZone"],
          meterSize: response.request.meterSize as FormValues["meterSize"],
          customerGroup: response.request
            .customerGroup as FormValues["customerGroup"],
          type: response.request.type as FormValues["type"],
          serviceType: "New Water Connection",
          description: response.request.description || "",
          branch: response.request.branch,
          location: {
            latitude: response.request.location?.latitude ?? 6.032,
            longitude: response.request.location?.longitude ?? 37.55,
          },
          housePlan: response.request.housePlan,
          idCard: response.request.idCard,
          attachments: response.request.attachments || [],
        });
      } catch (error) {
        toast({
          title: "Unable to load request",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
        navigate("/citizen/my-requests");
      } finally {
        setLoadingExistingRequest(false);
      }
    };

    loadRequestForAdjustment();
  }, [adjustmentRequestId, isAdjustmentMode, navigate, reset, toast]);

  const handleUploadError = (error: unknown) => {
    toast({
      title: "Upload failed",
      description: error instanceof Error ? error.message : "Try again",
      variant: "destructive",
    });
  };

  const uploadAttachments = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    const invalidTypeFile = selectedFiles.find(
      (file) => !isAllowedUploadType(file),
    );
    if (invalidTypeFile) {
      toast({
        title: "Invalid file type",
        description: "Attachments support image and PDF files only.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const tooLargeFile = selectedFiles.find(
      (file) => file.size > MAX_UPLOAD_BYTES,
    );
    if (tooLargeFile) {
      toast({
        title: "File too large",
        description: "Each file must be 10 MB or smaller.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    try {
      setAttachmentsUploading(true);
      const uploadedEntries = await Promise.all(
        selectedFiles.map(async (file) => ({
          file,
          url: await uploadFile(file),
        })),
      );
      const nextAttachments = [
        ...attachments,
        ...uploadedEntries.map((entry) => entry.url),
      ];

      setValue("attachments", nextAttachments, {
        shouldValidate: true,
      });
      setAttachmentMeta((previous) => [
        ...previous,
        ...uploadedEntries.map((entry) => ({
          fileName: entry.file.name,
          size: entry.file.size,
        })),
      ]);
      toast({
        title: "Attachments uploaded",
        description: `${uploadedEntries.length} file(s) uploaded.`,
      });
    } catch (error) {
      handleUploadError(error);
    } finally {
      setAttachmentsUploading(false);
      event.target.value = "";
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    const nextAttachments = attachments.filter(
      (_, index) => index !== indexToRemove,
    );
    setValue("attachments", nextAttachments, { shouldValidate: true });
    setAttachmentMeta((previous) =>
      previous.filter((_, index) => index !== indexToRemove),
    );
  };

  const openAdditionalAttachmentPicker = () => {
    attachmentsInputRef.current?.click();
  };

  const openReplaceAttachmentPicker = (index: number) => {
    setReplaceAttachmentIndex(index);
    replaceAttachmentInputRef.current?.click();
  };

  const replaceAttachment = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || replaceAttachmentIndex == null) {
      event.target.value = "";
      return;
    }

    if (!isAllowedUploadType(file)) {
      toast({
        title: "Invalid file type",
        description: "Attachments support image and PDF files only.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "File too large",
        description: "Each file must be 10 MB or smaller.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    try {
      setAttachmentsUploading(true);
      const uploadedUrl = await uploadFile(file);

      const nextAttachments = [...attachments];
      nextAttachments[replaceAttachmentIndex] = uploadedUrl;
      setValue("attachments", nextAttachments, { shouldValidate: true });

      setAttachmentMeta((previous) => {
        const nextMeta = [...previous];
        nextMeta[replaceAttachmentIndex] = {
          fileName: file.name,
          size: file.size,
        };
        return nextMeta;
      });

      toast({ title: "Attachment updated" });
    } catch (error) {
      handleUploadError(error);
    } finally {
      setAttachmentsUploading(false);
      setReplaceAttachmentIndex(null);
      event.target.value = "";
    }
  };

  const getAttachmentLabel = (url: string, index: number) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split("/");
      const lastSegment = parts[parts.length - 1] || "";
      const fileName = lastSegment.split("?")[0];
      return fileName || `Attachment ${index + 1}`;
    } catch {
      return `Attachment ${index + 1}`;
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      if (isAdjustmentMode && adjustmentRequestId) {
        await apiRequest<{ request: { _id: string } }>(
          `/requests/request/${adjustmentRequestId}/adjustment-resubmit`,
          {
            method: "PATCH",
            body: {
              note: "Citizen resubmitted after requested adjustments",
              corrections: values,
            },
          },
        );

        openModal(
          "Your corrected application has been resubmitted successfully.",
          `/citizen/requests/${adjustmentRequestId}`,
        );
      } else {
        await apiRequest<{ request: { _id: string } }>(
          "/requests/new-connection",
          {
            method: "POST",
            body: values,
          },
        );

        openModal(
          "Your application has been submitted successfully.",
          "/citizen/dashboard",
        );
        clearDraft();
      }
    } catch (error) {
      toast({
        title: isAdjustmentMode ? "Resubmission failed" : "Submission failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          {isAdjustmentMode
            ? "Update New Water Connection"
            : t("citizen.newConnection.title", "New Water Connection")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdjustmentMode
            ? "Update your application details and submit it again."
            : t(
                "citizen.newConnection.subtitle",
                "Submit a new connection request",
              )}
        </p>
      </motion.div>

      {loadingExistingRequest ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-muted-foreground">
            Loading your submitted application...
          </CardContent>
        </Card>
      ) : null}

      {!loadingExistingRequest ? (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <form
              className="space-y-6"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("form.customerName", "Customer Name")}</Label>
                  <Input {...register("customerName")} />
                  {errors.customerName && (
                    <p className="text-xs text-destructive">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("form.customerNameAmharic", "Customer Name (Amharic)")}
                  </Label>
                  <Controller
                    control={control}
                    name="customerNameAmharic"
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(event) => {
                          // Keep only Amharic letters and spaces during typing.
                          const sanitized = event.target.value.replace(
                            /[^\u1200-\u137F\s]/g,
                            "",
                          );
                          field.onChange(sanitized);
                        }}
                        inputMode="text"
                        maxLength={80}
                        placeholder={language === "am" ? "ሙሉ ስም" : "ሙሉ ስም"}
                      />
                    )}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {language === "am"
                      ? "በአማርኛ ፊደላት ብቻ ያስገቡ"
                      : "Use Amharic letters only"}
                  </p>
                  {errors.customerNameAmharic && (
                    <p className="text-xs text-destructive">
                      {errors.customerNameAmharic.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("common.email", "Email")}</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("form.tinNumber", "TIN Number")}</Label>
                  <Input
                    {...register("tinNumber")}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="1234567890"
                  />
                  {errors.tinNumber && (
                    <p className="text-xs text-destructive">
                      {errors.tinNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("form.phoneNumber", "Phone Number")}</Label>
                  <Input
                    type="tel"
                    placeholder="+251 94 741 4313"
                    inputMode="tel"
                    maxLength={16}
                    {...register("phoneNumber", {
                      setValueAs: (value) =>
                        normalizePhoneNumber(String(value ?? "")),
                    })}
                  />
                  {errors.phoneNumber && (
                    <p className="text-xs text-destructive">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("form.familyMembers", "Number of Family Members")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    {...register("numberOfFamily", { valueAsNumber: true })}
                  />
                  {errors.numberOfFamily && (
                    <p className="text-xs text-destructive">
                      {errors.numberOfFamily.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("form.address", "Address")}</Label>
                  <Input {...register("address")} />
                  {errors.address && (
                    <p className="text-xs text-destructive">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("form.houseZone", "House Number / Zone")}</Label>
                  <Input {...register("houseNumberZone")} />
                  {errors.houseNumberZone && (
                    <p className="text-xs text-destructive">
                      {errors.houseNumberZone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("form.readingZone", "Reading Zone")}</Label>
                  <Controller
                    control={control}
                    name="readingZone"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {readingZoneOptions.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              {language === "am"
                                ? `${zone.am} (${zone.en})`
                                : `${zone.en} (${zone.am})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.readingZone && (
                    <p className="text-xs text-destructive">
                      {errors.readingZone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("form.meterSize", "Meter Size")}</Label>
                  <Controller
                    control={control}
                    name="meterSize"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {renderSelectItems(meterSizeOptions)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.meterSize && (
                    <p className="text-xs text-destructive">
                      {errors.meterSize.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("form.customerGroup", "Customer Group")}</Label>
                  <Controller
                    control={control}
                    name="customerGroup"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customerGroupOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {language === "am"
                                ? `${option.am} (${option.en})`
                                : `${option.en} (${option.am})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.customerGroup && (
                    <p className="text-xs text-destructive">
                      {errors.customerGroup.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("form.connectionType", "Connection Type")}</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {connectionTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {language === "am"
                                ? `${option.am} (${option.en})`
                                : `${option.en} (${option.am})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && (
                    <p className="text-xs text-destructive">
                      {errors.type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("form.serviceType", "Service Type")}</Label>
                  <Input {...register("serviceType")} disabled />
                </div>

                <div className="space-y-2">
                  <Label>{t("form.selectBranch", "Select Branch")}</Label>
                  <Controller
                    control={control}
                    name="branch"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.branch && (
                    <p className="text-xs text-destructive">
                      {errors.branch.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t("form.descriptionOptional", "Description (optional)")}
                </Label>
                <Textarea rows={4} {...register("description")} />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <MapPicker
                latitude={location.latitude}
                longitude={location.longitude}
                onChange={(latitude, longitude) =>
                  setValue(
                    "location",
                    { latitude, longitude },
                    { shouldValidate: true },
                  )
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <DocumentUploadField
                    label={t("form.housePlan", "House Plan")}
                    required
                    uploadFn={uploadFile}
                    valueUrl={watch("housePlan")}
                    onValueChange={(url) =>
                      setValue("housePlan", url, { shouldValidate: true })
                    }
                    onUploadingChange={(uploading) =>
                      setRequiredDocUploading((previous) => ({
                        ...previous,
                        housePlan: uploading,
                      }))
                    }
                  />
                  {errors.housePlan && (
                    <p className="text-xs text-destructive">
                      {errors.housePlan.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <DocumentUploadField
                    label={t("form.idCard", "ID Card")}
                    required
                    uploadFn={uploadFile}
                    valueUrl={watch("idCard")}
                    onValueChange={(url) =>
                      setValue("idCard", url, { shouldValidate: true })
                    }
                    onUploadingChange={(uploading) =>
                      setRequiredDocUploading((previous) => ({
                        ...previous,
                        idCard: uploading,
                      }))
                    }
                  />
                  {errors.idCard && (
                    <p className="text-xs text-destructive">
                      {errors.idCard.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {t(
                      "form.additionalAttachments",
                      "Additional Attachments (optional)",
                    )}
                  </Label>
                  <input
                    ref={attachmentsInputRef}
                    multiple
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                    aria-label={t(
                      "form.additionalAttachmentsInput",
                      "Additional attachments file input",
                    )}
                    title={t(
                      "form.additionalAttachmentsInput",
                      "Additional attachments file input",
                    )}
                    onChange={uploadAttachments}
                    className="hidden"
                  />
                  <input
                    ref={replaceAttachmentInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                    aria-label={t(
                      "form.changeAttachmentInput",
                      "Change attachment file input",
                    )}
                    title={t(
                      "form.changeAttachmentInput",
                      "Change attachment file input",
                    )}
                    onChange={replaceAttachment}
                    className="hidden"
                  />
                  {attachments.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={openAdditionalAttachmentPicker}
                        disabled={attachmentsUploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {attachmentsUploading
                          ? t(
                              "form.uploadingAttachments",
                              "Uploading attachments...",
                            )
                          : t("form.uploadDocument", "Upload document")}
                      </Button>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      {attachments.map((url, index) => {
                        const kind = getDocumentKind(url);
                        const fileLabel = getAttachmentLabel(url, index);
                        const meta = attachmentMeta[index];

                        return (
                          <div
                            key={`${url}-${index}`}
                            className="rounded-2xl border p-3"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              {kind === "image" ? (
                                <ImageIcon className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {fileLabel}
                                </p>
                                {meta?.size ? (
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(meta.size)}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {kind === "image" ? (
                              <img
                                src={url}
                                alt={fileLabel}
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
                                onClick={() =>
                                  setAttachmentPreview({
                                    title: fileLabel,
                                    url,
                                  })
                                }
                              >
                                <Eye className="mr-1 h-4 w-4" /> View
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openReplaceAttachmentPicker(index)
                                }
                                disabled={attachmentsUploading}
                              >
                                <RefreshCcw className="mr-1 h-4 w-4" /> Change
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeAttachment(index)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {attachmentPreview && (
                <DocumentPreviewModal
                  open={Boolean(attachmentPreview)}
                  title={attachmentPreview.title}
                  url={attachmentPreview.url}
                  onOpenChange={(open) => {
                    if (!open) {
                      setAttachmentPreview(null);
                    }
                  }}
                />
              )}

              <div className="flex flex-wrap gap-2">
                {!isAdjustmentMode && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      disabled={!formState.isDirty}
                    >
                      Save as Draft
                    </Button>
                    {savedDraft && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearDraft}
                      >
                        Discard Draft
                      </Button>
                    )}
                  </>
                )}

                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    attachmentsUploading ||
                    requiredDocUploading.housePlan ||
                    requiredDocUploading.idCard
                  }
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {submitting
                    ? t("form.submitting", "Submitting...")
                    : isAdjustmentMode
                      ? "Update and Resubmit"
                      : t("form.submitRequest", "Submit Request")}
                </Button>
              </div>

              {savedDraft && !isAdjustmentMode ? (
                <p className="text-xs text-muted-foreground">
                  Draft last saved:{" "}
                  {new Date(savedDraft.savedAt).toLocaleString()}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

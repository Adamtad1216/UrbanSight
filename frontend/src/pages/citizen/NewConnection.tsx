import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { apiRequest, uploadFile } from "@/lib/api";
import { DocumentUploadField } from "@/components/request/DocumentUploadField";
import { isAllowedUploadType } from "@/components/request/document-utils";
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
import { useSuccessModal } from "@/hooks/use-success-modal";
import { useLanguage } from "@/hooks/use-language";

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
const phoneErrorMessage = "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "").trim();
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
    .regex(amharicNameRegex, "Customer name in Amharic must use Amharic letters only"),
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
  readingZone: z.enum(readingZoneOptions.map((item) => item.value) as [string, ...string[]]),
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
  const { toast } = useToast();
  const { openModal } = useSuccessModal();
  const { t, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [requiredDocUploading, setRequiredDocUploading] = useState({
    housePlan: false,
    idCard: false,
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
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
    const invalidTypeFile = selectedFiles.find((file) => !isAllowedUploadType(file));
    if (invalidTypeFile) {
      toast({
        title: "Invalid file type",
        description: "Attachments support image and PDF files only.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const tooLargeFile = selectedFiles.find((file) => file.size > MAX_UPLOAD_BYTES);
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
      const uploadedUrls = await Promise.all(
        selectedFiles.map((file) => uploadFile(file)),
      );
      setValue("attachments", [...attachments, ...uploadedUrls], {
        shouldValidate: true,
      });
      toast({
        title: "Attachments uploaded",
        description: `${uploadedUrls.length} file(s) uploaded.`,
      });
    } catch (error) {
      handleUploadError(error);
    } finally {
      setAttachmentsUploading(false);
      event.target.value = "";
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
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
    } catch (error) {
      toast({
        title: "Submission failed",
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
          {t("citizen.newConnection.title", "New Water Connection")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            "citizen.newConnection.subtitle",
            "Submit a new connection request",
          )}
        </p>
      </motion.div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                        const sanitized = event.target.value.replace(/[^\u1200-\u137F\s]/g, "");
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
                    setValueAs: (value) => normalizePhoneNumber(String(value ?? "")),
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  <p className="text-xs text-destructive">{errors.type.message}</p>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  label={t("form.housePlanRequired", "House Plan")}
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
                  label={t("form.idCardRequired", "ID Card")}
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
                <Input multiple type="file" onChange={uploadAttachments} />
                {attachmentsUploading && (
                  <p className="text-xs text-muted-foreground">
                    {t("form.uploadingAttachments", "Uploading attachments...")}
                  </p>
                )}
                {attachments.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {attachments.length}{" "}
                    {t("form.attachmentsUploaded", "attachment(s) uploaded")}
                  </p>
                )}
              </div>
            </div>

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
                : t("form.submitRequest", "Submit Request")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

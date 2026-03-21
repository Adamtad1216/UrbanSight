import { useRef, useState } from "react";
import {
  Eye,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  formatFileSize,
  getDocumentKind,
  isAllowedUploadType,
} from "@/components/request/document-utils";
import { DocumentPreviewModal } from "@/components/request/DocumentPreviewModal";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface DocumentUploadFieldProps {
  label: string;
  required?: boolean;
  valueUrl?: string;
  onValueChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  uploadFn: (file: File) => Promise<string>;
}

interface LocalDocumentState {
  fileName: string;
  size: number;
  url: string;
  kind: "image" | "pdf" | "file";
}

export function DocumentUploadField({
  label,
  required,
  valueUrl,
  onValueChange,
  onUploadingChange,
  uploadFn,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentState, setDocumentState] = useState<LocalDocumentState | null>(
    valueUrl
      ? {
          fileName: label,
          size: 0,
          url: valueUrl,
          kind: getDocumentKind(valueUrl),
        }
      : null,
  );

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const clearDocument = () => {
    setDocumentState(null);
    onValueChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

    try {
      setUploading(true);
      onUploadingChange?.(true);
      const uploadedUrl = await uploadFn(file);
      const kind = getDocumentKind(uploadedUrl, file.type);
      setDocumentState({
        fileName: file.name,
        size: file.size,
        url: uploadedUrl,
        kind,
      });
      onValueChange(uploadedUrl);
      toast({ title: `${label} uploaded` });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " (required)" : ""}
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
        aria-label={`${label} file input`}
        title={label}
        onChange={onFileSelected}
        className="hidden"
      />

      {!documentState ? (
        <div className="rounded-2xl border border-dashed p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openFilePicker}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload document"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border p-3">
          <div className="mb-3 flex items-center gap-2">
            {documentState.kind === "image" ? (
              <ImageIcon className="h-4 w-4 text-primary" />
            ) : (
              <FileText className="h-4 w-4 text-primary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {documentState.fileName}
              </p>
              {documentState.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(documentState.size)}
                </p>
              )}
            </div>
          </div>

          {documentState.kind === "image" ? (
            <img
              src={documentState.url}
              alt={documentState.fileName}
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
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1 h-4 w-4" /> View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openFilePicker}
            >
              <RefreshCcw className="mr-1 h-4 w-4" /> Change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearDocument}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      )}

      {documentState && (
        <DocumentPreviewModal
          open={previewOpen}
          title={documentState.fileName}
          url={documentState.url}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  );
}

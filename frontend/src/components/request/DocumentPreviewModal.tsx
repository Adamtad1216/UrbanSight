import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";
import {
  DocumentKind,
  getDocumentKind,
} from "@/components/request/document-utils";

interface DocumentPreviewModalProps {
  open: boolean;
  title: string;
  url: string;
  mimeType?: string;
  onOpenChange: (open: boolean) => void;
}

function DocumentBody({
  kind,
  title,
  url,
}: {
  kind: DocumentKind;
  title: string;
  url: string;
}) {
  if (kind === "image") {
    return (
      <div className="rounded-2xl border bg-muted/20 p-2">
        <img
          src={url}
          alt={title}
          className="max-h-[72vh] w-full rounded-xl object-contain"
        />
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        title={title}
        src={url}
        className="h-[72vh] w-full rounded-2xl border"
      />
    );
  }

  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      Preview is not available for this file type.
    </div>
  );
}

export function DocumentPreviewModal({
  open,
  title,
  url,
  mimeType,
  onOpenChange,
}: DocumentPreviewModalProps) {
  const kind = getDocumentKind(url, mimeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-8">
            <span className="truncate">{title}</span>
            <span className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={url} download target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Fullscreen
                </a>
              </Button>
            </span>
          </DialogTitle>
        </DialogHeader>

        <DocumentBody kind={kind} title={title} url={url} />
      </DialogContent>
    </Dialog>
  );
}

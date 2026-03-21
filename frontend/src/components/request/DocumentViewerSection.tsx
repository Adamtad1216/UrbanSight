import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentPreviewModal } from "@/components/request/DocumentPreviewModal";
import { getDocumentKind } from "@/components/request/document-utils";

export interface DocumentItem {
  id: string;
  label: string;
  url: string;
}

interface DocumentViewerSectionProps {
  title?: string;
  documents: DocumentItem[];
}

export function DocumentViewerSection({
  title = "Documents",
  documents,
}: DocumentViewerSectionProps) {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId),
    [activeDocumentId, documents],
  );

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((document, index) => {
              const kind = getDocumentKind(document.url);
              return (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border bg-card p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {kind === "image" ? (
                        <ImageIcon className="h-4 w-4 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                      <p className="text-sm font-medium">{document.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {kind}
                    </Badge>
                  </div>

                  {kind === "image" ? (
                    <img
                      src={document.url}
                      alt={document.label}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-xl bg-muted/30">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveDocumentId(document.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={document.url} download target="_blank" rel="noreferrer">
                        Download
                      </a>
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={document.url} target="_blank" rel="noreferrer">
                        Fullscreen
                      </a>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>

      {activeDocument && (
        <DocumentPreviewModal
          open={Boolean(activeDocument)}
          title={activeDocument.label}
          url={activeDocument.url}
          onOpenChange={(open) => {
            if (!open) setActiveDocumentId(null);
          }}
        />
      )}
    </Card>
  );
}

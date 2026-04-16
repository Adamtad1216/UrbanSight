import { Link } from "react-router-dom";
import { ArrowRight, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NewConnectionDraftPreview,
  NewConnectionDraftRecord,
  summarizeNewConnectionDraft,
} from "@/lib/citizen-draft";

interface CitizenDraftCardProps {
  draft: NewConnectionDraftRecord<NewConnectionDraftPreview>;
  onDelete: () => void;
  continueTo?: string;
}

export function CitizenDraftCard({
  draft,
  onDelete,
  continueTo = "/citizen/new-connection?draft=continue",
}: CitizenDraftCardProps) {
  const summary = summarizeNewConnectionDraft(draft);

  return (
    <Card className="rounded-2xl border-amber-300/50 bg-amber-50/80 dark:bg-amber-950/20 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300 font-semibold">
              Saved Draft
            </p>
            <h3 className="mt-1 text-lg font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              {summary.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.subtitle}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <p>{summary.savedLabel}</p>
            <p>{summary.attachmentLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link to={continueTo}>
              Continue Draft <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete Draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

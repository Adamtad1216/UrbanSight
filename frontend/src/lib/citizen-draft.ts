export const NEW_CONNECTION_DRAFT_KEY = "citizen.newConnection.draft.v1";

export interface DraftAttachmentMeta {
  fileName: string;
  size: number;
}

export interface NewConnectionDraftRecord<TValues = Record<string, unknown>> {
  values: TValues;
  attachmentMeta: DraftAttachmentMeta[];
  savedAt: number;
}

export interface NewConnectionDraftPreview {
  customerName?: string;
  email?: string;
  branch?: string;
  readingZone?: string;
  address?: string;
  houseNumberZone?: string;
  numberOfFamily?: number;
}

export interface NewConnectionDraftSummary {
  title: string;
  subtitle: string;
  savedLabel: string;
  attachmentLabel: string;
}

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function readNewConnectionDraft<TValues = Record<string, unknown>>() {
  if (!canUseLocalStorage()) return null;

  const storedValue = window.localStorage.getItem(NEW_CONNECTION_DRAFT_KEY);
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue) as NewConnectionDraftRecord<TValues>;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeNewConnectionDraft<TValues>(
  draft: NewConnectionDraftRecord<TValues>,
) {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(NEW_CONNECTION_DRAFT_KEY, JSON.stringify(draft));
}

export function deleteNewConnectionDraft() {
  if (!canUseLocalStorage()) return;

  window.localStorage.removeItem(NEW_CONNECTION_DRAFT_KEY);
}

export function hasNewConnectionDraft() {
  return Boolean(readNewConnectionDraft());
}

export function summarizeNewConnectionDraft(
  draft: NewConnectionDraftRecord<NewConnectionDraftPreview>,
): NewConnectionDraftSummary {
  const title =
    draft.values.customerName?.trim() ||
    draft.values.email?.trim() ||
    "Draft application";

  const subtitleParts = [
    draft.values.address?.trim(),
    draft.values.branch?.trim(),
    draft.values.readingZone?.trim(),
    draft.values.houseNumberZone?.trim(),
  ].filter(Boolean);

  const subtitle = subtitleParts.length
    ? subtitleParts.slice(0, 2).join(" • ")
    : "Continue where you paused";

  const attachmentCount = draft.attachmentMeta.length;

  return {
    title,
    subtitle,
    savedLabel: `Saved ${new Date(draft.savedAt).toLocaleString()}`,
    attachmentLabel:
      attachmentCount === 0
        ? "No attachments yet"
        : `${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`,
  };
}

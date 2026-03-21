export type DocumentKind = "image" | "pdf" | "file";

const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export function getDocumentKind(url: string, mimeType?: string): DocumentKind {
  const lowerUrl = url.toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  if (lowerMime === "application/pdf" || lowerUrl.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lowerMime.startsWith("image/") ||
    imageExtensions.some((extension) => lowerUrl.endsWith(extension))
  ) {
    return "image";
  }

  return "file";
}

export function isAllowedUploadType(file: File) {
  const allowedMimeTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".gif")
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

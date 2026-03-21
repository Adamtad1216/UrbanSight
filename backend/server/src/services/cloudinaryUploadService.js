import cloudinary from "../config/cloudinary.js";

const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function validateReceiptFile(file) {
  if (!file) {
    throw new Error("Receipt file is required");
  }

  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype)) {
    throw new Error("Receipt must be an image or PDF file");
  }
}

export async function uploadBufferToCloudinary(
  file,
  folder = "urbansight/payments",
) {
  validateReceiptFile(file);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

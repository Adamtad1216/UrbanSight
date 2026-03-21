import cloudinary from "../config/cloudinary.js";
import { sendError, sendOk } from "../utils/response.js";

export async function uploadToCloudinary(req, res) {
  if (!req.file) {
    return sendError(res, 400, "No file provided");
  }

  const hasCloudinaryConfig =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinaryConfig) {
    return sendError(res, 500, "Cloudinary is not configured on the server");
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "urbansight",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(req.file.buffer);
  });

  return sendOk(res, {
    file: {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    },
  });
}

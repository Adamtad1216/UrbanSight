import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { sendError, sendOk } from "../utils/response.js";

export async function uploadToCloudinary(req, res) {
  if (!req.file) {
    return sendError(res, 400, "No file provided");
  }

  const hasCloudinaryConfig =
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret;

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

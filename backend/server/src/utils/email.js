import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function getTransport() {
  if (env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass) {
    return nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  // Non-production fallback transport for local development/testing.
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendStaffCredentialsEmail({ name, email, tempPassword }) {
  const transporter = getTransport();

  await transporter.sendMail({
    from: env.emailFrom,
    to: email,
    subject: "UrbanSight Staff Account Credentials",
    text: `Hello ${name},\n\nYour staff account has been created.\n\nLogin email: ${email}\nTemporary password: ${tempPassword}\n\nFor security, you must change your password immediately after first login.\n\nRegards,\nUrbanSight Admin`,
  });
}

export async function sendNotificationEmail({ name, email, subject, message }) {
  if (!email) {
    return;
  }

  const transporter = getTransport();
  const safeName = String(name || "User").trim() || "User";

  await transporter.sendMail({
    from: env.emailFrom,
    to: email,
    subject,
    text: `Hello ${safeName},\n\n${message}\n\nRegards,\nUrbanSight Team`,
  });
}

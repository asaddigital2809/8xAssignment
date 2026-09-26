import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

type Mail = { to: string; subject: string; text: string; html: string };

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return undefined;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Sends via SMTP (Ethereal/Mailtrap in this project). Without SMTP configured in
 * development, the email is printed to the server console instead so flows stay testable.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured (SMTP_HOST).");
    console.info(`\n[mail] To: ${mail.to}\n[mail] Subject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const info = await t.sendMail({ from: process.env.EMAIL_FROM ?? "amzn.clone <no-reply@amzn.clone>", ...mail });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.info(`[mail] Preview (${mail.subject} → ${mail.to}): ${preview}`);
}

function layout(title: string, body: string, cta: { href: string; label: string }): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
  <h2>${title}</h2><p>${body}</p>
  <p><a href="${cta.href}" style="display:inline-block;background:#fbbf24;color:#111;padding:10px 18px;border-radius:999px;text-decoration:none">${cta.label}</a></p>
  <p style="color:#666;font-size:12px">If the button doesn't work, paste this link into your browser:<br>${cta.href}</p>
</div>`;
}

export function activationEmail(to: string, link: string): Mail {
  return {
    to,
    subject: "Activate your amzn.clone account",
    text: `Welcome! Activate your account (link valid for 24 hours):\n${link}`,
    html: layout("Welcome to amzn.clone", "Confirm your email to activate your account. The link is valid for 24 hours.", {
      href: link,
      label: "Activate account",
    }),
  };
}

export function passwordResetEmail(to: string, link: string): Mail {
  return {
    to,
    subject: "Reset your amzn.clone password",
    text: `Reset your password (link valid for 1 hour). If you didn't ask for this, ignore this email.\n${link}`,
    html: layout(
      "Reset your password",
      "Someone asked to reset the password for this account. The link is valid for 1 hour. If it wasn't you, ignore this email.",
      { href: link, label: "Choose a new password" },
    ),
  };
}

export function alreadyRegisteredEmail(to: string, link: string): Mail {
  return {
    to,
    subject: "You already have an amzn.clone account",
    text: `Someone tried to register with this email, but it already has an account. Forgot your password? Reset it here:\n${link}`,
    html: layout(
      "You already have an account",
      "Someone tried to register with this email, but it already has an account. If that was you and you've forgotten your password, you can reset it.",
      { href: link, label: "Reset password" },
    ),
  };
}

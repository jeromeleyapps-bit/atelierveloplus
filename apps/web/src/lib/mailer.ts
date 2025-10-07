import nodemailer from "nodemailer";

export type MailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  if (host && port && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // Pour éviter les erreurs de certificat
      }
    });
  } else {
    transporter = null; // No SMTP configured
  }
  return transporter;
}

export default async function sendMail({ to, subject, text, html }: MailInput) {
  const from = process.env.FROM_EMAIL || process.env.SHOP_EMAIL || "no-reply@localhost";
  const t = getTransporter();
  if (!t) {
    console.log("[mailer] SMTP not configured. Email would be sent:", { to, subject, text });
    return { queued: false, reason: "smtp_not_configured" };
  }
  const info = await t.sendMail({ from, to, subject, text, html });
  return { queued: true, messageId: info.messageId };
}

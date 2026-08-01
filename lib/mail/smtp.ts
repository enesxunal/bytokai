import "server-only";

import nodemailer from "nodemailer";

import { getSmtpConfig, type SmtpConfig } from "@/lib/mail/smtp-config";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

type CachedTransport = {
  configKey: string;
  transporter: ReturnType<typeof nodemailer.createTransport>;
  config: SmtpConfig;
};

let cached: CachedTransport | null = null;

function configKey(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.secure}:${config.user}:${config.mailFrom}`;
}

export function getMailTransporter(): {
  transporter: ReturnType<typeof nodemailer.createTransport>;
  config: SmtpConfig;
} | null {
  const config = getSmtpConfig();
  if (!config) return null;

  const key = configKey(config);
  if (cached && cached.configKey === key) {
    return { transporter: cached.transporter, config: cached.config };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });

  cached = { configKey: key, transporter, config };
  return { transporter, config };
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const mail = getMailTransporter();
  if (!mail) {
    throw new Error("smtp_not_configured");
  }

  await mail.transporter.sendMail({
    from: mail.config.mailFrom,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

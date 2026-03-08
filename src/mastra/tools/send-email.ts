import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import nodemailer from 'nodemailer';

function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const sendEmail = createTool({
  id: 'send-email',
  description:
    'Send results, paper digests, or implementation sketches to a user\'s email. ' +
    'Only use this when the user explicitly asks to email results. ' +
    'Email is optional — if SMTP is not configured, inform the user how to set it up.',
  inputSchema: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    html: z.string().describe('HTML body of the email'),
    from: z.string().optional().describe('Sender address (defaults to SMTP_FROM or SMTP_USER)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional(),
    setupInstructions: z.string().optional(),
  }),
  execute: async ({ to, subject, html, from }) => {
    if (!isSmtpConfigured()) {
      return {
        success: false,
        setupInstructions:
          'Email is not configured. To enable it, add these to your .env file:\n\n' +
          'SMTP_USER=you@gmail.com\n' +
          'SMTP_PASS=your-gmail-app-password\n\n' +
          'For Gmail: go to myaccount.google.com/apppasswords to generate an app password.',
      };
    }

    const transporter = createTransport();
    const fromEmail = from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';

    try {
      const info = await transporter.sendMail({ from: fromEmail, to, subject, html });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
});

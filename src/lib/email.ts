import nodemailer from 'nodemailer';
import prisma from './db';
import fs from 'fs';
import path from 'path';

// Load credentials from environment
const smtpHost = process.env.EMAIL_SMTP_HOST;
const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || '2525');
const smtpUser = process.env.EMAIL_SMTP_USER;
const smtpPass = process.env.EMAIL_SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM || 'noreply@ticketbooking.com';

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  let status = 'SENT';
  const plainText = html.replace(/<[^>]*>/g, ''); // Simple HTML strip

  try {
    if (process.env.EMAIL_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(JSON.stringify(errData));
      }
      console.log(`Email successfully sent to ${to} via Resend: ${subject}`);
    } else if (smtpUser && smtpPass) {
      await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
      });
      console.log(`Email successfully sent to ${to}: ${subject}`);
    } else {
      // Fallback: log to console and local file
      console.log(`[SIMULATED EMAIL] Sending to ${to}...`);
      console.log(`Subject: ${subject}`);
      
      const logDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'emails.log');
      const logMessage = `[${new Date().toISOString()}] To: ${to}\nSubject: ${subject}\nBody:\n${plainText}\n----------------------------------------\n`;
      fs.appendFileSync(logFile, logMessage);
    }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    status = 'FAILED';
  }

  // Create EmailLog database record
  try {
    await prisma.emailLog.create({
      data: {
        recipient: to,
        subject,
        body: plainText.substring(0, 1000), // Store preview in DB
        status,
      },
    });
  } catch (e) {
    console.error('Failed to log email to database:', e);
  }
}

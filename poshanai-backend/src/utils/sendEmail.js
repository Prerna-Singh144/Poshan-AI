import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export async function sendEmail({ to, subject, text, html }) {
  if (process.env.NODE_ENV === 'test') return null;

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
      throw new Error('Email delivery is not configured.');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject,
      text,
      html,
    });
    if (error || !data?.id) throw new Error('Email delivery failed.');
    return data;
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Email delivery is not configured.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

export default sendEmail;

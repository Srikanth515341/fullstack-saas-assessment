// Stub transactional email sender. No email provider is wired up yet, so this
// logs the message instead of sending it — every call site (password reset,
// email verification, team invitations) is already correct and only needs
// this function's body swapped out once a real provider is configured.
//
// To wire up Resend for real:
//   1. pnpm add resend
//   2. Add RESEND_API_KEY to .env
//   3. Replace the body below with:
//        import { Resend } from 'resend';
//        const resend = new Resend(process.env.RESEND_API_KEY);
//        await resend.emails.send({ from: 'you@yourdomain.com', to, subject, html });

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (process.env.RESEND_API_KEY) {
    console.warn(
      'RESEND_API_KEY is set but lib/email/send.ts still has the stub implementation — wire up the Resend SDK call to actually send email.'
    );
  }

  console.log('--- Stub email (no provider configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(html);
  console.log('--------------------------------------------');
}

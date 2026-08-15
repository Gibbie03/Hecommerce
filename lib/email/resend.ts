import { Resend } from "resend";

export interface SendEmailResult {
  sent: boolean;
  reason?: "not_configured" | "send_failed";
}

async function sendEmail(to: string, subject: string, text: string): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // No provider configured yet. In local dev this is the honest state —
    // we don't fake delivery. Log so the code is still usable for testing.
    console.log(`[email not configured] to=${to} subject="${subject}"\n${text}`);
    return { sent: false, reason: "not_configured" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Icommerce <onboarding@icommerce.ng>";

  try {
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) {
      console.error("Resend send error", error);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email via Resend", err);
    return { sent: false, reason: "send_failed" };
  }
}

export function sendLoginCodeEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail(
    to,
    "Your Icommerce sign-in code",
    `Your Icommerce sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
  );
}

export function sendBusinessVerificationEmail(
  to: string,
  code: string,
  businessName: string,
): Promise<SendEmailResult> {
  return sendEmail(
    to,
    `Verify ${businessName} on Icommerce`,
    `Your verification code for ${businessName} is ${code}. It expires in 10 minutes.\n\nEntering this code confirms you represent this business.`,
  );
}

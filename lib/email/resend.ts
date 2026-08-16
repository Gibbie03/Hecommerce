import { Resend } from "resend";

export interface SendEmailResult {
  sent: boolean;
  reason?: "not_configured" | "send_failed";
}

async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<SendEmailResult> {
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
    const { error } = await resend.emails.send(html ? { from, to, subject, text, html } : { from, to, subject, text });
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

function magicLinkHtml(url: string, logoUrl: string, expiresMinutes: number): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f1efe8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#faf8f4;border:1px solid #e5e1d8;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <img src="${logoUrl}" width="28" height="28" alt="Icommerce" style="display:block;margin-bottom:16px;" />
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;color:#201e1a;">Sign in to Icommerce</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6f6b60;">
                  Someone requested a secure sign-in link for this email address. Click the button below to
                  continue — this confirms you control this inbox.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background:#123c2e;">
                      <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#faf8f4;text-decoration:none;border-radius:999px;">
                        Verify my email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 4px;font-size:12px;line-height:1.6;color:#6f6b60;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.6;word-break:break-all;">
                  <a href="${url}" style="color:#123c2e;">${url}</a>
                </p>
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#6f6b60;">
                  This link expires in ${expiresMinutes} minutes and can only be used once.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6b60;">
                  If you didn't request this, you can safely ignore this email — no account changes were made.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function magicLinkText(url: string, expiresMinutes: number): string {
  return [
    "Sign in to Icommerce",
    "",
    "Someone requested a secure sign-in link for this email address.",
    "Open the link below to continue — this confirms you control this inbox.",
    "",
    url,
    "",
    `This link expires in ${expiresMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email — no account changes were made.",
  ].join("\n");
}

export function sendMagicLinkEmail(to: string, url: string, expiresMinutes: number): Promise<SendEmailResult> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const logoUrl = `${appUrl}/brand/icommerce-mark.png`;
  return sendEmail(
    to,
    "Your Icommerce sign-in link",
    magicLinkText(url, expiresMinutes),
    magicLinkHtml(url, logoUrl, expiresMinutes),
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

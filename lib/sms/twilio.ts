export interface SendSmsResult {
  sent: boolean;
  reason?: "not_configured" | "send_failed";
}

async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    // No provider configured yet. Don't fake delivery — log so the code is
    // still usable for testing, same pattern as lib/email/resend.ts.
    console.log(`[sms not configured] to=${to}\n${body}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    if (!res.ok) {
      console.error("Twilio send error", res.status, await res.text().catch(() => ""));
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error("Failed to send SMS via Twilio", err);
    return { sent: false, reason: "send_failed" };
  }
}

export function sendLoginCodeSms(to: string, code: string): Promise<SendSmsResult> {
  return sendSms(to, `Your Icommerce sign-in code is ${code}. It expires in 10 minutes.`);
}

export function sendBusinessVerificationSms(
  to: string,
  code: string,
  businessName: string,
): Promise<SendSmsResult> {
  return sendSms(
    to,
    `Your Icommerce verification code for ${businessName} is ${code}. It expires in 10 minutes. Entering it confirms you represent this business.`,
  );
}

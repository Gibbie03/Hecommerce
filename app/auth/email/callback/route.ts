import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth/magicLink";
import { createSession } from "@/lib/auth/session";
import { applyOnboardingDraft } from "@/lib/business/mutations";
import { rateLimit, clientIp } from "@/lib/rateLimit";

function errorRedirect(req: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL("/auth/email/error", req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function destinationRedirect(req: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  // Generous relative to request-side limits — a real click is one request,
  // but browsers/extensions can retry a pending navigation. Still bounds
  // brute-force attempts against this endpoint, per the repo's existing
  // rate-limit conventions (lib/rateLimit.ts).
  if (!rateLimit(`magic-link-verify:ip:${ip}`, 20, 10 * 60 * 1000).ok) {
    return errorRedirect(req);
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token || typeof token !== "string" || token.length < 16 || token.length > 512) {
    return errorRedirect(req);
  }

  // Never let a DB/session error leak a stack trace or internal detail to
  // the browser — any unexpected failure here is indistinguishable from an
  // invalid/expired link to the caller.
  let result;
  try {
    result = await consumeMagicLink(token);
  } catch (err) {
    console.error("Magic link consumption failed", err);
    return errorRedirect(req);
  }

  if (!result) {
    return errorRedirect(req);
  }

  const { identity, continuation } = result;

  try {
    await createSession(identity);
  } catch (err) {
    console.error("Session creation failed after magic-link verification", err);
    return errorRedirect(req);
  }

  // Clicking the link only proves control of the inbox — it must never by
  // itself mark a business as verified, bypass phone/manual verification,
  // or affect publishing rules. It only ever does what OTP sign-in already
  // does: establish a session, then (if this was a create/claim flow)
  // apply the pending draft exactly as /api/business/claim would.
  if (continuation) {
    try {
      const { businessId } = await applyOnboardingDraft(identity.userId, continuation);
      return destinationRedirect(req, `/verify/${businessId}`);
    } catch (err) {
      // The user IS validly signed in at this point — only the draft
      // application failed (e.g. the business was claimed by someone else
      // in the meantime). Send them to /dashboard, which itself redirects
      // to /onboarding if they have no active business, rather than
      // exposing the specific failure reason here.
      console.error("Applying onboarding draft after magic-link sign-in failed", err);
      return destinationRedirect(req, "/dashboard");
    }
  }

  return destinationRedirect(req, "/dashboard");
}

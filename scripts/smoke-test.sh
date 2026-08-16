#!/usr/bin/env bash
# Automated slice of the production/preview smoke test (step 8). Covers
# what's safely scriptable without creating real accounts/businesses on a
# live deployment — the same checks already proven during this project's
# local security audit, re-pointed at a real URL. See
# docs/PRODUCTION_DEPLOYMENT.md for the manual checklist that covers the
# rest (real email/SMS OTP delivery, live claim -> verify -> publish,
# cross-tenant spot check with two real accounts, Storage image rendering).
#
# Usage:
#   SMOKE_TEST_URL="https://your-preview-or-prod-url" bash scripts/smoke-test.sh
set -uo pipefail

: "${SMOKE_TEST_URL:?Set SMOKE_TEST_URL to the deployment URL, e.g. https://icommerce-xyz.vercel.app}"
URL="${SMOKE_TEST_URL%/}"

pass=0
fail=0

check_status() {
  local desc="$1" method="$2" path="$3" expected_pattern="$4" body="${5:-}"
  local actual
  if [ -n "$body" ]; then
    actual=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" -X "$method" "$URL$path" \
      -H "Content-Type: application/json" -d "$body")
  else
    actual=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" -X "$method" "$URL$path")
  fi
  if [[ "$actual" =~ $expected_pattern ]]; then
    echo "PASS  $desc ($actual)"
    pass=$((pass + 1))
  else
    echo "FAIL  $desc (expected $expected_pattern, got $actual)"
    fail=$((fail + 1))
  fi
}

echo "Running smoke tests against $URL"
echo

check_status "landing page loads"                      GET  "/"                                   '^200$'
check_status "onboarding page loads"                    GET  "/onboarding"                          '^200$'
check_status "nonexistent business site 404s"           GET  "/this-slug-should-not-exist-xyz"      '^404$'
check_status "agent API 404s for nonexistent business"  GET  "/api/agent/businesses/this-slug-should-not-exist-xyz" '^404$'
check_status "agent API search responds"                GET  "/api/agent/businesses?q=test"         '^200$'
check_status "unauthenticated dashboard redirects"      GET  "/dashboard"                           '^30[0-9]$'

echo
echo "SSRF guard (lib/import/scrape.ts) — each of these must be rejected, not attempted:"
check_status "  rejects loopback target"     POST "/api/import/website" '^422$' '{"url":"http://127.0.0.1/"}'
check_status "  rejects private IP target"   POST "/api/import/website" '^422$' '{"url":"http://192.168.1.1/"}'
check_status "  rejects non-http scheme"     POST "/api/import/website" '^422$' '{"url":"file:///etc/passwd"}'

echo
echo "Malformed input doesn't leak internals:"
resp=$(curl -sS -m 15 -X POST "$URL/api/auth/request-code" -H "Content-Type: application/json" -d 'not json')
if echo "$resp" | grep -qiE 'at Object\.|node_modules|\.js:[0-9]+:[0-9]+'; then
  echo "FAIL  malformed request leaked a stack trace: $resp"
  fail=$((fail + 1))
else
  echo "PASS  malformed request returned a clean error"
  pass=$((pass + 1))
fi

echo
echo "Auth rate limiting (5 requests/10min per IP on /api/auth/request-code):"
last_code=200
for i in 1 2 3 4 5 6; do
  last_code=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" -X POST "$URL/api/auth/request-code" \
    -H "Content-Type: application/json" -d '{"method":"email","value":"smoke-test-ratelimit@example.com"}')
done
if [ "$last_code" = "429" ]; then
  echo "PASS  6th request in a burst is rate-limited (429)"
  pass=$((pass + 1))
else
  echo "FAIL  6th request in a burst was not rate-limited (got $last_code) — check lib/rateLimit.ts is active"
  fail=$((fail + 1))
fi

echo
echo "Magic-link email auth:"
check_status "sign-in page loads" GET "/signin" '^200$'
check_status "magic-link request rejects malformed email" POST "/api/auth/magic-link/request" '^400$' '{"email":"not-an-email"}'

# Account enumeration: an existing-shaped email and a made-up one must get
# a byte-for-byte identical response — distinct X-Forwarded-For per call so
# this check doesn't collide with the IP rate limiter below.
resp_a=$(curl -sS -m 15 -X POST "$URL/api/auth/magic-link/request" -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.77.1.1" -d '{"email":"smoke-test-magiclink-a@example.com"}')
resp_b=$(curl -sS -m 15 -X POST "$URL/api/auth/magic-link/request" -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 10.77.1.2" -d '{"email":"smoke-test-magiclink-b@example.com"}')
if [ "$resp_a" = "$resp_b" ] && [ "$resp_a" = '{"ok":true}' ]; then
  echo "PASS  magic-link request response is identical regardless of account existence"
  pass=$((pass + 1))
else
  echo "FAIL  magic-link request responses differ (account enumeration risk): a=$resp_a b=$resp_b"
  fail=$((fail + 1))
fi

echo
echo "Magic-link callback fails safely for bad tokens (no session, no stack trace):"
missing_loc=$(curl -sS -o /dev/null -m 15 -w "%{redirect_url}" "$URL/auth/email/callback")
if [[ "$missing_loc" == *"/auth/email/error"* ]]; then
  echo "PASS  missing token redirects to the error page"
  pass=$((pass + 1))
else
  echo "FAIL  missing token did not redirect to the error page (got: $missing_loc)"
  fail=$((fail + 1))
fi

garbage_loc=$(curl -sS -o /dev/null -m 15 -w "%{redirect_url}" \
  "$URL/auth/email/callback?token=not-a-real-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
if [[ "$garbage_loc" == *"/auth/email/error"* ]]; then
  echo "PASS  invalid token redirects to the error page"
  pass=$((pass + 1))
else
  echo "FAIL  invalid token did not redirect to the error page (got: $garbage_loc)"
  fail=$((fail + 1))
fi

echo
echo "Magic-link rate limiting (5 requests/10min per IP on /api/auth/magic-link/request):"
last_code=200
for i in 1 2 3 4 5 6; do
  last_code=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" -X POST "$URL/api/auth/magic-link/request" \
    -H "Content-Type: application/json" -H "X-Forwarded-For: 10.77.2.1" \
    -d '{"email":"smoke-test-magiclink-ratelimit@example.com"}')
done
if [ "$last_code" = "429" ]; then
  echo "PASS  6th request in a burst is rate-limited (429)"
  pass=$((pass + 1))
else
  echo "FAIL  6th request in a burst was not rate-limited (got $last_code)"
  fail=$((fail + 1))
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]



# Fix Google Calendar Auth CORS

## Problem
The `google-calendar-auth` function still uses a **restrictive origin whitelist** (`ALLOWED_ORIGINS` array + `getCorsHeaders()` function) instead of the simple wildcard CORS pattern. If the browser's origin doesn't exactly match one of the hardcoded URLs, the preflight `OPTIONS` request fails and the browser blocks the call entirely — resulting in "Failed to send a request to the Edge Function."

The `disconnect` and `sync` functions were already fixed to use `"Access-Control-Allow-Origin": "*"`, but `auth` was missed.

## Fix
Replace the `ALLOWED_ORIGINS` array and `getCorsHeaders()` function in `google-calendar-auth/index.ts` with the same simple CORS constant used by the other functions:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

Then replace all `getCorsHeaders(origin)` / `getCorsHeaders(req.headers.get("Origin"))` calls with just `corsHeaders`.

| File | Change |
|---|---|
| `supabase/functions/google-calendar-auth/index.ts` | Remove `ALLOWED_ORIGINS` + `getCorsHeaders()`, use simple wildcard `corsHeaders` constant |

This is a single-file change. The hook and all other functions are already correct.


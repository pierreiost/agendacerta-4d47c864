

# Fix Google Calendar Integration

## Root Causes

1. **CORS headers too restrictive**: All four edge functions allow only `"authorization, x-client-info, apikey, content-type"` but `supabase.functions.invoke()` sends additional headers (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`) that get blocked by the preflight check, causing silent failures.

2. **Disconnect does not decrypt token before revoking**: `google-calendar-disconnect` sends the encrypted token string to Google's revoke endpoint (line 82), which always fails silently.

3. **Hook uses raw `fetch()` for connect/disconnect**: The `connectMutation` and `disconnectMutation` in `useGoogleCalendar.ts` use manual `fetch()` calls instead of `supabase.functions.invoke()`, making them more fragile (manual URL construction, manual auth headers).

## Changes

### 1. Update CORS headers in all 4 edge functions

In `google-calendar-auth`, `google-calendar-callback`, `google-calendar-sync`, and `google-calendar-disconnect`, change the `Access-Control-Allow-Headers` to:

```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### 2. Fix token decryption in `google-calendar-disconnect`

Import `decrypt`, `isEncrypted`, `decryptLegacy`, `isLegacyEncrypted` from `_shared/encryption.ts` and decrypt the access token before sending it to Google's revoke endpoint.

### 3. Migrate hook to `supabase.functions.invoke()`

Update `connectMutation` and `disconnectMutation` in `useGoogleCalendar.ts` to use `supabase.functions.invoke()` instead of raw `fetch()`, matching the pattern already used by `useSyncBooking`.

| File | Change |
|---|---|
| `supabase/functions/google-calendar-auth/index.ts` | Fix CORS headers |
| `supabase/functions/google-calendar-callback/index.ts` | Fix CORS headers |
| `supabase/functions/google-calendar-sync/index.ts` | Fix CORS headers |
| `supabase/functions/google-calendar-disconnect/index.ts` | Fix CORS headers + decrypt token before revoke |
| `src/hooks/useGoogleCalendar.ts` | Use `supabase.functions.invoke()` for connect/disconnect |


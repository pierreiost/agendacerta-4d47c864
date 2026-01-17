import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

// Get the frontend URL from environment or use a default
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://id-preview--7fded635-bc6f-4133-b6f3-38281cefc754.lovable.app";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("Callback received - code:", !!code, "state:", !!state, "error:", error);

  // Handle error from Google
  if (error) {
    console.error("OAuth error from Google:", error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/configuracoes?google_error=${encodeURIComponent(error)}`,
      },
    });
  }

  if (!code || !state) {
    console.error("Missing code or state");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/configuracoes?google_error=missing_params`,
      },
    });
  }

  try {
    // Decode state to get venue_id
    const stateData = JSON.parse(atob(state));
    const { venue_id, user_id } = stateData;

    console.log("Processing callback for venue:", venue_id);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}/configuracoes?google_error=token_exchange_failed`,
        },
      });
    }

    const tokens = await tokenResponse.json();
    console.log("Tokens received - has access:", !!tokens.access_token, "has refresh:", !!tokens.refresh_token);

    // Get user's primary calendar
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    let calendarId = "primary";
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      calendarId = calendarData.id;
      console.log("Using calendar:", calendarId);
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Save tokens to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert(
        {
          venue_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          calendar_id: calendarId,
        },
        { onConflict: "venue_id" }
      );

    if (upsertError) {
      console.error("Error saving tokens:", upsertError);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}/configuracoes?google_error=save_failed`,
        },
      });
    }

    console.log("Google Calendar connected successfully for venue:", venue_id);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/configuracoes?google_success=true`,
      },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/configuracoes?google_error=unknown`,
      },
    });
  }
});

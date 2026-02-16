import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt, encrypt, isEncrypted, decryptLegacy, isLegacyEncrypted } from "../_shared/encryption.ts";

// Allowed origins for CORS - includes preview and published URLs
const ALLOWED_ORIGINS = [
  "https://id-preview--7fded635-bc6f-4133-b6f3-38281cefc754.lovable.app",
  "https://agendacertaa.lovable.app",
  Deno.env.get("FRONTEND_URL"),
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CalendarToken {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_id: string;
  venue_id: string;
}

// Utility function to mask sensitive data for logs (LGPD compliance)
function maskString(str: string | null | undefined): string {
  if (!str) return "[empty]";
  if (str.length <= 4) return "****";
  return `${str.substring(0, 2)}***${str.substring(str.length - 2)}`;
}

// Safely decrypt token with legacy fallback and re-encryption
async function safeDecryptToken(
  encryptedToken: string, 
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>, 
  venueId: string, 
  tokenField: 'access_token' | 'refresh_token'
): Promise<string> {
  // Try new format first
  if (isEncrypted(encryptedToken) && !isLegacyEncrypted(encryptedToken)) {
    return await decrypt(encryptedToken);
  }
  
  // Try legacy format and re-encrypt with new format
  if (isLegacyEncrypted(encryptedToken)) {
    console.log(`Migrating legacy ${tokenField} encryption for venue: ${maskString(venueId)}`);
    const plaintext = await decryptLegacy(encryptedToken);
    
    // Re-encrypt with new random salt format
    const newEncrypted = await encrypt(plaintext);
    
    // Update database with new encryption (async, don't block)
    supabase
      .from("google_calendar_tokens")
      .update({ [tokenField]: newEncrypted } as Record<string, string>)
      .eq("venue_id", venueId)
      .then(() => {
        console.log(`Successfully migrated ${tokenField} encryption`);
      });
    
    return plaintext;
  }
  
  // Not encrypted (shouldn't happen in production)
  return encryptedToken;
}

async function refreshAccessToken(
  token: CalendarToken, 
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(token.token_expires_at);

  // Decrypt tokens using safe method with legacy fallback
  const currentAccessToken = await safeDecryptToken(token.access_token, supabase, token.venue_id, 'access_token');
  const currentRefreshToken = await safeDecryptToken(token.refresh_token, supabase, token.venue_id, 'refresh_token');

  // If token is still valid for more than 5 minutes, use it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return currentAccessToken;
  }

  // Log without PII - only venue ID (masked)
  console.log(`Refreshing access token for venue: ${maskString(token.venue_id)}`);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: currentRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    // Don't log the actual error which may contain tokens
    console.error(`Token refresh failed for venue: ${maskString(token.venue_id)} - Status: ${response.status}`);
    throw new Error("Failed to refresh token");
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Encrypt new tokens with random salt before storing
  const encryptedAccessToken = await encrypt(newTokens.access_token);
  const encryptedRefreshToken = newTokens.refresh_token 
    ? await encrypt(newTokens.refresh_token) 
    : undefined;

  // Build update object
  const updateData: Record<string, string> = {
    access_token: encryptedAccessToken,
    token_expires_at: newExpiresAt,
  };
  
  if (encryptedRefreshToken) {
    updateData.refresh_token = encryptedRefreshToken;
  }

  // Update tokens in database
  await supabase
    .from("google_calendar_tokens")
    .update(updateData)
    .eq("venue_id", token.venue_id);

  return newTokens.access_token;
}

interface BookingData {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_time: string;
  end_time: string;
  notes?: string;
  space_name: string;
  venue_name: string;
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  booking: BookingData
): Promise<string> {
  const event = {
    summary: `${booking.customer_name} - ${booking.space_name}`,
    description: [
      `Cliente: ${booking.customer_name}`,
      booking.customer_phone ? `Telefone: ${booking.customer_phone}` : null,
      booking.customer_email ? `Email: ${booking.customer_email}` : null,
      booking.notes ? `\nNotas: ${booking.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: booking.start_time,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: booking.end_time,
      timeZone: "America/Sao_Paulo",
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    // Log error without exposing booking PII
    console.error(`Failed to create calendar event - Status: ${response.status}`);
    throw new Error("Failed to create calendar event");
  }

  const createdEvent = await response.json();
  // Log only event ID, not customer data
  console.log(`Created calendar event: ${maskString(createdEvent.id)}`);
  return createdEvent.id;
}

async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  booking: BookingData
): Promise<void> {
  const event = {
    summary: `${booking.customer_name} - ${booking.space_name}`,
    description: [
      `Cliente: ${booking.customer_name}`,
      booking.customer_phone ? `Telefone: ${booking.customer_phone}` : null,
      booking.customer_email ? `Email: ${booking.customer_email}` : null,
      booking.notes ? `\nNotas: ${booking.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: booking.start_time,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: booking.end_time,
      timeZone: "America/Sao_Paulo",
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    console.error(`Failed to update calendar event - Status: ${response.status}`);
    throw new Error("Failed to update calendar event");
  }

  console.log(`Updated calendar event: ${maskString(eventId)}`);
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    console.error(`Failed to delete calendar event - Status: ${response.status}`);
    throw new Error("Failed to delete calendar event");
  }

  console.log(`Deleted calendar event: ${maskString(eventId)}`);
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Authentication failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, booking_id, venue_id } = await req.json();
    
    // Log request without PII
    console.log(`Sync request - action: ${action}, booking: ${maskString(booking_id)}, venue: ${maskString(venue_id)}, user: ${maskString(user.id)}`);

    // Validate required parameters
    if (!action || !booking_id || !venue_id) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Verify user is a member of this venue BEFORE any processing
    const { data: isMember, error: memberError } = await supabase.rpc("is_venue_member", {
      _user_id: user.id,
      _venue_id: venue_id,
    });

    if (memberError) {
      console.error("Failed to verify venue membership");
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isMember) {
      console.error(`Unauthorized venue access attempt - user: ${maskString(user.id)}, venue: ${maskString(venue_id)}`);
      return new Response(JSON.stringify({ error: "Not authorized for this venue" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Verify booking belongs to the venue BEFORE processing (IDOR prevention)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        spaces:space_id (name),
        venues:venue_id (name)
      `)
      .eq("id", booking_id)
      .eq("venue_id", venue_id) // Critical: ensure booking belongs to this venue
      .maybeSingle();

    if (bookingError) {
      console.error("Database error fetching booking");
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!booking) {
      console.error(`Booking not found or venue mismatch - booking: ${maskString(booking_id)}, venue: ${maskString(venue_id)}`);
      return new Response(JSON.stringify({ error: "Booking not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google Calendar tokens - priority:
    // 1. Professional's own token (if booking has professional_id)
    // 2. Fallback to venue-wide token (user_id is null)
    let tokenData = null;
    
    // If booking has a professional, try to get their calendar connection
    if (booking.professional_id) {
      // Get the user_id from the professional's venue_member record
      const { data: professional } = await supabase
        .from("venue_members")
        .select("user_id")
        .eq("id", booking.professional_id)
        .single();

      if (professional?.user_id) {
        const { data: professionalToken } = await supabase
          .from("google_calendar_tokens")
          .select("*")
          .eq("venue_id", venue_id)
          .eq("user_id", professional.user_id)
          .maybeSingle();
        
        if (professionalToken) {
          tokenData = professionalToken;
          console.log(`Using professional's calendar for sync: ${maskString(professional.user_id)}`);
        }
      }
    }

    // Fallback: try the authenticated user's own token
    if (!tokenData) {
      const { data: userToken, error: userTokenError } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("venue_id", venue_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (userTokenError) {
        console.error("Error fetching user token");
      }
      if (userToken) {
        tokenData = userToken;
        console.log(`Using authenticated user's calendar for sync: ${maskString(user.id)}`);
      }
    }

    // Fallback to venue-wide token if no user-specific token found
    if (!tokenData) {
      const { data: venueToken, error: tokenError } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("venue_id", venue_id)
        .is("user_id", null)
        .maybeSingle();

      if (tokenError) {
        console.error("Error fetching venue token");
      }
      tokenData = venueToken;
    }

    if (!tokenData) {
      console.log(`No Google Calendar connected for venue: ${maskString(venue_id)}`);
      return new Response(JSON.stringify({ synced: false, reason: "not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh access token if needed
    const accessToken = await refreshAccessToken(tokenData, supabase);

    const bookingData: BookingData = {
      id: booking.id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      start_time: booking.start_time,
      end_time: booking.end_time,
      notes: booking.notes,
      space_name: booking.spaces?.name || "Espaço",
      venue_name: booking.venues?.name || "Local",
    };

    let result: { synced: boolean; event_id?: string } = { synced: false };

    switch (action) {
      case "create": {
        const eventId = await createCalendarEvent(
          accessToken,
          tokenData.calendar_id || "primary",
          bookingData
        );
        
        // Save event ID to booking
        await supabase
          .from("bookings")
          .update({ google_event_id: eventId })
          .eq("id", booking_id);
        
        result = { synced: true, event_id: eventId };
        break;
      }

      case "update": {
        if (booking.google_event_id) {
          await updateCalendarEvent(
            accessToken,
            tokenData.calendar_id || "primary",
            booking.google_event_id,
            bookingData
          );
          result = { synced: true, event_id: booking.google_event_id };
        } else {
          // No event exists, create one
          const newEventId = await createCalendarEvent(
            accessToken,
            tokenData.calendar_id || "primary",
            bookingData
          );
          await supabase
            .from("bookings")
            .update({ google_event_id: newEventId })
            .eq("id", booking_id);
          result = { synced: true, event_id: newEventId };
        }
        break;
      }

      case "delete": {
        if (booking.google_event_id) {
          await deleteCalendarEvent(
            accessToken,
            tokenData.calendar_id || "primary",
            booking.google_event_id
          );
          result = { synced: true };
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error without exposing internal details
    console.error("Sync error occurred");
    const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

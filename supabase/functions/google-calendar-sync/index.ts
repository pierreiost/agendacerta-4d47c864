import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function refreshAccessToken(token: CalendarToken, supabase: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(token.token_expires_at);

  // If token is still valid for more than 5 minutes, use it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return token.access_token;
  }

  console.log("Refreshing access token for venue:", token.venue_id);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token refresh failed:", error);
    throw new Error("Failed to refresh token");
  }

  const newTokens = await response.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // Update tokens in database
  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiresAt,
      // Only update refresh_token if a new one was provided
      ...(newTokens.refresh_token && { refresh_token: newTokens.refresh_token }),
    })
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
    const error = await response.text();
    console.error("Failed to create calendar event:", error);
    throw new Error("Failed to create calendar event");
  }

  const createdEvent = await response.json();
  console.log("Created calendar event:", createdEvent.id);
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
    const error = await response.text();
    console.error("Failed to update calendar event:", error);
    throw new Error("Failed to update calendar event");
  }

  console.log("Updated calendar event:", eventId);
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
    const error = await response.text();
    console.error("Failed to delete calendar event:", error);
    throw new Error("Failed to delete calendar event");
  }

  console.log("Deleted calendar event:", eventId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, booking_id, venue_id } = await req.json();
    console.log("Sync request - action:", action, "booking_id:", booking_id, "venue_id:", venue_id, "user:", user.id);

    // Validate required parameters
    if (!action || !booking_id || !venue_id) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a member of this venue
    const { data: isMember, error: memberError } = await supabase.rpc("is_venue_member", {
      _user_id: user.id,
      _venue_id: venue_id,
    });

    if (memberError) {
      console.error("Error checking venue membership:", memberError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isMember) {
      console.error("User is not a member of venue:", venue_id);
      return new Response(JSON.stringify({ error: "Not authorized for this venue" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get venue's Google Calendar tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("venue_id", venue_id)
      .single();

    if (tokenError || !tokenData) {
      console.log("No Google Calendar connected for venue:", venue_id);
      return new Response(JSON.stringify({ synced: false, reason: "not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh access token if needed
    const accessToken = await refreshAccessToken(tokenData, supabase);

    // Get booking with space info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        spaces:space_id (name),
        venues:venue_id (name)
      `)
      .eq("id", booking_id)
      .eq("venue_id", venue_id) // Ensure booking belongs to this venue
      .single();

    if (bookingError) {
      console.error("Booking not found:", bookingError);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      case "create":
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

      case "update":
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

      case "delete":
        if (booking.google_event_id) {
          await deleteCalendarEvent(
            accessToken,
            tokenData.calendar_id || "primary",
            booking.google_event_id
          );
          result = { synced: true };
        }
        break;

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
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

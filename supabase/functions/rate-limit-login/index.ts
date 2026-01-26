import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateLimitRequest {
  email: string;
  action: "check" | "record_failure" | "record_success";
}

interface RateLimitResponse {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil: string | null;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, action }: RateLimitRequest = await req.json();

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: "Email and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize email for logging (mask part of it)
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    // Get IP address from headers (may be forwarded by proxy)
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      req.headers.get("x-real-ip") || 
                      null;

    if (action === "check") {
      // Check rate limit status
      const { data, error } = await supabase.rpc("check_login_rate_limit", {
        _email: email.toLowerCase(),
        _ip_address: ipAddress,
        _max_attempts: 5,
        _window_minutes: 15,
      });

      if (error) {
        console.error("Rate limit check error:", error.message);
        throw error;
      }

      const result = data?.[0];
      
      if (!result) {
        // No data means no previous attempts, allow login
        return new Response(
          JSON.stringify({
            allowed: true,
            attemptsRemaining: 5,
            lockedUntil: null,
          } as RateLimitResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response: RateLimitResponse = {
        allowed: result.allowed,
        attemptsRemaining: result.attempts_remaining,
        lockedUntil: result.locked_until,
      };

      if (!result.allowed) {
        response.message = "Muitas tentativas de login. Tente novamente mais tarde.";
        console.log(`Rate limit exceeded for ${maskedEmail}`);
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record_failure") {
      // Record failed login attempt
      const { error } = await supabase.rpc("record_login_attempt", {
        _email: email.toLowerCase(),
        _ip_address: ipAddress,
        _success: false,
      });

      if (error) {
        console.error("Record failure error:", error.message);
        throw error;
      }

      console.log(`Failed login recorded for ${maskedEmail}`);

      // Return updated rate limit status
      const { data: checkData } = await supabase.rpc("check_login_rate_limit", {
        _email: email.toLowerCase(),
        _ip_address: ipAddress,
        _max_attempts: 5,
        _window_minutes: 15,
      });

      const result = checkData?.[0];

      return new Response(
        JSON.stringify({
          allowed: result?.allowed ?? true,
          attemptsRemaining: result?.attempts_remaining ?? 4,
          lockedUntil: result?.locked_until ?? null,
        } as RateLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record_success") {
      // Record successful login (clears failed attempts)
      const { error } = await supabase.rpc("record_login_attempt", {
        _email: email.toLowerCase(),
        _ip_address: ipAddress,
        _success: true,
      });

      if (error) {
        console.error("Record success error:", error.message);
        throw error;
      }

      console.log(`Successful login recorded for ${maskedEmail}`);

      return new Response(
        JSON.stringify({
          allowed: true,
          attemptsRemaining: 5,
          lockedUntil: null,
        } as RateLimitResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

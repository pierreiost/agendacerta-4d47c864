import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  email: string;
  password: string;
  fullName: string;
  venueId: string;
  role: "manager" | "staff";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify caller's permissions
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the caller is authenticated
    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser();
    if (callerError || !caller) {
      throw new Error("Unauthorized");
    }

    const body: CreateMemberRequest = await req.json();
    const { email, password, fullName, venueId, role } = body;

    // Validate required fields
    if (!email || !password || !fullName || !venueId || !role) {
      throw new Error("Missing required fields: email, password, fullName, venueId, role");
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Verify the caller is an admin of this venue
    const { data: callerMembership, error: membershipError } = await supabaseAdmin
      .from("venue_members")
      .select("role")
      .eq("venue_id", venueId)
      .eq("user_id", caller.id)
      .single();

    if (membershipError || !callerMembership) {
      throw new Error("You are not a member of this venue");
    }

    if (callerMembership.role !== "admin" && callerMembership.role !== "superadmin") {
      throw new Error("Only admins can create team members");
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      throw new Error("Um usuário com este e-mail já existe no sistema");
    }

    // Create the user in auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error("Falha ao criar usuário");
    }

    // Create profile for the new user
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: newUser.user.id,
        full_name: fullName,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway, profile can be created later
    }

    // Add user to venue_members
    const { error: memberError } = await supabaseAdmin
      .from("venue_members")
      .insert({
        venue_id: venueId,
        user_id: newUser.user.id,
        role: role,
      });

    if (memberError) {
      console.error("Error adding venue member:", memberError);
      // If we can't add them to the venue, clean up the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Erro ao adicionar membro: ${memberError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        message: "Membro criado com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-team-member:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

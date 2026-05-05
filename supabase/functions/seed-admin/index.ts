// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin.from("profiles").select("id").eq("username", "admin").maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: "Admin already exists" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error } = await admin.auth.admin.createUser({
      email: "admin@ercmsa.internal",
      password: "admin123",
      email_confirm: true,
      user_metadata: { username: "admin", full_name: "Administrateur", role: "boss" },
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

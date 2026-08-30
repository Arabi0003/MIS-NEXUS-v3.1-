import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const passcode = String(body.passcode || "");
  const first = String(body.first_name || "").trim();
  const last = String(body.last_name || "").trim();
  const role = String(body.role || "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid staff email." }, 400);
  if (password.length < 8) return json({ error: "Password must contain at least 8 characters." }, 400);
  if (!/^\d{6}$/.test(passcode)) return json({ error: "Attendance passcode must contain exactly six digits." }, 400);
  if (!first || !last || !role) return json({ error: "First name, last name and role are required." }, 400);

  const roleCheck = await admin.from("mis_nexus_staff_roles").select("role_name").eq("role_name", role).eq("is_active", true).maybeSingle();
  if (roleCheck.error) return json({ error: roleCheck.error.message }, 500);
  if (!roleCheck.data) return json({ error: "Selected school role is not available." }, 400);

  const existing = await admin.from("mis_nexus_staff_profiles").select("id").eq("email", email).maybeSingle();
  if (existing.error) return json({ error: existing.error.message }, 500);
  if (existing.data) return json({ error: "That staff email is already registered. Use the staff login page instead." }, 409);

  let userId: string | null = null;
  let profileId: string | null = null;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: [first, body.middle_name, last].filter(Boolean).join(" "), role, source: "MIS-NEXUS staff registration" } });
    if (created.error) return json({ error: created.error.message }, 400);
    userId = created.data.user.id;

    const profile = await admin.from("mis_nexus_staff_profiles").insert({
      auth_user_id: userId,
      email,
      first_name: first,
      middle_name: body.middle_name || null,
      last_name: last,
      staff_number: body.staff_number || null,
      role,
      department: body.department || null,
      employment_type: body.employment_type || null,
      phone: body.phone || null,
      photo_url: body.photo_url || null,
      employment_status: "active",
      is_attendance_enabled: true,
    }).select("*").single();
    if (profile.error) throw profile.error;
    profileId = profile.data.id;

    const pass = await admin.rpc("mis_nexus_staff_set_passcode", { p_staff_id: profileId, p_passcode: passcode });
    if (pass.error) throw pass.error;

    const login = await admin.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;

    return json({ ok: true, profile: profile.data, session: login.data.session });
  } catch (e: any) {
    if (profileId) await admin.from("mis_nexus_staff_profiles").delete().eq("id", profileId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    return json({ error: e?.message || "Staff registration failed." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

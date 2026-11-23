// Edge Function: invite someone to a group trip by email.
//
// Why a function and not the browser? Sending an invite email needs the
// service role key (full admin power). That key must never reach the browser,
// so the work happens here on the server, after we check the caller is the owner.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const { groupTripId, name, email } = await req.json().catch(() => ({}));
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanName = String(name ?? "").trim();
  if (!groupTripId || !cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return json({ error: "Send groupTripId, name and a valid email." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;

  // 1. Who is calling? A client that carries the caller's own login token,
  //    so database rules (RLS) treat this as them.
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isOwner, error: ownerError } = await asCaller.rpc("is_group_trip_owner", {
    p_group_trip_id: groupTripId,
  });
  if (ownerError) return json({ error: "Could not check permissions." }, 500);
  if (!isOwner) return json({ error: "Only the group trip owner can invite people." }, 403);

  // 2. Now act as admin.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let userId: string | null = null;
  let status: "added" | "invited" = "added";

  const { data: existingId } = await admin.rpc("find_user_id_by_email", {
    p_email: cleanEmail,
  });
  userId = existingId ?? null;

  if (!userId) {
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { full_name: cleanName },
      redirectTo: `${siteUrl}/auth/callback`,
    });
    if (error || !data.user) return json({ error: error?.message ?? "Invite failed." }, 500);
    userId = data.user.id;
    status = "invited";
  }

  const { error: memberError } = await admin
    .from("group_trip_members")
    .upsert({ group_trip_id: groupTripId, user_id: userId, role: "member" }, {
      onConflict: "group_trip_id,user_id",
      ignoreDuplicates: true,
    });
  if (memberError) return json({ error: memberError.message }, 500);

  return json({ status });
});

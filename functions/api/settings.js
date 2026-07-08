import { json, bad, requireAuth, requireAdmin, audit } from "../_shared.js";

export async function onRequestGet(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  const rows = await context.env.DB.prepare(
    `SELECT key, value, description FROM settings ORDER BY key`
  ).all();

  const settings = {};
  for (const row of rows.results || []) {
    settings[row.key] = row.value || "";
  }

  return json({ success: true, settings });
}

export async function onRequestPost(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const body = await context.request.json();

  const allowed = [
    "school_name",
    "school_tagline",
    "phone",
    "email",
    "messenger",
    "google_maps",
    "address",
    "office_hours",
    "logo_url"
  ];

  for (const key of allowed) {
    const value = String(body[key] || "").trim();

    await context.env.DB.prepare(
      `INSERT INTO settings (key, value, description, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    ).bind(key, value, key).run();
  }

  await audit(context.env, admin.username, "Updated Website Settings", "Website settings updated", "");

  return json({ success: true, message: "Settings saved." });
}

import {
  json,
  bad,
  requireAdmin,
  audit,
  uuid,
  sanitizeFilename,
  mediaUrl
} from "../_shared.js";

export async function onRequestPost(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const form = await context.request.formData();
  const logo = form.get("logo");

  if (!logo || typeof logo !== "object" || logo.size <= 0) {
    return bad("Please choose a logo image.");
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowed.includes(logo.type)) {
    return bad("Only JPG, PNG, WebP, and GIF images are allowed.");
  }

  if (logo.size > 2 * 1024 * 1024) {
    return bad("Logo is too large. Maximum size is 2 MB.");
  }

  const safe = sanitizeFilename(logo.name || "school-logo");
  const key = `logos/${uuid()}-${safe}`;

  await context.env.MEDIA.put(key, await logo.arrayBuffer(), {
    httpMetadata: {
      contentType: logo.type
    }
  });

  const url = mediaUrl(context.env, key);

  await context.env.DB.prepare(
    `INSERT INTO settings (key, value, description, updated_at)
     VALUES ('logo_url', ?, 'School logo URL', CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  ).bind(url).run();

  await audit(context.env, admin.username, "Uploaded and Applied Logo", key, "");

  return json({
    success: true,
    message: "Logo uploaded and applied successfully.",
    key,
    url
  });
}

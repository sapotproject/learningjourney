import {
  json,
  bad,
  requireAdmin,
  audit,
  uuid,
  sanitizeFilename,
  guessExt,
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

  const ext = guessExt(logo.type, logo.name);
  const safe = sanitizeFilename(logo.name || `logo.${ext}`);
  const key = `logos/${uuid()}-${safe}`;

  await context.env.MEDIA.put(key, await logo.arrayBuffer(), {
    httpMetadata: {
      contentType: logo.type
    }
  });

  const url = mediaUrl(context.env, key);

  await audit(context.env, admin.username, "Uploaded Logo", key, "");

  return json({
    success: true,
    message: "Logo uploaded successfully.",
    key,
    url
  });
}

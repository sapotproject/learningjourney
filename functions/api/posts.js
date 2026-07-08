import {
  json,
  bad,
  requireAuth,
  requireAdmin,
  audit,
  uuid,
  sanitizeFilename,
  guessExt,
  mediaUrl,
  postPublicRow
} from "../_shared.js";

export async function onRequestGet(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  const rows = await context.env.DB.prepare(
    `SELECT *
     FROM posts
     ORDER BY datetime(created_at) DESC`
  ).all();

  return json({
    success: true,
    posts: (rows.results || []).map(postPublicRow)
  });
}

export async function onRequestPost(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  const form = await context.request.formData();

  const id = String(form.get("id") || "").trim();
  const type = String(form.get("type") || "").trim();
  const title = String(form.get("title") || "").trim();
  const message = String(form.get("message") || "").trim();
  const date = String(form.get("date") || "").trim();
  const existingImageUrl = String(form.get("existing_image_url") || "").trim();
  const existingImageKey = String(form.get("existing_image_key") || "").trim();

  if (!type || !title || !message || !date) {
    return bad("Type, title, message, and date are required.");
  }

  let imageUrl = existingImageUrl;
  let imageKey = existingImageKey;

  const image = form.get("image");

  if (image && typeof image === "object" && image.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(image.type)) {
      return bad("Only JPG, PNG, WebP, and GIF images are allowed.");
    }

    if (image.size > 3 * 1024 * 1024) {
      return bad("Image is too large. Maximum size is 3 MB.");
    }

    const ext = guessExt(image.type, image.name);
    const safe = sanitizeFilename(image.name || `post.${ext}`);
    imageKey = `posts/${new Date().toISOString().slice(0, 10)}/${uuid()}-${safe}`;
    await context.env.MEDIA.put(imageKey, await image.arrayBuffer(), {
      httpMetadata: {
        contentType: image.type
      }
    });
    imageUrl = mediaUrl(context.env, imageKey);
  }

  if (id) {
    const existing = await context.env.DB.prepare(
      `SELECT id FROM posts WHERE id = ?`
    ).bind(id).first();

    if (!existing) return bad("Post not found.", 404);

    await context.env.DB.prepare(
      `UPDATE posts
       SET type = ?, title = ?, message = ?, date = ?, image_url = ?, image_key = ?,
           updated_at = CURRENT_TIMESTAMP, last_edited_by = ?, last_edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(type, title, message, date, imageUrl, imageKey, user.name || user.username, id).run();

    await audit(context.env, user.username, "Edited Post", title, id);

    return json({
      success: true,
      message: "Post updated successfully.",
      id
    });
  }

  const newId = uuid();

  await context.env.DB.prepare(
    `INSERT INTO posts
     (id, type, title, message, author, date, image_url, image_key, status, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 0)`
  ).bind(
    newId,
    type,
    title,
    message,
    user.name || user.username,
    date,
    imageUrl,
    imageKey
  ).run();

  await audit(context.env, user.username, "Published Post", title, newId);

  return json({
    success: true,
    message: "Post published successfully.",
    id: newId
  });
}

export async function onRequestPatch(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  const body = await context.request.json();
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();

  if (!id || !action) return bad("Post ID and action are required.");

  const post = await context.env.DB.prepare(
    `SELECT id, title FROM posts WHERE id = ?`
  ).bind(id).first();

  if (!post) return bad("Post not found.", 404);

  if (action === "delete") {
    await context.env.DB.prepare(
      `UPDATE posts
       SET deleted = 1, status = 'deleted', deleted_by = ?, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(user.name || user.username, id).run();

    await audit(context.env, user.username, "Moved to Recycle Bin", post.title, id);

    return json({ success: true, message: "Post moved to Recycle Bin." });
  }

  if (action === "restore") {
    await context.env.DB.prepare(
      `UPDATE posts
       SET deleted = 0, status = 'published', deleted_by = NULL, deleted_at = NULL
       WHERE id = ?`
    ).bind(id).run();

    await audit(context.env, user.username, "Restored Post", post.title, id);

    return json({ success: true, message: "Post restored." });
  }

  return bad("Invalid action.");
}

export async function onRequestDelete(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const body = await context.request.json();
  const id = String(body.id || "").trim();

  if (!id) return bad("Post ID is required.");

  const post = await context.env.DB.prepare(
    `SELECT id, title, image_key FROM posts WHERE id = ?`
  ).bind(id).first();

  if (!post) return bad("Post not found.", 404);

  if (post.image_key) {
    await context.env.MEDIA.delete(post.image_key);
  }

  await context.env.DB.prepare(
    `DELETE FROM posts WHERE id = ?`
  ).bind(id).run();

  await audit(context.env, admin.username, "Permanently Deleted Post", post.title, id);

  return json({ success: true, message: "Post permanently deleted." });
}

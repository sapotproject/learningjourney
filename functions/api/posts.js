import {
  json,
  bad,
  requireAuth,
  requireAdmin,
  audit,
  uuid,
  sanitizeFilename,
  mediaUrl,
  postAdminRow
} from "../_shared.js";



function isAdminUser(user) {
  return user && String(user.role || "").toLowerCase() === "admin";
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

async function getPostOwner(env, postId) {
  const row = await env.DB.prepare(
    `SELECT author FROM posts WHERE id = ?`
  ).bind(postId).first();

  return row ? row.author : "";
}

async function canModifyPost(env, user, postId) {
  if (!user || !postId) return false;
  if (isAdminUser(user)) return true;

  const owner = await getPostOwner(env, postId);
  return sameText(owner, user.name || user.username);
}

const POST_IMAGE_MAX_BYTES = 500 * 1024;

async function ensurePinnedColumn(env) {
  const info = await env.DB.prepare(`PRAGMA table_info(posts)`).all();
  const hasPinned = (info.results || []).some((col) => col.name === "pinned");

  if (!hasPinned) {
    await env.DB.prepare(`ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`).run();
  }
}

function truthy(value) {
  const s = String(value ?? "0").toLowerCase().trim();
  return ["1", "true", "yes", "on", "pinned"].includes(s);
}

function normalizePinned(value) {
  return truthy(value) ? 1 : 0;
}

async function unpinOthers(env, exceptId = "") {
  if (exceptId) {
    await env.DB.prepare(`UPDATE posts SET pinned = 0 WHERE id <> ?`).bind(exceptId).run();
    return;
  }

  await env.DB.prepare(`UPDATE posts SET pinned = 0`).run();
}

async function uploadPostImage(env, image) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowed.includes(image.type)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
  }

  if (image.size > POST_IMAGE_MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 500 KB.");
  }

  const safe = sanitizeFilename(image.name || "post-image");
  const imageKey = `posts/${new Date().toISOString().slice(0, 10)}/${uuid()}-${safe}`;

  await env.MEDIA.put(imageKey, await image.arrayBuffer(), {
    httpMetadata: {
      contentType: image.type
    }
  });

  return {
    imageKey,
    imageUrl: mediaUrl(env, imageKey)
  };
}

export async function onRequestGet(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  await ensurePinnedColumn(context.env);

  const rows = await context.env.DB.prepare(
    `SELECT *
     FROM posts
     ORDER BY pinned DESC, datetime(created_at) DESC`
  ).all();

  return json({
    success: true,
    posts: (rows.results || []).map(postAdminRow)
  });
}

export async function onRequestPost(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  await ensurePinnedColumn(context.env);

  const form = await context.request.formData();

  const id = String(form.get("id") || "").trim();
  const type = String(form.get("type") || "").trim();
  const title = String(form.get("title") || "").trim();
  const message = String(form.get("message") || "").trim();
  const date = String(form.get("date") || "").trim();
  const existingImageUrl = String(form.get("existing_image_url") || "").trim();
  const existingImageKey = String(form.get("existing_image_key") || "").trim();
  const removeImage = truthy(form.get("remove_image"));
  const pinned = normalizePinned(form.get("pinned"));

  if (!type || !title || !message || !date) {
    return bad("Type, title, message, and date are required.");
  }

  let existingPost = null;

  if (id) {
    existingPost = await context.env.DB.prepare(
      `SELECT id, title, image_key FROM posts WHERE id = ?`
    ).bind(id).first();

    if (!existingPost) return bad("Post not found.", 404);
  
    if (!(await canModifyPost(context.env, user, id))) {
      return bad("Unauthorized. You can only edit posts that you created.", 403);
    }
}

  let imageUrl = removeImage ? "" : existingImageUrl;
  let imageKey = removeImage ? "" : existingImageKey;

  const image = form.get("image");
  const hasNewImage = image && typeof image === "object" && image.size > 0;

  if (hasNewImage) {
    try {
      const uploaded = await uploadPostImage(context.env, image);
      imageUrl = uploaded.imageUrl;
      imageKey = uploaded.imageKey;
    } catch (error) {
      return bad(error.message || "Image upload failed.");
    }
  }

  // Remove old R2 file when replacing or removing an existing image.
  if (id && existingPost && existingPost.image_key && (removeImage || hasNewImage)) {
    try {
      await context.env.MEDIA.delete(existingPost.image_key);
    } catch {
      // Do not fail the whole post update just because cleanup failed.
    }
  }

  if (id) {
    if (pinned) await unpinOthers(context.env, id);

    await context.env.DB.prepare(
      `UPDATE posts
       SET type = ?, title = ?, message = ?, date = ?, image_url = ?, image_key = ?, pinned = ?,
           updated_at = CURRENT_TIMESTAMP, last_edited_by = ?, last_edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(type, title, message, date, imageUrl, imageKey, pinned, user.name || user.username, id).run();

    await audit(context.env, user.username, pinned ? "Edited and Featured Post" : "Edited Post", title, id);

    return json({
      success: true,
      message: pinned ? "Post updated and featured on homepage." : "Post updated successfully.",
      id
    });
  }

  const newId = uuid();

  if (pinned) await unpinOthers(context.env, newId);

  await context.env.DB.prepare(
    `INSERT INTO posts
     (id, type, title, message, author, date, image_url, image_key, pinned, status, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0)`
  ).bind(
    newId,
    type,
    title,
    message,
    user.name || user.username,
    date,
    imageUrl,
    imageKey,
    pinned
  ).run();

  await audit(context.env, user.username, pinned ? "Published Featured Post" : "Published Post", title, newId);

  return json({
    success: true,
    message: pinned ? "Post published and featured on homepage." : "Post published successfully.",
    id: newId
  });
}

export async function onRequestPatch(context) {
  const user = await requireAuth(context.request, context.env);
  if (!user) return bad("Unauthorized.", 401);

  await ensurePinnedColumn(context.env);

  const body = await context.request.json();
  const id = String(body.id || "").trim();
  const action = String(body.action || "").trim();

  if (!id || !action) return bad("Post ID and action are required.");

  const post = await context.env.DB.prepare(
    `SELECT id, title, author FROM posts WHERE id = ?`
  ).bind(id).first();

  if (!post) return bad("Post not found.", 404);

  if (!(await canModifyPost(context.env, user, id))) {
    return bad("Unauthorized. You can only manage posts that you created.", 403);
  }

  if (action === "pin") {
    await unpinOthers(context.env, id);

    await context.env.DB.prepare(
      `UPDATE posts
       SET pinned = 1, deleted = 0, status = 'published', updated_at = CURRENT_TIMESTAMP,
           last_edited_by = ?, last_edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(user.name || user.username, id).run();

    await audit(context.env, user.username, "Featured Post on Homepage", post.title, id);

    return json({ success: true, message: "Post is now featured on the homepage." });
  }

  if (action === "unpin") {
    await context.env.DB.prepare(
      `UPDATE posts
       SET pinned = 0, updated_at = CURRENT_TIMESTAMP,
           last_edited_by = ?, last_edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(user.name || user.username, id).run();

    await audit(context.env, user.username, "Removed Homepage Feature", post.title, id);

    return json({ success: true, message: "Post removed from homepage feature." });
  }

  if (action === "delete") {
    await context.env.DB.prepare(
      `UPDATE posts
       SET pinned = 0, deleted = 1, status = 'deleted', deleted_by = ?, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(user.name || user.username, id).run();

    await audit(context.env, user.username, "Moved to Recycle Bin", post.title, id);

    return json({ success: true, message: "Post moved to Recycle Bin." });
  }

  if (action === "restore") {
    await context.env.DB.prepare(
      `UPDATE posts
       SET deleted = 0, status = 'published', deleted_by = NULL, deleted_at = NULL,
           last_edited_by = ?, last_edited_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(user.name || user.username, id).run();

    await audit(context.env, user.username, "Restored Post", post.title, id);

    return json({ success: true, message: "Post restored." });
  }

  return bad("Invalid action.");
}

export async function onRequestDelete(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  await ensurePinnedColumn(context.env);

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

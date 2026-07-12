import {
  json,
  bad,
  requireAdmin,
  audit,
  hashPassword,
  uuid,
  normalizeRole,
  normalizeActive
} from "../_shared.js";

export async function onRequestGet(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const rows = await context.env.DB.prepare(
    `SELECT username, role, name, active, created_at, last_login
     FROM users
     ORDER BY username`
  ).all();

  return json({ success: true, users: rows.results || [] });
}

export async function onRequestPost(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const body = await context.request.json();

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const role = normalizeRole(body.role);
  const active = normalizeActive(body.active);

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return bad("Username must be 3-30 characters using letters, numbers, dot, dash, or underscore.");
  }

  if (password.length < 6) {
    return bad("Password must be at least 6 characters.");
  }

  if (!name) {
    return bad("Full name is required.");
  }

  const existing = await context.env.DB.prepare(
    `SELECT username FROM users WHERE username = ?`
  ).bind(username).first();

  if (existing) return bad("Username already exists.");

  const salt = uuid();
  const passwordHash = await hashPassword(password, salt);

  await context.env.DB.prepare(
    `INSERT INTO users (username, password_salt, password_hash, role, name, active)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(username, salt, passwordHash, role, name, active).run();

  await audit(context.env, admin.username, "Added User Account", username, "");

  return json({ success: true, message: "User added successfully." });
}

export async function onRequestPatch(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const body = await context.request.json();
  const action = String(body.action || "").trim();
  const username = String(body.username || "").trim().toLowerCase();

  if (!username) return bad("Username is required.");

  const user = await context.env.DB.prepare(
    `SELECT username, role, active FROM users WHERE username = ?`
  ).bind(username).first();

  if (!user) return bad("User not found.", 404);

  if (action === "resetPassword") {
    const password = String(body.password || "");
    if (password.length < 6) return bad("Password must be at least 6 characters.");

    const salt = uuid();
    const passwordHash = await hashPassword(password, salt);

    await context.env.DB.prepare(
      `UPDATE users SET password_salt = ?, password_hash = ? WHERE username = ?`
    ).bind(salt, passwordHash, username).run();

    await audit(context.env, admin.username, "Reset User Password", username, "");

    return json({ success: true, message: "Password reset successfully." });
  }

  if (action === "update") {
    const name = String(body.name || "").trim();
    const role = normalizeRole(body.role);
    const active = normalizeActive(body.active);

    if (!name) return bad("Full name is required.");

    if (username === admin.username && (role !== "admin" || !active)) {
      return bad("You cannot remove your own admin access.");
    }

    await context.env.DB.prepare(
      `UPDATE users SET name = ?, role = ?, active = ? WHERE username = ?`
    ).bind(name, role, active, username).run();

    await audit(context.env, admin.username, "Updated User Account", username, "");

    return json({ success: true, message: "User updated successfully." });
  }

  return bad("Invalid action.");
}

export async function onRequestDelete(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return bad("Invalid delete request.");
  }

  const username = String(body.username || "").trim().toLowerCase();
  if (!username) return bad("Username is required.");

  if (username === admin.username) {
    return bad("You cannot permanently delete your own account while logged in.");
  }

  const user = await context.env.DB.prepare(
    `SELECT username, role, active FROM users WHERE username = ?`
  ).bind(username).first();

  if (!user) return bad("User not found.", 404);

  if (user.role === "admin") {
    const adminCountRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1 AND username != ?`
    ).bind(username).first();

    if (!adminCountRow || Number(adminCountRow.total || 0) < 1) {
      return bad("Cannot delete the last active admin account.");
    }
  }

  await context.env.DB.prepare(
    `DELETE FROM users WHERE username = ?`
  ).bind(username).run();

  await audit(context.env, admin.username, "Permanently Deleted User Account", username, "");

  return json({ success: true, message: "User permanently deleted. The username can now be reused." });
}

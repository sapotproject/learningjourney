import { json, bad, hashPassword, createToken } from "../_shared.js";

export async function onRequestPost(context) {
  const env = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return bad("Invalid login request.");
  }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!username || !password) {
    return bad("Username and password are required.");
  }

  const user = await env.DB.prepare(
    `SELECT username, password_salt, password_hash, role, name, active
     FROM users
     WHERE username = ?`
  ).bind(username).first();

  if (!user || !user.active) {
    return bad("Invalid username or password.", 401);
  }

  const hash = await hashPassword(password, user.password_salt);

  if (hash !== user.password_hash) {
    return bad("Invalid username or password.", 401);
  }

  await env.DB.prepare(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?`
  ).bind(username).run();

  const publicUser = {
    username: user.username,
    role: user.role,
    name: user.name
  };

  const token = await createToken(publicUser, env);

  return json({
    success: true,
    message: "Login successful.",
    token,
    user: publicUser
  });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function publicJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function bad(message, status = 400) {
  return json({ success: false, message }, status);
}

export function nowISO() {
  return new Date().toISOString();
}

export function uuid() {
  return crypto.randomUUID();
}

export function normalizeRole(role) {
  role = String(role || "teacher").toLowerCase().trim();
  return role === "admin" ? "admin" : "teacher";
}

export function normalizeActive(value) {
  if (value === false || value === 0) return 0;
  const s = String(value ?? "1").toLowerCase().trim();
  return ["false", "0", "no", "inactive"].includes(s) ? 0 : 1;
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt) {
  return sha256Hex(`${salt}::${password}`);
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlDecode(str) {
  str = str.replaceAll("-", "+").replaceAll("_", "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function createToken(user, env) {
  const payload = {
    username: user.username,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
  };

  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await hmacSign(body, env.AUTH_SECRET || "dev-secret-change-me");
  return `${body}.${sig}`;
}

export async function verifyToken(token, env) {
  if (!token || !token.includes(".")) return null;

  const [body, sig] = token.split(".");
  const expected = await hmacSign(body, env.AUTH_SECRET || "dev-secret-change-me");

  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const user = await verifyToken(token, env);

  if (!user) return null;
  return user;
}

export async function requireAdmin(request, env) {
  const user = await requireAuth(request, env);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function audit(env, username, action, details = "", postId = "") {
  await env.DB.prepare(
    `INSERT INTO audit_log (id, username, action, details, post_id)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(uuid(), username || "", action, details || "", postId || "").run();
}

export function sanitizeFilename(name) {
  return String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "file";
}

export function guessExt(type, filename) {
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "bin";
}

export function mediaUrl(env, key) {
  const base = String(env.PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/${key}` : "";
}

export function postPublicRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    author: row.author,
    date: row.date,
    created_at: row.created_at,
    image: row.image_url || "",
    status: row.status,
    deleted: row.deleted ? "TRUE" : "FALSE",
    last_edited_by: row.last_edited_by || "",
    last_edited_at: row.last_edited_at || "",
    deleted_by: row.deleted_by || "",
    deleted_at: row.deleted_at || ""
  };
}

import { publicJson, postPublicRow } from "../_shared.js";

async function ensurePinnedColumn(env) {
  const info = await env.DB.prepare(`PRAGMA table_info(posts)`).all();
  const hasPinned = (info.results || []).some((col) => col.name === "pinned");

  if (!hasPinned) {
    await env.DB.prepare(`ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`).run();
  }
}

export async function onRequestGet(context) {
  const env = context.env;

  await ensurePinnedColumn(env);

  const settingsRows = await env.DB.prepare(
    `SELECT key, value FROM settings`
  ).all();

  const settings = {};
  for (const row of settingsRows.results || []) {
    settings[row.key] = row.value || "";
  }

  const postsRows = await env.DB.prepare(
    `SELECT *
     FROM posts
     WHERE deleted = 0 AND status = 'published'
     ORDER BY pinned DESC, datetime(created_at) DESC`
  ).all();

  return publicJson({
    success: true,
    generated_at: new Date().toISOString(),
    settings,
    posts: (postsRows.results || []).map(postPublicRow)
  });
}

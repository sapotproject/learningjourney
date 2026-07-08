import { publicJson, postPublicRow } from "../_shared.js";

export async function onRequestGet(context) {
  const env = context.env;

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
     ORDER BY datetime(created_at) DESC`
  ).all();

  return publicJson({
    success: true,
    generated_at: new Date().toISOString(),
    settings,
    posts: (postsRows.results || []).map(postPublicRow)
  });
}

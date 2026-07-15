import { json, bad, requireAdmin, audit } from "../_shared.js";

const DEFAULT_PAGES = {
  about: {
    page_title: "About Our School",
    intro_description: "Learning Journey Child Growth Center, Inc. is committed to supporting every child's growth, learning, and development in a caring school community.",
    mission: "To provide a caring and supportive learning environment where children can grow, discover, and develop at their own pace.",
    vision: "To be a school community where learning is meaningful, joyful, and guided by each child's unique journey.",
    core_values: "Care\nRespect\nPatience\nLove for Learning"
  },
  admissions: {
    page_title: "Admissions",
    intro_description: "Basic enrollment information for parents and guardians.",
    requirements: "Completed enrollment or inquiry form\nBirth certificate copy\nRecent 1x1 or 2x2 photo, if required\nPrevious school records, if applicable\nOther documents requested by the school office",
    enrollment_process: "Contact the school office\nSubmit the required information or documents\nWait for confirmation from the school\nComplete the enrollment process",
    contact_note: "For updated admission schedules, fees, and available slots, please contact the school directly."
  }
};

const ALLOWED_FIELDS = {
  about: ["page_title", "intro_description", "mission", "vision", "core_values"],
  admissions: ["page_title", "intro_description", "requirements", "enrollment_process", "contact_note"]
};

function clean(value) {
  return String(value ?? "").trim();
}

async function ensurePageContentTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS page_content (
      page_key TEXT NOT NULL,
      field_key TEXT NOT NULL,
      value TEXT,
      updated_by TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (page_key, field_key)
    )
  `).run();
}

async function readAllPages(env) {
  await ensurePageContentTable(env);

  const rows = await env.DB.prepare(
    `SELECT page_key, field_key, value FROM page_content`
  ).all();

  const pages = JSON.parse(JSON.stringify(DEFAULT_PAGES));

  for (const row of rows.results || []) {
    if (pages[row.page_key] && ALLOWED_FIELDS[row.page_key]?.includes(row.field_key)) {
      pages[row.page_key][row.field_key] = row.value || "";
    }
  }

  return pages;
}

export async function onRequestGet(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  const pages = await readAllPages(context.env);
  return json({ success: true, pages });
}

export async function onRequestPost(context) {
  const admin = await requireAdmin(context.request, context.env);
  if (!admin) return bad("Admin only.", 403);

  await ensurePageContentTable(context.env);

  const body = await context.request.json().catch(() => ({}));
  const page = clean(body.page).toLowerCase();
  const content = body.content || {};

  if (!ALLOWED_FIELDS[page]) return bad("Invalid page.", 400);

  for (const field of ALLOWED_FIELDS[page]) {
    const value = clean(content[field]);

    await context.env.DB.prepare(`
      INSERT INTO page_content (page_key, field_key, value, updated_by, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(page_key, field_key)
      DO UPDATE SET
        value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `).bind(page, field, value, admin.username).run();
  }

  await audit(
    context.env,
    admin.username,
    "Updated Page Content",
    `${page} page content updated`,
    page
  );

  return json({ success: true, message: "Page content saved." });
}

import { publicJson } from "../_shared.js";

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

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const requestedPage = String(url.searchParams.get("page") || "").toLowerCase().trim();
  const page = DEFAULT_PAGES[requestedPage] ? requestedPage : "about";

  await ensurePageContentTable(context.env);

  const rows = await context.env.DB.prepare(
    `SELECT field_key, value FROM page_content WHERE page_key = ?`
  ).bind(page).all();

  const content = { ...DEFAULT_PAGES[page] };

  for (const row of rows.results || []) {
    if (ALLOWED_FIELDS[page].includes(row.field_key)) {
      content[row.field_key] = row.value || "";
    }
  }

  return publicJson({
    success: true,
    page,
    content
  });
}

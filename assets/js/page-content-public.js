function pcById(id) {
  return document.getElementById(id);
}

function pcClean(value) {
  return String(value ?? "").trim();
}

function pcSetText(id, value) {
  const el = pcById(id);
  if (el && pcClean(value)) el.textContent = pcClean(value);
}

function pcLines(value) {
  return pcClean(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pcRenderList(id, value, ordered = false) {
  const el = pcById(id);
  if (!el) return;

  const lines = pcLines(value);
  if (!lines.length) return;

  el.innerHTML = "";
  lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    el.appendChild(li);
  });
}

function pcGetPageKey() {
  const explicit = document.body?.dataset?.pageContent;
  if (explicit) return explicit;

  const path = window.location.pathname.toLowerCase();
  if (path.includes("admissions")) return "admissions";
  return "about";
}

function pcApplyContent(page, content) {
  if (!content) return;

  if (page === "about") {
    pcSetText("aboutPageTitle", content.page_title);
    pcSetText("aboutIntroDescription", content.intro_description);
    pcSetText("aboutMission", content.mission);
    pcSetText("aboutVision", content.vision);
    pcRenderList("aboutCoreValues", content.core_values);
    return;
  }

  if (page === "admissions") {
    pcSetText("admissionsPageTitle", content.page_title);
    pcSetText("admissionsIntroDescription", content.intro_description);
    pcRenderList("admissionsRequirementsList", content.requirements);
    pcRenderList("admissionsEnrollmentProcess", content.enrollment_process, true);
    pcSetText("admissionsContactNote", content.contact_note);
  }
}

async function pcLoadPageContent() {
  const page = pcGetPageKey();

  try {
    const res = await fetch(`/api/pages-public?page=${encodeURIComponent(page)}`, {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();
    if (data.success) pcApplyContent(data.page, data.content || {});
  } catch {
    // Keep safe fallback HTML content.
  }
}

pcLoadPageContent();

const formsList = document.getElementById("formsList");
const formsStatus = document.getElementById("formsStatus");

function byId(id) { return document.getElementById(id); }
function clean(value) { return String(value ?? "").trim(); }
function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function setText(id, value) { const el = byId(id); if (el) el.textContent = value || ""; }
function setDynamicIcons(logo) {
  if (!logo) return;
  const favicon = byId("dynamicFavicon");
  const appleIcon = byId("dynamicAppleIcon");
  if (favicon) favicon.href = logo;
  if (appleIcon) appleIcon.href = logo;
}
function applySettings(settings) {
  settings = settings || {};
  const schoolName = clean(settings.school_name) || "Learning Journey Child Growth Center, Inc.";
  const tagline = clean(settings.school_tagline) || "Where Learning is a Journey and Not a Race";
  const logo = clean(settings.logo_url);
  setText("schoolName", schoolName);
  setText("schoolTagline", tagline);
  setText("footerSchoolName", schoolName);
  const logoEl = byId("schoolLogo");
  if (logoEl && logo) { logoEl.src = logo; logoEl.classList.remove("hidden"); setDynamicIcons(logo); }
}
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
function formCard(item) {
  const description = clean(item.description);
  const uploadedAt = formatDate(item.created_at || item.updated_at);
  const fileUrl = clean(item.file_url);
  const filename = clean(item.filename);
  return `
    <article class="form-card">
      <div class="form-card-main">
        <span class="tag">Excuse Letter</span>
        <h3>${esc(item.title || "Excuse Letter Form")}</h3>
        ${description ? `<p>${esc(description)}</p>` : `<p>Use this form when a student was absent from class.</p>`}
        <div class="form-meta">
          ${uploadedAt ? `<span>Uploaded: ${esc(uploadedAt)}</span>` : ""}
          ${filename ? `<span>${esc(filename)}</span>` : ""}
        </div>
      </div>
      <div class="form-card-action">
        ${fileUrl ? `<a class="btn" href="${esc(fileUrl)}" target="_blank" rel="noopener">Download Form</a>` : `<span class="loading-text">File unavailable</span>`}
      </div>
    </article>
  `;
}
async function loadForms() {
  if (!formsList) return;
  try {
    formsStatus.textContent = "Loading forms...";
    const [settingsRes, formsRes] = await Promise.all([
      fetch("/api/public", { headers: { Accept: "application/json" } }),
      fetch("/api/forms-public", { headers: { Accept: "application/json" } })
    ]);
    const settingsData = await settingsRes.json();
    if (settingsData.success) applySettings(settingsData.settings || {});
    const formsData = await formsRes.json();
    if (!formsData.success) throw new Error(formsData.message || "Unable to load forms.");
    const forms = formsData.forms || [];
    formsList.innerHTML = forms.length
      ? forms.map(formCard).join("")
      : `<div class="empty-state"><h3>No Excuse Letter form uploaded yet</h3><p>Please check again later or contact the school office.</p></div>`;
    formsStatus.textContent = formsData.generated_at ? "Last updated: " + new Date(formsData.generated_at).toLocaleString("en-PH") : "";
  } catch (error) {
    formsList.innerHTML = `<div class="empty-state"><h3>Unable to load forms</h3><p>Please check your internet connection and refresh the page.</p></div>`;
    formsStatus.textContent = error.message || "Unable to load school forms.";
  }
}
loadForms();

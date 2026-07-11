const galleryList = document.getElementById("galleryList");
const galleryStatus = document.getElementById("galleryStatus");

function gById(id) { return document.getElementById(id); }
function gClean(value) { return String(value ?? "").trim(); }
function gEsc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function openImageModal(src) {
  const modal = gById("imageModal");
  const img = gById("imageModalImg");
  if (!modal || !img || !src) return;
  img.src = src;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function closeImageModal() {
  const modal = gById("imageModal");
  const img = gById("imageModalImg");
  if (!modal || !img) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  img.src = "";
}
if (gById("imageCloseBtn")) gById("imageCloseBtn").addEventListener("click", closeImageModal);
if (gById("imageModal")) gById("imageModal").addEventListener("click", (e) => { if (e.target.id === "imageModal") closeImageModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeImageModal(); });

function gSetText(id, value) { const el = gById(id); if (el) el.textContent = value || ""; }
function gSetDynamicIcons(logo) {
  if (!logo) return;
  const favicon = gById("dynamicFavicon");
  const appleIcon = gById("dynamicAppleIcon");
  if (favicon) favicon.href = logo;
  if (appleIcon) appleIcon.href = logo;
}
function gApplySettings(settings) {
  settings = settings || {};
  const schoolName = gClean(settings.school_name) || "Learning Journey Child Growth Center, Inc.";
  const tagline = gClean(settings.school_tagline) || "Where Learning is a Journey and Not a Race";
  const logo = gClean(settings.logo_url);
  gSetText("schoolName", schoolName);
  gSetText("schoolTagline", tagline);
  gSetText("footerSchoolName", schoolName);
  const logoEl = gById("schoolLogo");
  if (logoEl && logo) { logoEl.src = logo; logoEl.classList.remove("hidden"); gSetDynamicIcons(logo); }
}
function galleryCard(photo) {
  const imageUrl = gClean(photo.image_url);
  const caption = gClean(photo.caption);
  const title = gClean(photo.title) || caption || "Gallery Photo";
  return `
    <article class="public-gallery-card">
      <button class="image-open-btn" type="button" onclick="openImageModal('${gEsc(imageUrl)}')">
        <img class="public-gallery-image" src="${gEsc(imageUrl)}" alt="${gEsc(title)}" loading="lazy">
      </button>
      <div class="public-gallery-caption"><h3>${gEsc(title)}</h3>${caption ? `<p>${gEsc(caption)}</p>` : ""}</div>
    </article>
  `;
}
function groupGallery(photos) {
  const order = ["Campus & Facilities", "Learning Activities", "School Events", "Student Works"];
  const map = new Map();
  photos.forEach((photo) => {
    const category = gClean(photo.category) || "School Events";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(photo);
  });
  const cats = [...order.filter((cat) => map.has(cat)), ...Array.from(map.keys()).filter((cat) => !order.includes(cat)).sort()];
  return cats.map((cat) => `
    <section class="public-gallery-category">
      <h3>${gEsc(cat)}</h3>
      <div class="public-gallery-grid">${map.get(cat).map(galleryCard).join("")}</div>
    </section>
  `).join("");
}
async function loadGallery() {
  if (!galleryList) return;
  try {
    galleryStatus.textContent = "Loading gallery...";
    const [settingsRes, galleryRes] = await Promise.all([
      fetch("/api/public", { headers: { Accept: "application/json" } }),
      fetch("/api/gallery-public", { headers: { Accept: "application/json" } })
    ]);
    const settingsData = await settingsRes.json();
    if (settingsData.success) gApplySettings(settingsData.settings || {});
    const galleryData = await galleryRes.json();
    if (!galleryData.success) throw new Error(galleryData.message || "Unable to load gallery.");
    const photos = galleryData.photos || [];
    galleryList.innerHTML = photos.length
      ? groupGallery(photos)
      : `<div class="empty-state"><h3>No gallery photos yet</h3><p>Please check again later.</p></div>`;
    galleryStatus.textContent = galleryData.generated_at ? "Last updated: " + new Date(galleryData.generated_at).toLocaleString("en-PH") : "";
  } catch (error) {
    galleryList.innerHTML = `<div class="empty-state"><h3>Unable to load gallery</h3><p>Please check your internet connection and refresh the page.</p></div>`;
    galleryStatus.textContent = error.message || "Unable to load gallery.";
  }
}
loadGallery();

const layout = document.querySelector(".archive-layout");
const archiveMain = document.getElementById("archiveMain");
const archiveHistory = document.getElementById("archiveHistory");
const archiveStatus = document.getElementById("archiveStatus");

let pagePosts = [];

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value || "";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(value) {
  return String(value ?? "").trim();
}

function category(type) {
  const value = clean(type).toLowerCase();

  if (value === "news" || value === "latest news") return "news";
  if (["event", "events", "school event", "school events"].includes(value)) return "event";
  if (["reminder", "reminders", "important reminder", "important reminders"].includes(value)) return "reminder";
  if (["school advisory", "school advisories", "advisory", "advisories", "announcement", "announcements"].includes(value)) return "school advisory";

  return value;
}

function label(type) {
  const c = category(type);
  if (c === "news") return "News";
  if (c === "event") return "Event";
  if (c === "reminder") return "Reminder";
  if (c === "school advisory") return "School Advisory";
  return clean(type) || "Update";
}

function parseTime(value) {
  if (!value) return 0;
  const d = new Date(String(value).replace(" ", "T"));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function normalizePost(post, index) {
  return {
    ...post,
    id: clean(post.id) || "post-" + index,
    type: clean(post.type),
    category: category(post.type),
    label: label(post.type),
    title: clean(post.title),
    message: clean(post.message),
    author: clean(post.author),
    dateDisplay: formatDate(post.date || post.created_at),
    image: clean(post.image || post.image_url),
    sortTime: parseTime(post.created_at) || parseTime(post.date) || 0,
    rowOrder: index
  };
}

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
  if (logoEl) {
    if (logo) {
      logoEl.src = logo;
      logoEl.classList.remove("hidden");
      setDynamicIcons(logo);
    } else {
      logoEl.removeAttribute("src");
      logoEl.classList.add("hidden");
    }
  }
}

function matchMode(post, mode) {
  if (mode === "announcements") {
    return post.category === "school advisory" || post.category === "reminder";
  }

  return post.category === mode;
}

function renderMain(post) {
  if (!archiveMain) return;

  archiveMain.innerHTML = `
    ${post.image ? `<img class="archive-main-image" src="${esc(post.image)}" alt="${esc(post.title)}" onerror="this.style.display='none'">` : ""}
    <span class="tag category-tag-large">${esc(post.label)}</span>
    <h2>${esc(post.title)}</h2>
    <div class="archive-meta">
      ${esc(post.dateDisplay)}${post.author ? ` • Posted by ${esc(post.author)}` : ""}
    </div>
    <div class="archive-message">${esc(post.message)}</div>
  `;
}

function renderHistory(selectedId) {
  if (!archiveHistory) return;

  const history = pagePosts.filter((post) => post.id !== selectedId);

  if (!history.length) {
    archiveHistory.innerHTML = `<p class="loading-text">No previous posts yet.</p>`;
    return;
  }

  archiveHistory.innerHTML = history.map((post) => `
    <button class="history-item" onclick="selectPost('${esc(post.id)}')">
      <span class="history-tag">${esc(post.label)}</span>
      <strong>${esc(post.title)}</strong>
      <small>${esc(post.dateDisplay)}</small>
    </button>
  `).join("");
}

function selectPost(id) {
  const post = pagePosts.find((item) => item.id === id);
  if (!post) return;

  renderMain(post);
  renderHistory(post.id);

  if (window.innerWidth < 900 && archiveMain) {
    archiveMain.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadPage() {
  if (!layout) return;

  const mode = layout.dataset.pageMode;
  const emptyText = layout.dataset.emptyText || "No posts yet.";

  try {
    if (archiveStatus) archiveStatus.textContent = "Loading posts...";

    const res = await fetch("/api/public", {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Unable to load posts.");

    applySettings(data.settings || {});

    pagePosts = (data.posts || [])
      .map(normalizePost)
      .filter((post) => matchMode(post, mode))
      .sort((a, b) => b.sortTime !== a.sortTime ? b.sortTime - a.sortTime : b.rowOrder - a.rowOrder);

    if (!pagePosts.length) {
      if (archiveMain) archiveMain.innerHTML = `<h2>${esc(emptyText)}</h2><p>Please check again later.</p>`;
      if (archiveHistory) archiveHistory.innerHTML = `<p class="loading-text">No history yet.</p>`;
      if (archiveStatus) archiveStatus.textContent = "";
      return;
    }

    selectPost(pagePosts[0].id);

    if (archiveStatus) {
      archiveStatus.textContent = data.generated_at
        ? "Last updated: " + new Date(data.generated_at).toLocaleString("en-PH")
        : "";
    }
  } catch (error) {
    if (archiveMain) archiveMain.innerHTML = `<h2>Unable to load posts</h2><p>${esc(error.message || "Please refresh the page.")}</p>`;
    if (archiveHistory) archiveHistory.innerHTML = `<p class="loading-text">Unable to load history.</p>`;
    if (archiveStatus) archiveStatus.textContent = "";
  }
}

loadPage();


function createImageModal() {
  let modal = document.getElementById("imageModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "imageModal";
  modal.className = "image-modal";
  modal.innerHTML = '<button class="image-close-btn" type="button">Close</button><img id="imageModalImg" src="" alt="Post image">';
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.classList.contains("image-close-btn")) {
      modal.classList.remove("show");
      const img = document.getElementById("imageModalImg");
      if (img) img.src = "";
    }
  });

  return modal;
}

function openImageFull(src, alt) {
  if (!src) return;
  const modal = createImageModal();
  const img = document.getElementById("imageModalImg");
  if (!img) {
    window.open(src, "_blank", "noopener");
    return;
  }
  img.src = src;
  img.alt = alt || "Post image";
  modal.classList.add("show");
}

document.addEventListener("click", (event) => {
  const img = event.target.closest("img.post-image, img.modal-img, img.archive-main-image");
  if (!img) return;
  event.preventDefault();
  event.stopPropagation();
  openImageFull(img.currentSrc || img.src, img.alt);
});

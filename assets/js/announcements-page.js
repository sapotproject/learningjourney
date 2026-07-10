const announcementStatus = document.getElementById("announcementStatus");

let advisoryPosts = [];
let reminderPosts = [];

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

function renderMain(post, mainId) {
  const main = byId(mainId);
  if (!main) return;

  main.innerHTML = `
    ${post.image ? `<img class="archive-main-image" src="${esc(post.image)}" alt="${esc(post.title)}" onerror="this.style.display='none'">` : ""}
    <span class="tag category-tag-large">${esc(post.label)}</span>
    <h2>${esc(post.title)}</h2>
    <div class="archive-meta">
      ${esc(post.dateDisplay)}${post.author ? ` • Posted by ${esc(post.author)}` : ""}
    </div>
    <div class="archive-message">${esc(post.message)}</div>
  `;
}

function renderHistory(posts, selectedId, historyId, selectFunctionName) {
  const history = byId(historyId);
  if (!history) return;

  const previous = posts.filter((post) => post.id !== selectedId);

  if (!previous.length) {
    history.innerHTML = `<p class="loading-text">No previous posts yet.</p>`;
    return;
  }

  history.innerHTML = previous.map((post) => `
    <button class="history-item" onclick="${selectFunctionName}('${esc(post.id)}')">
      <span class="history-tag">${esc(post.label)}</span>
      <strong>${esc(post.title)}</strong>
      <small>${esc(post.dateDisplay)}</small>
    </button>
  `).join("");
}

function selectAdvisory(id) {
  const post = advisoryPosts.find((item) => item.id === id);
  if (!post) return;

  renderMain(post, "advisoryMain");
  renderHistory(advisoryPosts, post.id, "advisoryHistory", "selectAdvisory");
}

function selectReminder(id) {
  const post = reminderPosts.find((item) => item.id === id);
  if (!post) return;

  renderMain(post, "reminderMain");
  renderHistory(reminderPosts, post.id, "reminderHistory", "selectReminder");
}

function renderEmpty(mainId, historyId, title) {
  const main = byId(mainId);
  const history = byId(historyId);

  if (main) {
    main.innerHTML = `
      <h2>${esc(title)}</h2>
      <p>Please check again later.</p>
    `;
  }

  if (history) history.innerHTML = `<p class="loading-text">No history yet.</p>`;
}

async function loadAnnouncements() {
  try {
    if (announcementStatus) announcementStatus.textContent = "Loading announcements...";

    const res = await fetch("/api/public", {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Unable to load announcements.");

    applySettings(data.settings || {});

    const allPosts = (data.posts || [])
      .map(normalizePost)
      .sort((a, b) => b.sortTime !== a.sortTime ? b.sortTime - a.sortTime : b.rowOrder - a.rowOrder);

    advisoryPosts = allPosts.filter((post) => post.category === "school advisory");
    reminderPosts = allPosts.filter((post) => post.category === "reminder");

    if (advisoryPosts.length) {
      selectAdvisory(advisoryPosts[0].id);
    } else {
      renderEmpty("advisoryMain", "advisoryHistory", "No school advisories posted yet.");
    }

    if (reminderPosts.length) {
      selectReminder(reminderPosts[0].id);
    } else {
      renderEmpty("reminderMain", "reminderHistory", "No reminders posted yet.");
    }

    if (announcementStatus) {
      announcementStatus.textContent = data.generated_at
        ? "Last updated: " + new Date(data.generated_at).toLocaleString("en-PH")
        : "";
    }
  } catch (error) {
    const advisoryMain = byId("advisoryMain");
    const reminderMain = byId("reminderMain");

    if (advisoryMain) advisoryMain.innerHTML = `<h2>Unable to load school advisories</h2><p>${esc(error.message || "Please refresh the page.")}</p>`;
    if (reminderMain) reminderMain.innerHTML = `<h2>Unable to load reminders</h2><p>${esc(error.message || "Please refresh the page.")}</p>`;
    if (announcementStatus) announcementStatus.textContent = "";
  }
}

loadAnnouncements();


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

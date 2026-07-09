const latestSection = document.getElementById("latest");
const newsSection = document.getElementById("newsSection");
const eventsSection = document.getElementById("eventsSection");
const remindersSection = document.getElementById("remindersSection");
const advisorySection = document.getElementById("advisorySection");
const modal = document.getElementById("postModal");
const modalContent = document.getElementById("modalContent");
const loadStatus = document.getElementById("loadStatus");

let allPosts = [];

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

function excerpt(value, max) {
  const text = clean(value).replace(/\s+/g, " ");
  return text.length > max ? text.slice(0, max).trim() + "..." : text;
}

function normalizeCategory(type) {
  const value = clean(type).toLowerCase();

  if (value === "news" || value === "latest news") return "news";
  if (["event", "events", "school event", "school events"].includes(value)) return "event";
  if (["reminder", "reminders", "important reminder", "important reminders"].includes(value)) return "reminder";
  if (["school advisory", "school advisories", "advisory", "advisories", "announcement", "announcements"].includes(value)) return "school advisory";

  return value;
}

function label(type) {
  const category = normalizeCategory(type);
  if (category === "news") return "News";
  if (category === "event") return "Event";
  if (category === "reminder") return "Reminder";
  if (category === "school advisory") return "School Advisory";
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
    category: normalizeCategory(post.type),
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

function applySettings(settings) {
  settings = settings || {};

  const schoolName = clean(settings.school_name) || "Learning Journey Child Growth Center, Inc.";
  const tagline = clean(settings.school_tagline) || "Where Learning is a Journey and Not a Race";
  const logo = clean(settings.logo_url);
  const phone = clean(settings.phone);
  const email = clean(settings.email);
  const maps = clean(settings.google_maps);
  const messenger = clean(settings.messenger);
  const address = clean(settings.address);

  document.title = schoolName;
  document.getElementById("schoolName").textContent = schoolName;
  document.getElementById("schoolTagline").textContent = tagline;
  document.getElementById("footerSchoolName").textContent = schoolName;
  document.getElementById("footerAddress").textContent = address;

  const logoEl = document.getElementById("schoolLogo");

  if (logo) {
    logoEl.src = logo;
    logoEl.classList.remove("hidden");
  } else {
    logoEl.removeAttribute("src");
    logoEl.classList.add("hidden");
  }

  if (phone) document.getElementById("callAction").href = "tel:" + phone;
  if (email) document.getElementById("emailAction").href = "mailto:" + email;
  if (maps) document.getElementById("mapsAction").href = maps;
  if (messenger) document.getElementById("messengerAction").href = messenger;
}

function readButton(id) {
  return `<button class="btn" onclick="openPost('${esc(id)}')">Read More</button>`;
}

function renderLatest(post) {
  const image = post.image ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" class="post-image" onerror="this.style.display='none'">` : "";
  const date = post.dateDisplay ? `<span class="date-inline">${esc(post.dateDisplay)}</span>` : "";

  if (post.image) {
    latestSection.innerHTML = `
      <div class="featured-layout">
        ${image}
        <div class="featured-content">
          <div><span class="tag">${esc(post.label)}</span>${date}</div>
          <h2>${esc(post.title)}</h2>
          <p>${esc(excerpt(post.message, 220))}</p>
          ${readButton(post.id)}
        </div>
      </div>
    `;
    return;
  }

  latestSection.innerHTML = `
    <div class="tag">${esc(post.label)}</div>
    ${post.dateDisplay ? `<div class="date">${esc(post.dateDisplay)}</div>` : ""}
    <h2>${esc(post.title)}</h2>
    <p>${esc(excerpt(post.message, 220))}</p>
    ${readButton(post.id)}
  `;
}

function compactCard(post) {
  const image = post.image ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" class="post-image" onerror="this.style.display='none'">` : "";

  return `
    <article class="compact-card">
      ${image}
      <div class="tag-row">
        <span class="tag">${esc(post.label)}</span>
        ${post.dateDisplay ? `<span class="small-date">${esc(post.dateDisplay)}</span>` : ""}
      </div>
      <h2>${esc(post.title)}</h2>
      <p>${esc(excerpt(post.message, 130))}</p>
      ${readButton(post.id)}
    </article>
  `;
}

function emptyCard(labelText) {
  return `<article class="compact-card"><div class="empty-card">No ${esc(labelText)} posted yet.</div></article>`;
}

function findCategory(posts, category, topId) {
  return posts.find((post) => post.category === category && post.id !== topId) || null;
}

function renderPosts(posts) {
  allPosts = posts;

  if (!posts.length) {
    latestSection.innerHTML = `
      <div class="tag">Latest Update</div>
      <h2>No school updates yet.</h2>
      <p>Published posts will appear here once available.</p>
    `;

    newsSection.innerHTML = emptyCard("news");
    eventsSection.innerHTML = emptyCard("events");
    remindersSection.innerHTML = emptyCard("reminders");
    advisorySection.innerHTML = emptyCard("school advisories");
    return;
  }

  const topPost = posts[0];
  renderLatest(topPost);

  const news = findCategory(posts, "news", topPost.id);
  const event = findCategory(posts, "event", topPost.id);
  const reminder = findCategory(posts, "reminder", topPost.id);
  const advisory = findCategory(posts, "school advisory", topPost.id);

  newsSection.innerHTML = news ? compactCard(news) : emptyCard("news");
  eventsSection.innerHTML = event ? compactCard(event) : emptyCard("events");
  remindersSection.innerHTML = reminder ? compactCard(reminder) : emptyCard("reminders");
  advisorySection.innerHTML = advisory ? compactCard(advisory) : emptyCard("school advisories");
}

function openPost(id) {
  const post = allPosts.find((item) => item.id === id);
  if (!post) return;

  modalContent.innerHTML = `
    ${post.image ? `<img src="${esc(post.image)}" class="modal-img" alt="${esc(post.title)}" onerror="this.style.display='none'">` : ""}
    <span class="tag">${esc(post.label)}</span>
    <h1 class="modal-title">${esc(post.title)}</h1>
    <div class="modal-meta">${esc(post.dateDisplay)}${post.author ? ` • Posted by ${esc(post.author)}` : ""}</div>
    <div class="modal-message">${esc(post.message)}</div>
  `;

  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

async function loadPublicData() {
  try {
    loadStatus.textContent = "Loading school updates...";

    const res = await fetch("/api/public", {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Unable to load public data.");

    applySettings(data.settings || {});

    const posts = (data.posts || [])
      .map(normalizePost)
      .filter((post) => post.title || post.message)
      .sort((a, b) => b.sortTime !== a.sortTime ? b.sortTime - a.sortTime : b.rowOrder - a.rowOrder);

    renderPosts(posts);

    loadStatus.textContent = data.generated_at
      ? "Last updated: " + new Date(data.generated_at).toLocaleString("en-PH")
      : "";
  } catch (error) {
    latestSection.innerHTML = `
      <div class="tag">Latest Update</div>
      <h2>Unable to load school updates</h2>
      <p>Please refresh the page or try again later.</p>
    `;

    newsSection.innerHTML = emptyCard("news");
    eventsSection.innerHTML = emptyCard("events");
    remindersSection.innerHTML = emptyCard("reminders");
    advisorySection.innerHTML = emptyCard("school advisories");

    loadStatus.textContent = error.message || "Unable to load data.";
  }
}

loadPublicData();

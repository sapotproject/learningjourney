/* =========================================================
   Learning Journey Homepage Data Renderer
   Stable v1
   Matches approved homepage IDs:
   - latestSection
   - newsSection
   - eventsSection
   - remindersSection
   - advisorySection
   ========================================================= */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOHLGgAxYbhITD4PYOEaFKVWZMntDHMCQ5raJYiDgwo2CQeFGTCXp-BUxPCF4Mu9k/exec";

const latestSection = document.getElementById("latestSection");
const newsSection = document.getElementById("newsSection");
const eventsSection = document.getElementById("eventsSection");
const remindersSection = document.getElementById("remindersSection");
const advisorySection = document.getElementById("advisorySection");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeCategory(type) {
  const value = cleanText(type).toLowerCase();

  if (value === "news" || value === "latest news") return "news";
  if (value === "event" || value === "events" || value === "school event" || value === "school events") return "event";
  if (value === "reminder" || value === "reminders" || value === "important reminder" || value === "important reminders") return "reminder";
  if (value === "school advisory" || value === "advisory" || value === "advisories" || value === "school advisories" || value === "announcement" || value === "announcements") return "school advisory";

  return value;
}

function displayCategoryLabel(type) {
  const category = normalizeCategory(type);
  if (category === "news") return "News";
  if (category === "event") return "Event";
  if (category === "reminder") return "Reminder";
  if (category === "school advisory") return "School Advisory";
  return cleanText(type) || "Update";
}

function formatDate(value) {
  if (!value) return "";
  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const date = new Date(raw + "T00:00:00");
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  }

  return raw;
}

function getSortTime(post) {
  const raw = post.date || post.created_at || "";
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizePost(post, index) {
  return {
    id: cleanText(post.id) || "post-" + index,
    type: cleanText(post.type),
    category: normalizeCategory(post.type),
    label: displayCategoryLabel(post.type),
    title: cleanText(post.title),
    message: cleanText(post.message),
    dateDisplay: formatDate(post.date),
    image: cleanText(post.image || post.image_url || post.photo),
    sortTime: getSortTime(post)
  };
}

function renderLatestPost(post) {
  const dateHtml = post.dateDisplay ? `<span class="date-inline">${escapeHtml(post.dateDisplay)}</span>` : "";

  if (post.image) {
    latestSection.innerHTML = `
      <div class="featured-layout">
        <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" class="post-image">
        <div class="featured-content">
          <div>
            <span class="tag">${escapeHtml(post.label || "Latest Update")}</span>
            ${dateHtml}
          </div>
          <h2>${escapeHtml(post.title)}</h2>
          <p>${escapeHtml(post.message)}</p>
          <a href="#" class="btn">Read More</a>
        </div>
      </div>
    `;
    return;
  }

  latestSection.innerHTML = `
    <div class="tag">${escapeHtml(post.label || "Latest Update")}</div>
    ${post.dateDisplay ? `<div class="date">${escapeHtml(post.dateDisplay)}</div>` : ""}
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.message)}</p>
    <a href="#" class="btn">Read More</a>
  `;
}

function renderCompactPost(post) {
  const imageHtml = post.image
    ? `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" class="post-image">`
    : "";

  return `
    <article class="compact-card">
      ${imageHtml}
      <div class="tag-row">
        <span class="tag">${escapeHtml(post.label)}</span>
        ${post.dateDisplay ? `<span class="small-date">${escapeHtml(post.dateDisplay)}</span>` : ""}
      </div>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(post.message)}</p>
      <a href="#" class="btn">Read More</a>
    </article>
  `;
}

function renderEmptyCard(label) {
  return `
    <article class="compact-card">
      <div class="empty-card">No ${escapeHtml(label)} posted yet.</div>
    </article>
  `;
}

function getLatestByCategory(posts, category, excludedId) {
  return posts.find(post => post.category === category && post.id !== excludedId);
}

function renderError(message) {
  latestSection.innerHTML = `
    <div class="tag">Latest Update</div>
    <h2>Unable to load posts</h2>
    <p>${escapeHtml(message)}</p>
  `;

  newsSection.innerHTML = renderEmptyCard("news");
  eventsSection.innerHTML = renderEmptyCard("events");
  remindersSection.innerHTML = renderEmptyCard("reminders");
  advisorySection.innerHTML = renderEmptyCard("school advisories");
}

async function loadHomepagePosts() {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getPosts&cacheBust=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Unable to load posts.");
    }

    const posts = Array.isArray(result.posts)
      ? result.posts.map(normalizePost).filter(post => post.title && post.message).sort((a, b) => b.sortTime - a.sortTime)
      : [];

    if (posts.length === 0) {
      latestSection.innerHTML = `
        <div class="tag">Latest Update</div>
        <h2>No school updates yet.</h2>
        <p>Published posts will appear here once available.</p>
      `;

      newsSection.innerHTML = renderEmptyCard("news");
      eventsSection.innerHTML = renderEmptyCard("events");
      remindersSection.innerHTML = renderEmptyCard("reminders");
      advisorySection.innerHTML = renderEmptyCard("school advisories");
      return;
    }

    const topPost = posts[0];
    renderLatestPost(topPost);

    newsSection.innerHTML = getLatestByCategory(posts, "news", topPost.id) ? renderCompactPost(getLatestByCategory(posts, "news", topPost.id)) : renderEmptyCard("news");
    eventsSection.innerHTML = getLatestByCategory(posts, "event", topPost.id) ? renderCompactPost(getLatestByCategory(posts, "event", topPost.id)) : renderEmptyCard("events");
    remindersSection.innerHTML = getLatestByCategory(posts, "reminder", topPost.id) ? renderCompactPost(getLatestByCategory(posts, "reminder", topPost.id)) : renderEmptyCard("reminders");
    advisorySection.innerHTML = getLatestByCategory(posts, "school advisory", topPost.id) ? renderCompactPost(getLatestByCategory(posts, "school advisory", topPost.id)) : renderEmptyCard("school advisories");

  } catch (error) {
    renderError(error.message || "Please check Apps Script deployment.");
  }
}

loadHomepagePosts();

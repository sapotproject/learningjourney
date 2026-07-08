/* =========================================================
   Learning Journey Homepage Renderer
   Homepage Fetch Fix v2

   Purpose:
   - Keep approved homepage design unchanged.
   - Fix latest post logic.
   - Fix "Failed to fetch" caused by CORS preflight headers.
   - Top card = newest post overall.
   - Category cards = latest per category, excluding top card.
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

  if (
    value === "event" ||
    value === "events" ||
    value === "school event" ||
    value === "school events"
  ) return "event";

  if (
    value === "reminder" ||
    value === "reminders" ||
    value === "important reminder" ||
    value === "important reminders"
  ) return "reminder";

  if (
    value === "school advisory" ||
    value === "school advisories" ||
    value === "advisory" ||
    value === "advisories" ||
    value === "announcement" ||
    value === "announcements" ||
    value === "news advisory" ||
    value === "news advisories"
  ) return "school advisory";

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

function parseDateTime(value) {
  if (!value) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(raw + "T00:00:00+08:00");
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)) {
    const parsed = new Date(raw.replace(" ", "T") + "+08:00");
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getPostSortTime(post) {
  const createdAtTime = parseDateTime(post.created_at || post.createdAt || post.timestamp);
  const dateTime = parseDateTime(post.date || post.post_date || post.event_date);
  return createdAtTime || dateTime || 0;
}

function formatDate(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  let parsed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    parsed = new Date(raw + "T00:00:00+08:00");
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)) {
    parsed = new Date(raw.replace(" ", "T") + "+08:00");
  } else {
    parsed = new Date(raw);
  }

  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return raw;
}

function normalizePost(post, index) {
  const id = cleanText(post.id) || "post-" + index;
  const type = cleanText(post.type || post.category || post.post_type);
  const title = cleanText(post.title || post.headline || post.post_title);
  const message = cleanText(post.message || post.content || post.body || post.description);
  const date = cleanText(post.date || post.post_date || post.event_date);
  const createdAt = cleanText(post.created_at || post.createdAt || post.timestamp);
  const image = cleanText(post.image || post.image_url || post.imageUrl || post.photo || post.thumbnail);

  return {
    id,
    type,
    category: normalizeCategory(type),
    label: displayCategoryLabel(type),
    title,
    message,
    date,
    created_at: createdAt,
    dateDisplay: formatDate(date || createdAt),
    image,
    sortTime: getPostSortTime({
      date,
      created_at: createdAt
    })
  };
}

function renderLatestPost(post) {
  const imageHtml = post.image
    ? `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" class="post-image">`
    : "";

  const dateInlineHtml = post.dateDisplay
    ? `<span class="date-inline">${escapeHtml(post.dateDisplay)}</span>`
    : "";

  if (post.image) {
    latestSection.innerHTML = `
      <div class="featured-layout">
        ${imageHtml}
        <div class="featured-content">
          <div>
            <span class="tag">${escapeHtml(post.label || "Latest Update")}</span>
            ${dateInlineHtml}
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

function renderLoadingState() {
  if (latestSection) {
    latestSection.innerHTML = `
      <div class="tag">Latest Update</div>
      <h2>Loading latest post...</h2>
      <p>Please wait while we retrieve the latest announcement.</p>
    `;
  }

  if (newsSection) newsSection.innerHTML = renderEmptyCard("news");
  if (eventsSection) eventsSection.innerHTML = renderEmptyCard("events");
  if (remindersSection) remindersSection.innerHTML = renderEmptyCard("reminders");
  if (advisorySection) advisorySection.innerHTML = renderEmptyCard("school advisories");
}

function renderError(message) {
  if (latestSection) {
    latestSection.innerHTML = `
      <div class="tag">Latest Update</div>
      <h2>Unable to load posts</h2>
      <p>${escapeHtml(message || "Please refresh the page.")}</p>
    `;
  }

  if (newsSection) newsSection.innerHTML = renderEmptyCard("news");
  if (eventsSection) eventsSection.innerHTML = renderEmptyCard("events");
  if (remindersSection) remindersSection.innerHTML = renderEmptyCard("reminders");
  if (advisorySection) advisorySection.innerHTML = renderEmptyCard("school advisories");
}

function getLatestByCategory(posts, category, excludedId) {
  return posts.find(post => post.category === category && post.id !== excludedId) || null;
}

function renderHomepage(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
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

  const latestNews = getLatestByCategory(posts, "news", topPost.id);
  const latestEvent = getLatestByCategory(posts, "event", topPost.id);
  const latestReminder = getLatestByCategory(posts, "reminder", topPost.id);
  const latestAdvisory = getLatestByCategory(posts, "school advisory", topPost.id);

  newsSection.innerHTML = latestNews ? renderCompactPost(latestNews) : renderEmptyCard("news");
  eventsSection.innerHTML = latestEvent ? renderCompactPost(latestEvent) : renderEmptyCard("events");
  remindersSection.innerHTML = latestReminder ? renderCompactPost(latestReminder) : renderEmptyCard("reminders");
  advisorySection.innerHTML = latestAdvisory ? renderCompactPost(latestAdvisory) : renderEmptyCard("school advisories");
}

async function fetchPostsFromAppsScript() {
  const url = `${APPS_SCRIPT_URL}?action=getPosts&cacheBust=${Date.now()}`;

  /*
    Important:
    Do not add custom headers here.
    Custom headers trigger CORS preflight, and Google Apps Script web apps
    often fail OPTIONS/preflight requests.
  */
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Post server returned HTTP " + response.status);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Unable to load posts.");
  }

  return Array.isArray(result.posts) ? result.posts : [];
}

async function loadHomepagePosts() {
  renderLoadingState();

  try {
    const rawPosts = await fetchPostsFromAppsScript();

    const posts = rawPosts
      .map(normalizePost)
      .filter(post => post.title || post.message)
      .sort((a, b) => {
        if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime;
        return String(b.id).localeCompare(String(a.id));
      });

    renderHomepage(posts);

  } catch (error) {
    renderError(error.message || "Unable to load posts.");
  }
}

loadHomepagePosts();

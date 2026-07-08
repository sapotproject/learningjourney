/* =========================================================
   Learning Journey Homepage Data Renderer
   This file matches the approved homepage design.

   Required index.html sections:
   - latestSection
   - newsSection
   - eventsSection
   - remindersSection
   - advisorySection
   ========================================================= */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFZrJEXsqktYS-Eamf4X1B7b-MJk-86aw-sYLhiCBv3636XDATjwQqf2YI6Q2mFrnzYw/exec";

const latestSection = document.getElementById("latestSection");
const newsSection = document.getElementById("newsSection");
const eventsSection = document.getElementById("eventsSection");
const remindersSection = document.getElementById("remindersSection");
const advisorySection = document.getElementById("advisorySection");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeType(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return String(value);
}

function getSortDate(post) {
  const dateValue = post.date || post.created_at || post.createdAt || "";
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}

function getImageUrl(post) {
  return post.image || post.image_url || post.imageUrl || post.photo || "";
}

function renderLatestPost(post) {
  const imageUrl = getImageUrl(post);

  if (imageUrl) {
    latestSection.innerHTML = `
      <div class="featured-layout">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" class="post-image">
        <div class="featured-content">
          <div>
            <span class="tag">${escapeHtml(post.type || "Latest Update")}</span>
            <span class="date-inline">${escapeHtml(normalizeDate(post.date))}</span>
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
    <div class="tag">${escapeHtml(post.type || "Latest Update")}</div>
    <div class="date">${escapeHtml(normalizeDate(post.date))}</div>
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.message)}</p>
    <a href="#" class="btn">Read More</a>
  `;
}

function renderCompactPost(post) {
  const imageUrl = getImageUrl(post);
  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" class="post-image">`
    : "";

  return `
    <article class="compact-card">
      ${imageHtml}
      <div class="tag-row">
        <span class="tag">${escapeHtml(post.type)}</span>
        <span class="small-date">${escapeHtml(normalizeDate(post.date))}</span>
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
      <div class="empty-card">
        No ${escapeHtml(label)} posted yet.
      </div>
    </article>
  `;
}

function showError(message) {
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
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getPosts`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("The school update server did not respond correctly.");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "The school update server returned an error.");
    }

    const posts = Array.isArray(result.posts)
      ? result.posts
          .filter(post => post && post.title && post.message)
          .sort((a, b) => getSortDate(b) - getSortDate(a))
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

    const topPostId = String(topPost.id || "");

    const latestNews = posts.find(post =>
      normalizeType(post.type) === "news" &&
      String(post.id || "") !== topPostId
    );

    const latestEvent = posts.find(post =>
      normalizeType(post.type) === "event" &&
      String(post.id || "") !== topPostId
    );

    const latestReminder = posts.find(post =>
      normalizeType(post.type) === "reminder" &&
      String(post.id || "") !== topPostId
    );

    const latestAdvisory = posts.find(post =>
      normalizeType(post.type) === "school advisory" &&
      String(post.id || "") !== topPostId
    );

    newsSection.innerHTML = latestNews ? renderCompactPost(latestNews) : renderEmptyCard("news");
    eventsSection.innerHTML = latestEvent ? renderCompactPost(latestEvent) : renderEmptyCard("events");
    remindersSection.innerHTML = latestReminder ? renderCompactPost(latestReminder) : renderEmptyCard("reminders");
    advisorySection.innerHTML = latestAdvisory ? renderCompactPost(latestAdvisory) : renderEmptyCard("school advisories");

  } catch (error) {
    showError(error.message || "Please check the Apps Script URL and deployment.");
  }
}

loadHomepagePosts();

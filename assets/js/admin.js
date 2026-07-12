// SchoolsPH Manila timezone dashboard patch: 20260713-manila-timezone-dashboard-v1
/* SchoolsPH Dashboard Identity + Post Metadata v1 */
// SchoolsPH admin.js patch: 20260712-teacher-edit-message-v1
// Clear old persistent login from previous versions.
// This prevents admin.html from auto-opening the dashboard because of an old localStorage token.
localStorage.removeItem("lj_token");
localStorage.removeItem("lj_user");

let token = sessionStorage.getItem("lj_token") || "";
let currentUser = JSON.parse(sessionStorage.getItem("lj_user") || "null");

let publishedPostCache = [];
let deletedPostCache = [];
let publishedVisibleCount = 10;
let deletedVisibleCount = 10;

const POST_IMAGE_MAX_BYTES = 500 * 1024;

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const logoutBtn = document.getElementById("logoutBtn");

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let idleTimer = null;
let idleLogoutInProgress = false;


function isAdminRole() {
  return currentUser && String(currentUser.role || "").toLowerCase() === "admin";
}

function setDisplayById(id, displayValue) {
  const el = document.getElementById(id);
  if (el) el.style.display = displayValue;
}

function hideAdminOnlyPanelsForTeacher() {
  const adminAllowed = isAdminRole();

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = adminAllowed ? "" : "none";
  });

  [
    "settingsPanel",
    "usersPanel",
    "formsManagerPanel",
    "galleryManagerPanel"
  ].forEach((id) => {
    setDisplayById(id, adminAllowed ? "" : "none");
  });
}

function applyRoleVisibility() {
  hideAdminOnlyPanelsForTeacher();
}

function adminOnlyActionGuard(showMessage = true) {
  if (isAdminRole()) return true;
  hideAdminOnlyPanelsForTeacher();
  if (showMessage) {
    alert("Unauthorized. Your teacher account cannot manage Forms, Gallery, Users, or Page Settings.");
  }
  return false;
}

function friendlyError(prefix, error) {
  const details = error && error.message ? " (" + error.message + ")" : "";
  return (prefix || "Something went wrong.") + details;
}

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return { success: false, message: "Server returned an unreadable response. Please refresh and try again." };
  }
}

function logout(reason = "") {
  sessionStorage.clear();
  localStorage.removeItem("lj_token");
  localStorage.removeItem("lj_user");
  token = "";
  currentUser = null;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  idleLogoutInProgress = false;
  document.body.classList.remove("logged-in");
  applyRoleVisibility();
  start();
  if (reason) setMsg("loginMessage", reason, "error");
}

function resetIdleTimer() {
  if (!token || !currentUser) return;

  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    if (!token || !currentUser || idleLogoutInProgress) return;
    idleLogoutInProgress = true;
    logout("You were automatically logged out after 30 minutes of inactivity.");
  }, IDLE_TIMEOUT_MS);
}

["click", "keydown", "input", "change", "mousemove", "scroll", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, resetIdleTimer, { passive: true });
});


function authHeaders() {
  return { Authorization: "Bearer " + token };
}


function isAdminRole() {
  return currentUser && String(currentUser.role || "").toLowerCase() === "admin";
}

function normalizeOwner(value) {
  return String(value || "").trim().toLowerCase();
}

function isOwnPost(post) {
  if (!currentUser || !post) return false;
  return normalizeOwner(post.author) === normalizeOwner(currentUser.name || currentUser.username);
}

function canCurrentUserModifyPost(post) {
  return isAdminRole() || isOwnPost(post);
}


function unauthorizedEditPostMessage() {
  alert("Unauthorized. Teacher accounts can only edit posts they created. Please ask an admin if this post needs to be changed.");
}

function unauthorizedDeletePostMessage() {
  alert("Unauthorized. Teacher accounts can only move to Recycle Bin or restore posts they created. Please ask an admin if this post needs to be changed.");
}

function unauthorizedMessage() {
  alert("Unauthorized. Your teacher account can only manage posts that you created.");
}

function adminSettingsUnauthorizedMessage() {
  alert("Unauthorized. Page Settings can only be changed by an admin account.");
}

function findPostFromCache(id) {
  return [...(publishedPostCache || []), ...(deletedPostCache || [])]
    .find((post) => String(post.id) === String(id));
}

function byId(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

function setMsg(id, text, className) {
  const el = byId(id);
  if (!el) return;

  el.textContent = text || "";
  el.className = "form-message";

  if (className) el.classList.add(className);
}

function setMiniMsg(id, text, className) {
  const el = byId(id);
  if (!el) return;

  el.textContent = text || "";
  el.className = "mini-message";

  if (className) el.classList.add(className);
}

function isDeleted(post) {
  return String(post.deleted).toUpperCase() === "TRUE" || post.status === "deleted";
}

function shortText(text, max = 160) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? value.slice(0, max).trim() + "..." : value;
}

function getPostImage(post) {
  return post.image || post.image_url || "";
}

function isPinned(post) {
  return Number(post.pinned || 0) === 1 || String(post.pinned).toLowerCase() === "true";
}

function featuredBadge(post) {
  return isPinned(post) ? `<span class="featured-dashboard-badge">⭐ Featured on Homepage</span>` : "";
}

function featureButton(post) {
  if (isPinned(post)) {
    return `<button class="small-btn clear-btn" onclick="postAction('${esc(post.id)}','unpin')">Unpin from Homepage</button>`;
  }

  return `<button class="small-btn restore-btn" onclick="postAction('${esc(post.id)}','pin')">Set as Homepage Feature</button>`;
}

function imageThumb(post) {
  const imageUrl = getPostImage(post);

  if (!imageUrl) {
    return `<div class="dashboard-post-thumb empty-thumb">No Image</div>`;
  }

  return `
    <img
      class="dashboard-post-thumb"
      src="${esc(imageUrl)}"
      alt="${esc(post.title)}"
      loading="lazy"
      onerror="this.outerHTML='<div class=&quot;dashboard-post-thumb empty-thumb&quot;>Image unavailable</div>'"
    >
  `;
}

function fileTooLarge(file, maxBytes) {
  return file && file.size > maxBytes;
}

function formatKb(bytes) {
  return Math.ceil(bytes / 1024) + " KB";
}

function start() {
  if (token && currentUser) {
    injectDashboardIdentityStyles();
    document.body.classList.add("logged-in");
    hide(loginPanel);
    show(dashboardPanel);
    show(logoutBtn);

    if (byId("postDate")) byId("postDate").valueAsDate = new Date();

    resetIdleTimer();
    renderCurrentUserBox();
    applyRoleVisibility();
    loadAll();
  } else {
    document.body.classList.remove("logged-in");
    token = "";
    currentUser = null;
    sessionStorage.removeItem("lj_token");
    sessionStorage.removeItem("lj_user");
    renderCurrentUserBox();
    show(loginPanel);
    hide(dashboardPanel);
    hide(logoutBtn);
  }
}

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  setMsg("loginMessage", "Logging in, please wait...", "");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUsername.value,
        password: loginPassword.value
      })
    });

    const data = await readJsonSafe(res);

    if (!data.success) {
      setMsg("loginMessage", data.message || "Login failed. Please check your username and password.", "error");
      return;
    }

    token = data.token;
    currentUser = data.user;

    sessionStorage.setItem("lj_token", token);
    sessionStorage.setItem("lj_user", JSON.stringify(currentUser));

    setMsg("loginMessage", "", "");
    start();
  } catch (error) {
    setMsg("loginMessage", friendlyError("Unable to login. Please check your internet connection and try again.", error), "error");
  }
});

logoutBtn.onclick = () => {
  logout("");
};

function updateCurrentImageBox() {
  const box = byId("currentImageBox");
  const previewImg = byId("currentPostImagePreview");
  const removeBox = byId("removePostImage");

  if (!box || !previewImg) return;

  if (postId.value && existingImageUrl.value) {
    previewImg.src = existingImageUrl.value;
    box.classList.remove("hidden");
  } else {
    previewImg.src = "";
    box.classList.add("hidden");
    if (removeBox) removeBox.checked = false;
  }
}

function preview() {
  const type = postType.value;
  const date = postDate.value;
  const title = postTitle.value;
  const message = postMessageText.value;
  const imageFile = postImage.files && postImage.files[0];
  const pinned = postPinned && postPinned.checked;
  const removeImage = removePostImage && removePostImage.checked;

  if (imageFile && fileTooLarge(imageFile, POST_IMAGE_MAX_BYTES)) {
    setMsg("postMessage", `Image is too large (${formatKb(imageFile.size)}). Maximum is 500 KB.`, "error");
  }

  if (!type && !date && !title && !message && !imageFile && !existingImageUrl.value) {
    postPreview.innerHTML = '<p class="preview-empty">Preview will appear here while you type.</p>';
    return;
  }

  let imageHtml = "";

  if (imageFile && !fileTooLarge(imageFile, POST_IMAGE_MAX_BYTES)) {
    const tempUrl = URL.createObjectURL(imageFile);
    imageHtml = `<img class="preview-image" src="${tempUrl}" alt="Preview image">`;
  } else if (existingImageUrl.value && !removeImage) {
    imageHtml = `<img class="preview-image" src="${esc(existingImageUrl.value)}" alt="Current image">`;
  } else if (existingImageUrl.value && removeImage) {
    imageHtml = `<p class="preview-empty">Current image will be removed after saving.</p>`;
  }

  postPreview.innerHTML = `
    ${imageHtml}
    ${pinned ? `<span class="preview-tag featured-preview-tag">⭐ Featured on Homepage</span>` : ""}
    ${type ? `<span class="preview-tag">${esc(type)}</span>` : ""}
    ${date ? `<p class="preview-date">${esc(date)}</p>` : ""}
    <h2 class="preview-title">${esc(title || "Untitled Post")}</h2>
    <p class="preview-message">${esc(message || "No message yet.")}</p>
  `;
}

["postType", "postDate", "postTitle", "postMessageText", "postImage", "postPinned", "removePostImage"].forEach((id) => {
  const el = byId(id);
  if (!el) return;

  el.addEventListener("input", preview);
  el.addEventListener("change", preview);
});

if (byId("postSearch")) {
  postSearch.addEventListener("input", () => {
    publishedVisibleCount = 10;
    renderPostLists();
  });
}

if (byId("postFilter")) {
  postFilter.addEventListener("change", () => {
    publishedVisibleCount = 10;
    renderPostLists();
  });
}

if (byId("clearPostFilters")) {
  clearPostFilters.addEventListener("click", () => {
    postSearch.value = "";
    postFilter.value = "all";
    publishedVisibleCount = 10;
    renderPostLists();
  });
}

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const imageFile = postImage.files && postImage.files[0];

  if (fileTooLarge(imageFile, POST_IMAGE_MAX_BYTES)) {
    setMsg("postMessage", `Image is too large (${formatKb(imageFile.size)}). Maximum is 500 KB.`, "error");
    return;
  }

  setMsg("postMessage", "Saving post...", "");

  const fd = new FormData();
  fd.append("id", postId.value);
  fd.append("type", postType.value);
  fd.append("title", postTitle.value);
  fd.append("message", postMessageText.value);
  fd.append("date", postDate.value);
  fd.append("existing_image_url", existingImageUrl.value);
  fd.append("existing_image_key", existingImageKey.value);
  fd.append("remove_image", removePostImage && removePostImage.checked ? "1" : "0");
  fd.append("pinned", postPinned && postPinned.checked ? "1" : "0");

  if (imageFile) {
    fd.append("image", imageFile);
  }

  const res = await fetch("/api/posts", {
    method: "POST",
    headers: authHeaders(),
    body: fd
  });

  const data = await res.json();

  if (!data.success) {
    setMsg("postMessage", data.message || "Save failed.", "error");
    return;
  }

  clearPost();
  setMsg("postMessage", data.message || "Saved.", "success");
  loadPosts();
});

clearPostBtn.onclick = clearPost;

function clearPost() {
  postForm.reset();
  postId.value = "";
  existingImageUrl.value = "";
  existingImageKey.value = "";

  if (postPinned) postPinned.checked = false;
  if (removePostImage) removePostImage.checked = false;

  postFormTitle.textContent = "Create New Post";
  savePostBtn.textContent = "Publish Post";
  postDate.valueAsDate = new Date();

  updateCurrentImageBox();
  preview();
}

async function loadPosts() {
  allPosts.innerHTML = '<p class="loading-text">Loading posts, please wait...</p>';
  recyclePosts.innerHTML = '<p class="loading-text">Loading recycle bin...</p>';

  try {
    const res = await fetch("/api/posts", {
      headers: authHeaders()
    });

    const data = await readJsonSafe(res);

    if (!data.success) {
      allPosts.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load posts. Please refresh and try again.") + "</p>";
      recyclePosts.innerHTML = '<p class="loading-text">Unable to load recycle bin.</p>';

      if (res.status === 401) logout("Your session expired. Please login again.");

      return;
    }

    publishedPostCache = data.posts.filter((post) => !isDeleted(post));
    deletedPostCache = data.posts.filter(isDeleted);

    renderPostLists();
  } catch (error) {
    allPosts.innerHTML = '<p class="loading-text">Unable to load posts. Please check your internet connection and refresh.</p>';
    recyclePosts.innerHTML = '<p class="loading-text">Unable to load recycle bin.</p>';
  }
}

function filteredPublishedPosts() {
  const query = byId("postSearch") ? postSearch.value.trim().toLowerCase() : "";
  const filter = byId("postFilter") ? postFilter.value : "all";

  return publishedPostCache.filter((post) => {
    const matchQuery = !query ||
      String(post.title || "").toLowerCase().includes(query) ||
      String(post.message || "").toLowerCase().includes(query) ||
      String(post.author || "").toLowerCase().includes(query) ||
      String(post.type || "").toLowerCase().includes(query);

    const matchFilter =
      filter === "all" ||
      (filter === "featured" && isPinned(post)) ||
      post.type === filter;

    return matchQuery && matchFilter;
  });
}


function canCurrentUserModifyPost(post) {
  return isAdminRole() || isOwnPost(post);
}

function postRestrictionNote(post) {
  if (canCurrentUserModifyPost(post)) return "";
  return `<div class="mini-message">Teacher view: you can only edit or delete posts that you created.</div>`;
}


function parseSchoolTimestamp(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  const raw = String(value).trim();

  // D1 CURRENT_TIMESTAMP returns UTC like: 2026-07-12 16:56:00
  // JavaScript may treat that as local time unless we explicitly mark it as UTC.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return new Date(raw.replace(" ", "T") + "Z");
  }

  // Also support timestamps without seconds: 2026-07-12 16:56
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return new Date(raw.replace(" ", "T") + ":00Z");
  }

  return new Date(raw);
}

function formatDateTime(value) {
  if (!value) return "";

  const date = parseSchoolTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}


function injectDashboardIdentityStyles() {
  if (document.getElementById("dashboardIdentityMetaStyle")) return;

  const style = document.createElement("style");
  style.id = "dashboardIdentityMetaStyle";
  style.textContent = `
    .current-user-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff8e1;
      border: 1px solid rgba(122, 31, 31, 0.14);
      border-radius: 14px;
      padding: 10px 12px;
      margin: 0 0 16px;
      font-size: 0.95rem;
      color: #3c2415;
    }

    .current-user-box .muted {
      opacity: 0.55;
      margin: 0 4px;
    }

    .current-user-icon {
      font-size: 1.1rem;
    }

    .post-audit-meta {
      margin: 8px 0 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(139, 90, 60, 0.07);
      color: #4a2b1a;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .post-audit-meta strong {
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

function renderCurrentUserBox() {
  const box = document.getElementById("currentUserBox");
  if (!box) return;

  if (!currentUser) {
    box.classList.add("hidden");
    return;
  }

  const nameEl = document.getElementById("currentUserName");
  const roleEl = document.getElementById("currentUserRole");
  const usernameEl = document.getElementById("currentUserUsername");

  if (nameEl) nameEl.textContent = currentUser.name || currentUser.username || "User";
  if (roleEl) roleEl.textContent = currentUser.role || "user";
  if (usernameEl) usernameEl.textContent = "@" + (currentUser.username || "");

  box.classList.remove("hidden");
}

function postMetadataHtml(post) {
  const createdBy = post.author || post.created_by || "Unknown";
  const createdAt = post.created_at || post.date || "";
  const editedBy = post.last_edited_by || "";
  const editedAt = post.last_edited_at || "";

  let html = `
    <div class="post-audit-meta">
      <div><strong>Created by:</strong> ${esc(createdBy)}${createdAt ? " · " + esc(formatDateTime(createdAt)) : ""}</div>
  `;

  if (editedBy || editedAt) {
    html += `<div><strong>Last edited:</strong> ${esc(editedBy || "Unknown")}${editedAt ? " · " + esc(formatDateTime(editedAt)) : ""}</div>`;
  }

  if (post.deleted_by || post.deleted_at) {
    html += `<div><strong>Deleted by:</strong> ${esc(post.deleted_by || "Unknown")}${post.deleted_at ? " · " + esc(formatDateTime(post.deleted_at)) : ""}</div>`;
  }

  html += `</div>`;
  return html;
}

function renderPostLists() {
  const publishedPosts = filteredPublishedPosts();
  const visiblePublished = publishedPosts.slice(0, publishedVisibleCount);
  const visibleDeleted = deletedPostCache.slice(0, deletedVisibleCount);

  allPosts.innerHTML = publishedPosts.length
    ? visiblePublished.map(postItem).join("") + loadMorePublishedHtml(publishedPosts.length)
    : '<p class="loading-text">No matching posts found.</p>';

  recyclePosts.innerHTML = deletedPostCache.length
    ? visibleDeleted.map(recycleItem).join("") + loadMoreDeletedHtml(deletedPostCache.length)
    : '<p class="loading-text">Recycle Bin is empty.</p>';
}

function loadMorePublishedHtml(total) {
  if (publishedVisibleCount >= total) {
    return `<p class="loading-text list-count-note">Showing ${total} post${total === 1 ? "" : "s"}.</p>`;
  }

  return `
    <button class="small-btn clear-btn load-more-btn" onclick="loadMorePublished()" type="button">
      Load More Posts (${publishedVisibleCount} of ${total})
    </button>
  `;
}

function loadMoreDeletedHtml(total) {
  if (deletedVisibleCount >= total) {
    return `<p class="loading-text list-count-note">Showing ${total} deleted post${total === 1 ? "" : "s"}.</p>`;
  }

  return `
    <button class="small-btn clear-btn load-more-btn" onclick="loadMoreDeleted()" type="button">
      Load More Deleted Posts (${deletedVisibleCount} of ${total})
    </button>
  `;
}

function loadMorePublished() {
  publishedVisibleCount += 10;
  renderPostLists();
}

function loadMoreDeleted() {
  deletedVisibleCount += 10;
  renderPostLists();
}

function postItem(post) {
  return `
    <div class="post-item">
      <div class="dashboard-post-row">
        ${imageThumb(post)}
        <div class="dashboard-post-body">
          <h4>${esc(post.title)}</h4>
          ${postMetadataHtml(post)}
          ${featuredBadge(post)}
          <div class="post-meta">
            ${esc(post.type)} • ${esc(post.date)} • ${esc(post.author || "")}
          </div>
          <p>${esc(shortText(post.message, 170))}</p>
          <div class="post-actions">
            ${featureButton(post)}
            <button class="small-btn edit-btn" onclick='editPost(${JSON.stringify(post).replaceAll("'", "&#039;")})'>Edit</button>
            <button class="small-btn delete-btn" onclick="postAction('${esc(post.id)}','delete')">Move to Recycle Bin</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function recycleItem(post) {
  return `
    <div class="post-item">
      <div class="dashboard-post-row">
        ${imageThumb(post)}
        <div class="dashboard-post-body">
          <h4>${esc(post.title)}</h4>
          ${postMetadataHtml(post)}
          <div class="post-meta">
            ${esc(post.type)} • Deleted
          </div>
          <p>${esc(shortText(post.message, 170))}</p>
          <div class="post-actions">
            <button class="small-btn restore-btn" onclick="postAction('${esc(post.id)}','restore')">Restore</button>
            <button class="small-btn permanent-btn" onclick="permanentDelete('${esc(post.id)}')">Permanent Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function editPost(post) {
  if (!canCurrentUserModifyPost(post)) { unauthorizedEditPostMessage(); return; }
postId.value = post.id;
  postType.value = post.type;
  postTitle.value = post.title;
  postMessageText.value = post.message;
  postDate.value = post.date;
  existingImageUrl.value = post.image || post.image_url || "";
  existingImageKey.value = post.image_key || "";

  if (postPinned) postPinned.checked = isPinned(post);
  if (removePostImage) removePostImage.checked = false;

  postFormTitle.textContent = "Edit Post";
  savePostBtn.textContent = "Update Post";

  updateCurrentImageBox();
  window.scrollTo({ top: 0, behavior: "smooth" });
  preview();
}

async function postAction(id, action) {
  const post = findPostFromCache(id);

  if ((action === "delete" || action === "restore") && post && !canCurrentUserModifyPost(post)) {
    unauthorizedDeletePostMessage();
    return;
  }

  if ((action === "pin" || action === "unpin") && post && !canCurrentUserModifyPost(post)) {
    unauthorizedMessage();
    return;
  }

  const messages = {
    delete: "Move to Recycle Bin?",
    restore: "Restore post?",
    pin: "Show this post at the top of the homepage? This will replace the current featured post.",
    unpin: "Remove this post from the homepage top feature?"
  };

  if (!confirm(messages[action] || "Continue?")) return;

  try {
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ id, action })
    });

    const data = await readJsonSafe(res);

    if (!data.success) {
      alert(data.message || "Action failed.");
      return;
    }

    alert(data.message || "Done.");
    loadPosts();
  } catch (error) {
    alert("Unable to complete the action. Please check your internet connection and try again.");
  }
}

async function permanentDelete(id) {
  const post = findPostFromCache(id);
  if (post && !isAdminRole()) { alert("Unauthorized. Permanent delete is admin-only."); return; }
if (!confirm("Permanently delete this post?")) return;

  const res = await fetch("/api/posts", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({ id })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Delete failed.");
    return;
  }

  alert(data.message || "Done.");
  loadPosts();
}

async function loadSettings() {
  const res = await fetch("/api/settings", {
    headers: authHeaders()
  });

  const data = await res.json();
  if (!data.success) return;

  const settings = data.settings || {};

  [
    "school_name",
    "school_tagline",
    "phone",
    "email",
    "messenger",
    "google_maps",
    "address",
    "office_hours"
  ].forEach((key) => {
    document.getElementById("set_" + key).value = settings[key] || "";
  });

  const logoUrl = settings.logo_url || "";
  set_logo_url.value = logoUrl;

  if (logoUrl) {
    logoPreview.src = logoUrl;
    logoPreview.classList.remove("hidden");
  } else {
    logoPreview.src = "";
    logoPreview.classList.add("hidden");
  }
}

uploadLogoBtn.addEventListener("click", async () => {
  if (!set_logo_file.files[0]) {
    setMiniMsg("logoUploadMessage", "Please choose a logo image first.", "error");
    return;
  }

  if (set_logo_file.files[0].size > 500 * 1024) {
    setMiniMsg("logoUploadMessage", "Logo is too large. Please keep it below 500 KB.", "error");
    return;
  }

  setMiniMsg("logoUploadMessage", "Uploading logo...", "");

  const fd = new FormData();
  fd.append("logo", set_logo_file.files[0]);

  const res = await fetch("/api/upload-logo", {
    method: "POST",
    headers: authHeaders(),
    body: fd
  });

  const data = await res.json();

  if (!data.success) {
    setMiniMsg("logoUploadMessage", data.message || "Logo upload failed.", "error");
    return;
  }

  set_logo_url.value = data.url;
  logoPreview.src = data.url;
  logoPreview.classList.remove("hidden");

  setMiniMsg("logoUploadMessage", "Logo uploaded and applied. Refresh the homepage to check.", "success");
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  
  if (!isAdminRole()) { adminSettingsUnauthorizedMessage(); return; }
const settings = {};

  [
    "school_name",
    "school_tagline",
    "phone",
    "email",
    "messenger",
    "google_maps",
    "address",
    "office_hours",
    "logo_url"
  ].forEach((key) => {
    settings[key] = document.getElementById("set_" + key).value;
  });

  const res = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify(settings)
  });

  const data = await res.json();
  setMsg("settingsMessage", data.message || "Saved.", data.success ? "success" : "error");
});

async function loadUsers() {
  if (!currentUser || currentUser.role !== "admin") {
    usersPanel.style.display = "none";
    return;
  }

  usersPanel.style.display = "";
  userList.innerHTML = '<p class="loading-text">Loading users, please wait...</p>';

  try {
    const res = await fetch("/api/users", {
      headers: authHeaders()
    });

    const data = await readJsonSafe(res);

    if (!data.success) {
      userList.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load users. Please refresh and try again.") + "</p>";
      if (res.status === 401) logout("Your session expired. Please login again.");
      return;
    }

    userList.innerHTML = (data.users || []).map((user) => {
      const safeUser = JSON.stringify({
        username: user.username,
        name: user.name,
        role: user.role,
        active: user.active ? 1 : 0
      }).replaceAll("'", "&#039;");

      return `
        <div class="user-item">
          <h4>${esc(user.name)} (${esc(user.username)})</h4>
          <div class="post-meta">${esc(user.role)} • ${user.active ? "active" : "inactive"}</div>
          <div class="post-actions">
            <button class="small-btn edit-btn" onclick='editUser(${safeUser})'>Edit</button>
            <button class="small-btn clear-btn" onclick="toggleUser('${esc(user.username)}', ${user.active ? 0 : 1}, '${esc(user.role)}', '${esc(user.name)}')">
              ${user.active ? "Deactivate" : "Activate"}
            </button>
            <button class="small-btn restore-btn" onclick="resetPw('${esc(user.username)}')">Reset PW</button>
            <button class="small-btn permanent-btn" onclick="permanentDeleteUser('${esc(user.username)}')">Permanent Delete</button>
          </div>
        </div>
          ${postRestrictionNote(post)}
      `;
    }).join("") || '<p class="loading-text">No users found.</p>';
  } catch (error) {
    userList.innerHTML = '<p class="loading-text">Unable to load users. Please check your internet connection and refresh.</p>';
  }
}

function resetUserForm() {
  if (!byId("userForm")) return;

  userForm.reset();
  user_mode.value = "add";
  user_original_username.value = "";
  user_username.disabled = false;
  user_password.placeholder = "Required only when adding a new user or resetting password";
  if (byId("saveUserBtn")) saveUserBtn.textContent = "Add User";
  if (byId("cancelEditUserBtn")) cancelEditUserBtn.classList.add("hidden");
  setMsg("userMessage", "", "");
}

function editUser(user) {
  user_mode.value = "edit";
  user_original_username.value = user.username || "";
  user_username.value = user.username || "";
  user_username.disabled = true;
  user_name.value = user.name || "";
  user_role.value = user.role || "teacher";
  user_active.value = String(user.active ? 1 : 0);
  user_password.value = "";
  user_password.placeholder = "Use Reset PW button to change password";
  saveUserBtn.textContent = "Save User Changes";
  cancelEditUserBtn.classList.remove("hidden");
  setMsg("userMessage", "Editing user: " + (user.username || ""), "");
  window.scrollTo({ top: usersPanel.offsetTop - 20, behavior: "smooth" });
}

if (byId("cancelEditUserBtn")) {
  cancelEditUserBtn.addEventListener("click", resetUserForm);
}

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isEdit = user_mode.value === "edit";

  if (isEdit) {
    const body = {
      action: "update",
      username: user_original_username.value,
      name: user_name.value,
      role: user_role.value,
      active: Number(user_active.value || 0)
    };

    setMsg("userMessage", "Saving user changes...", "");

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(body)
      });

      const data = await readJsonSafe(res);
      setMsg("userMessage", data.message || "Done.", data.success ? "success" : "error");

      if (data.success) {
        resetUserForm();
        loadUsers();
      }
    } catch (error) {
      setMsg("userMessage", "Unable to save user changes. Please check your connection and try again.", "error");
    }

    return;
  }

  const body = {
    username: user_username.value,
    name: user_name.value,
    role: user_role.value,
    password: user_password.value,
    active: Number(user_active.value || 1)
  };

  setMsg("userMessage", "Adding user...", "");

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(body)
    });

    const data = await readJsonSafe(res);

    setMsg("userMessage", data.message || "Done.", data.success ? "success" : "error");

    if (data.success) {
      resetUserForm();
      loadUsers();
    }
  } catch (error) {
    setMsg("userMessage", "Unable to add user. Please check your connection and try again.", "error");
  }
});

async function toggleUser(username, active, role, name) {
  const res = await fetch("/api/users", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({
      action: "update",
      username,
      active,
      role,
      name
    })
  });

  const data = await readJsonSafe(res);
  alert(data.message || "Done.");
  loadUsers();
}

async function resetPw(username) {
  const password = prompt("New password for " + username + "? Minimum 6 characters.");
  if (!password) return;

  const res = await fetch("/api/users", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({
      action: "resetPassword",
      username,
      password
    })
  });

  const data = await readJsonSafe(res);
  alert(data.message || "Done.");
}

async function permanentDeleteUser(username) {
  if (!confirm("Permanently delete user '" + username + "'? This cannot be undone. The username can be reused after deletion.")) return;

  const res = await fetch("/api/users", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({ username })
  });

  const data = await readJsonSafe(res);

  if (!data.success) {
    alert(data.message || "Delete failed.");
    return;
  }

  alert(data.message || "User permanently deleted.");
  resetUserForm();
  loadUsers();
}

function loadAll() {
  loadPosts();

  if (isAdminRole()) {
    loadSettings();
    loadUsers();
    loadFormsAdmin();
    loadGalleryAdmin();
  } else {
    hideAdminOnlyPanelsForTeacher();
  }
}

/* =========================================================
   School Forms Manager - Excuse Letter only
   ========================================================= */
const SCHOOL_FORM_MAX_BYTES = 5 * 1024 * 1024;
let schoolFormsCache = [];
let schoolFormsDeletedCache = [];

function formStatusBadge(status) {
  const value = String(status || "visible").toLowerCase();
  return value === "hidden" ? `<span class="status-badge hidden-badge">Hidden</span>` : `<span class="status-badge visible-badge">Visible</span>`;
}
function schoolFormItem(item) {
  const fileLink = item.file_url ? `<a class="small-btn clear-btn" href="${esc(item.file_url)}" target="_blank" rel="noopener">Open PDF</a>` : "";
  return `<div class="post-item"><h4>${esc(item.title)}</h4>${formStatusBadge(item.status)}<div class="post-meta">Excuse Letter • ${esc(item.filename || "")}</div><p>${esc(shortText(item.description || "No description.", 160))}</p><div class="post-actions">${fileLink}<button class="small-btn edit-btn" onclick='editSchoolForm(${JSON.stringify(item).replaceAll("'", "&#039;")})'>Edit</button>${item.status === "hidden" ? `<button class="small-btn restore-btn" onclick="schoolFormAction('${esc(item.id)}','show')">Show</button>` : `<button class="small-btn clear-btn" onclick="schoolFormAction('${esc(item.id)}','hide')">Hide</button>`}<button class="small-btn delete-btn" onclick="schoolFormAction('${esc(item.id)}','delete')">Move to Recycle Bin</button></div></div>`;
}
function schoolFormRecycleItem(item) {
  return `<div class="post-item"><h4>${esc(item.title)}</h4><div class="post-meta">Excuse Letter • Deleted</div><p>${esc(shortText(item.description || "No description.", 160))}</p><div class="post-actions"><button class="small-btn restore-btn" onclick="schoolFormAction('${esc(item.id)}','restore')">Restore</button><button class="small-btn permanent-btn" onclick="permanentDeleteSchoolForm('${esc(item.id)}')">Permanent Delete</button></div></div>`;
}
function renderSchoolForms() {
  const list = byId("schoolFormsList"), recycleList = byId("schoolFormsRecycleList");
  if (!list || !recycleList) return;
  list.innerHTML = schoolFormsCache.length ? schoolFormsCache.map(schoolFormItem).join("") : '<p class="loading-text">No Excuse Letter forms yet.</p>';
  recycleList.innerHTML = schoolFormsDeletedCache.length ? schoolFormsDeletedCache.map(schoolFormRecycleItem).join("") : '<p class="loading-text">Forms Recycle Bin is empty.</p>';
}
async function loadFormsAdmin() {
  
  if (!adminOnlyActionGuard(false)) return;
const list = byId("schoolFormsList"), recycleList = byId("schoolFormsRecycleList");
  if (!list || !recycleList) return;
  list.innerHTML = '<p class="loading-text">Loading forms, please wait...</p>';
  recycleList.innerHTML = '<p class="loading-text">Loading forms recycle bin...</p>';

  try {
    const res = await fetch("/api/forms", { headers: authHeaders() });
    const data = await readJsonSafe(res);

    if (!data.success) {
      list.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load forms. Please refresh and try again.") + '</p>';
      recycleList.innerHTML = '<p class="loading-text">Unable to load forms recycle bin.</p>';
      if (res.status === 401) logout("Your session expired. Please login again.");
      return;
    }

    const forms = data.forms || [];
    schoolFormsCache = forms.filter((item) => Number(item.deleted || 0) !== 1);
    schoolFormsDeletedCache = forms.filter((item) => Number(item.deleted || 0) === 1);
    renderSchoolForms();
  } catch (error) {
    list.innerHTML = '<p class="loading-text">Unable to load forms. Please check your internet connection and refresh.</p>';
    recycleList.innerHTML = '<p class="loading-text">Unable to load forms recycle bin.</p>';
  }
}
function clearSchoolForm() {
  const form = byId("formUploadForm"); if (!form) return;
  form.reset(); schoolFormId.value = ""; existingSchoolFormFile.textContent = ""; saveSchoolFormBtn.textContent = "Upload Form"; schoolFormMessage.textContent = ""; schoolFormMessage.className = "form-message";
}
function editSchoolForm(item) {
  
  if (!adminOnlyActionGuard(true)) return;
schoolFormId.value = item.id || ""; schoolFormTitle.value = item.title || ""; schoolFormCategory.value = "Excuse Letter"; schoolFormDescription.value = item.description || ""; schoolFormStatus.value = item.status || "visible";
  existingSchoolFormFile.textContent = item.filename ? "Current PDF: " + item.filename + ". Upload a new PDF only if you want to replace it." : "";
  saveSchoolFormBtn.textContent = "Update Form"; window.scrollTo({ top: document.getElementById("formsManagerPanel").offsetTop - 20, behavior: "smooth" });
}
async function saveSchoolForm(event) {
  event.preventDefault();
  const file = schoolFormFile.files && schoolFormFile.files[0], editing = Boolean(schoolFormId.value);
  if (!editing && !file) { setMsg("schoolFormMessage", "Please choose a PDF file.", "error"); return; }
  if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setMsg("schoolFormMessage", "Only PDF files are allowed.", "error"); return; }
  if (file && file.size > SCHOOL_FORM_MAX_BYTES) { setMsg("schoolFormMessage", `PDF is too large (${formatKb(file.size)}). Maximum is 5 MB.`, "error"); return; }
  setMsg("schoolFormMessage", "Saving form...", "");
  const fd = new FormData(); fd.append("id", schoolFormId.value); fd.append("title", schoolFormTitle.value); fd.append("category", "Excuse Letter"); fd.append("description", schoolFormDescription.value); fd.append("status", schoolFormStatus.value); if (file) fd.append("file", file);
  const res = await fetch("/api/forms", { method: "POST", headers: authHeaders(), body: fd });
  const data = await res.json();
  if (!data.success) { setMsg("schoolFormMessage", data.message || "Save failed.", "error"); return; }
  clearSchoolForm(); setMsg("schoolFormMessage", data.message || "Saved.", "success"); loadFormsAdmin();
}
async function schoolFormAction(id, action) {
  
  if (!adminOnlyActionGuard(true)) return;
const messages = { hide: "Hide this form from parents?", show: "Show this form to parents?", delete: "Move this form to Recycle Bin?", restore: "Restore this form?" };
  if (!confirm(messages[action] || "Continue?")) return;
  const res = await fetch("/api/forms", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ id, action }) });
  const data = await res.json(); if (!data.success) { alert(data.message || "Action failed."); return; }
  alert(data.message || "Done."); loadFormsAdmin();
}
async function permanentDeleteSchoolForm(id) {
  
  if (!adminOnlyActionGuard(true)) return;
if (!confirm("Permanently delete this form? This will also delete the PDF file from R2.")) return;
  const res = await fetch("/api/forms", { method: "DELETE", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ id }) });
  const data = await res.json(); if (!data.success) { alert(data.message || "Delete failed."); return; }
  alert(data.message || "Form permanently deleted."); loadFormsAdmin();
}
if (byId("formUploadForm")) formUploadForm.addEventListener("submit", saveSchoolForm);
if (byId("clearSchoolFormBtn")) clearSchoolFormBtn.addEventListener("click", clearSchoolForm);

/* =========================================================
   Gallery Manager
   ========================================================= */
const GALLERY_IMAGE_MAX_BYTES = 1000 * 1024;
let galleryCache = [];
let galleryDeletedCache = [];

function getGalleryImage(item) { return item.image_url || item.image || ""; }
function galleryPhotoThumb(item) {
  const imageUrl = getGalleryImage(item);
  return imageUrl ? `<img class="dashboard-post-thumb" src="${esc(imageUrl)}" alt="${esc(item.title)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;dashboard-post-thumb empty-thumb&quot;>Image unavailable</div>'">` : `<div class="dashboard-post-thumb empty-thumb">No Image</div>`;
}
function galleryItem(item) {
  return `<div class="post-item"><div class="dashboard-post-row">${galleryPhotoThumb(item)}<div class="dashboard-post-body"><h4>${esc(item.title)}</h4>${formStatusBadge(item.status)}<div class="post-meta">${esc(item.category)} • ${esc(item.filename || "")}</div><p>${esc(shortText(item.caption || "No caption.", 160))}</p><div class="post-actions"><button class="small-btn edit-btn" onclick='editGalleryPhoto(${JSON.stringify(item).replaceAll("'", "&#039;")})'>Edit</button>${item.status === "hidden" ? `<button class="small-btn restore-btn" onclick="galleryAction('${esc(item.id)}','show')">Show</button>` : `<button class="small-btn clear-btn" onclick="galleryAction('${esc(item.id)}','hide')">Hide</button>`}<button class="small-btn delete-btn" onclick="galleryAction('${esc(item.id)}','delete')">Move to Recycle Bin</button></div></div></div></div>`;
}
function galleryRecycleItem(item) {
  return `<div class="post-item"><div class="dashboard-post-row">${galleryPhotoThumb(item)}<div class="dashboard-post-body"><h4>${esc(item.title)}</h4><div class="post-meta">${esc(item.category)} • Deleted</div><p>${esc(shortText(item.caption || "No caption.", 160))}</p><div class="post-actions"><button class="small-btn restore-btn" onclick="galleryAction('${esc(item.id)}','restore')">Restore</button><button class="small-btn permanent-btn" onclick="permanentDeleteGalleryPhoto('${esc(item.id)}')">Permanent Delete</button></div></div></div></div>`;
}
function renderGalleryAdmin() {
  const list = byId("galleryPhotosList"), recycleList = byId("galleryPhotosRecycleList");
  if (!list || !recycleList) return;
  list.innerHTML = galleryCache.length ? galleryCache.map(galleryItem).join("") : '<p class="loading-text">No gallery photos yet.</p>';
  recycleList.innerHTML = galleryDeletedCache.length ? galleryDeletedCache.map(galleryRecycleItem).join("") : '<p class="loading-text">Gallery Recycle Bin is empty.</p>';
}
async function loadGalleryAdmin() {
  
  if (!adminOnlyActionGuard(false)) return;
const list = byId("galleryPhotosList"), recycleList = byId("galleryPhotosRecycleList");
  if (!list || !recycleList) return;
  list.innerHTML = '<p class="loading-text">Loading gallery, please wait...</p>';
  recycleList.innerHTML = '<p class="loading-text">Loading gallery recycle bin...</p>';

  try {
    const res = await fetch("/api/gallery", { headers: authHeaders() });
    const data = await readJsonSafe(res);

    if (!data.success) {
      list.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load gallery. Please refresh and try again.") + '</p>';
      recycleList.innerHTML = '<p class="loading-text">Unable to load gallery recycle bin.</p>';
      if (res.status === 401) logout("Your session expired. Please login again.");
      return;
    }

    const photos = data.photos || [];
    galleryCache = photos.filter((item) => Number(item.deleted || 0) !== 1);
    galleryDeletedCache = photos.filter((item) => Number(item.deleted || 0) === 1);
    renderGalleryAdmin();
  } catch (error) {
    list.innerHTML = '<p class="loading-text">Unable to load gallery. Please check your internet connection and refresh.</p>';
    recycleList.innerHTML = '<p class="loading-text">Unable to load gallery recycle bin.</p>';
  }
}
function updateCurrentGalleryImageBox(imageUrl) {
  const box = byId("currentGalleryImageBox"), preview = byId("currentGalleryImagePreview");
  if (!box || !preview) return;
  if (imageUrl) { preview.src = imageUrl; box.classList.remove("hidden"); } else { preview.src = ""; box.classList.add("hidden"); }
}
function clearGalleryPhoto() {
  const form = byId("galleryUploadForm"); if (!form) return;
  form.reset(); galleryPhotoId.value = ""; saveGalleryPhotoBtn.textContent = "Upload Photo"; galleryPhotoMessage.textContent = ""; galleryPhotoMessage.className = "form-message"; updateCurrentGalleryImageBox("");
}
function editGalleryPhoto(item) {
  
  if (!adminOnlyActionGuard(true)) return;
galleryPhotoId.value = item.id || ""; galleryPhotoTitle.value = item.title || ""; galleryPhotoCategory.value = item.category || "School Events"; galleryPhotoCaption.value = item.caption || ""; galleryPhotoStatus.value = item.status || "visible";
  updateCurrentGalleryImageBox(getGalleryImage(item)); saveGalleryPhotoBtn.textContent = "Update Photo"; window.scrollTo({ top: document.getElementById("galleryManagerPanel").offsetTop - 20, behavior: "smooth" });
}
async function saveGalleryPhoto(event) {
  event.preventDefault();
  const file = galleryPhotoFile.files && galleryPhotoFile.files[0], editing = Boolean(galleryPhotoId.value);
  if (!editing && !file) { setMsg("galleryPhotoMessage", "Please choose a gallery image.", "error"); return; }
  if (file && file.size > GALLERY_IMAGE_MAX_BYTES) { setMsg("galleryPhotoMessage", `Image is too large (${formatKb(file.size)}). Maximum is 1000 KB.`, "error"); return; }
  setMsg("galleryPhotoMessage", "Saving photo...", "");
  const fd = new FormData(); fd.append("id", galleryPhotoId.value); fd.append("title", galleryPhotoTitle.value); fd.append("category", galleryPhotoCategory.value); fd.append("caption", galleryPhotoCaption.value); fd.append("status", galleryPhotoStatus.value); if (file) fd.append("image", file);
  const res = await fetch("/api/gallery", { method: "POST", headers: authHeaders(), body: fd });
  const data = await res.json(); if (!data.success) { setMsg("galleryPhotoMessage", data.message || "Save failed.", "error"); return; }
  clearGalleryPhoto(); setMsg("galleryPhotoMessage", data.message || "Saved.", "success"); loadGalleryAdmin();
}
async function galleryAction(id, action) {
  
  if (!adminOnlyActionGuard(true)) return;
const messages = { hide: "Hide this photo from the public gallery?", show: "Show this photo in the public gallery?", delete: "Move this photo to Gallery Recycle Bin?", restore: "Restore this gallery photo?" };
  if (!confirm(messages[action] || "Continue?")) return;
  const res = await fetch("/api/gallery", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ id, action }) });
  const data = await res.json(); if (!data.success) { alert(data.message || "Action failed."); return; }
  alert(data.message || "Done."); loadGalleryAdmin();
}
async function permanentDeleteGalleryPhoto(id) {
  
  if (!adminOnlyActionGuard(true)) return;
if (!confirm("Permanently delete this gallery photo? This will also delete the image from R2.")) return;
  const res = await fetch("/api/gallery", { method: "DELETE", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ id }) });
  const data = await res.json(); if (!data.success) { alert(data.message || "Delete failed."); return; }
  alert(data.message || "Gallery photo permanently deleted."); loadGalleryAdmin();
}
if (byId("galleryUploadForm")) galleryUploadForm.addEventListener("submit", saveGalleryPhoto);
if (byId("clearGalleryPhotoBtn")) clearGalleryPhotoBtn.addEventListener("click", clearGalleryPhoto);


start();



document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;

  const label = (target.textContent || "").trim().toLowerCase();
  const attr = (
    (target.getAttribute("onclick") || "") + " " +
    (target.id || "") + " " +
    (target.className || "")
  ).toLowerCase();

  const isAdminManagerAction =
    label.includes("refresh forms") ||
    label.includes("refresh gallery") ||
    attr.includes("loadformsadmin") ||
    attr.includes("loadgalleryadmin") ||
    attr.includes("schoolform") ||
    attr.includes("gallery");

  if (!isAdminRole() && isAdminManagerAction) {
    event.preventDefault();
    event.stopPropagation();
    hideAdminOnlyPanelsForTeacher();
    return false;
  }
}, true);



document.addEventListener("DOMContentLoaded", hideAdminOnlyPanelsForTeacher);

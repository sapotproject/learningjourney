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

function authHeaders() {
  return { Authorization: "Bearer " + token };
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
    hide(loginPanel);
    show(dashboardPanel);
    show(logoutBtn);

    if (byId("postDate")) byId("postDate").valueAsDate = new Date();

    loadAll();
  } else {
    token = "";
    currentUser = null;
    sessionStorage.removeItem("lj_token");
    sessionStorage.removeItem("lj_user");
    show(loginPanel);
    hide(dashboardPanel);
    hide(logoutBtn);
  }
}

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  setMsg("loginMessage", "Logging in...", "");

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: loginUsername.value,
      password: loginPassword.value
    })
  });

  const data = await res.json();

  if (!data.success) {
    setMsg("loginMessage", data.message || "Login failed.", "error");
    return;
  }

  token = data.token;
  currentUser = data.user;

  sessionStorage.setItem("lj_token", token);
  sessionStorage.setItem("lj_user", JSON.stringify(currentUser));

  start();
});

logoutBtn.onclick = () => {
  sessionStorage.clear();
  localStorage.removeItem("lj_token");
  localStorage.removeItem("lj_user");
  token = "";
  currentUser = null;
  start();
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
  allPosts.innerHTML = '<p class="loading-text">Loading...</p>';
  recyclePosts.innerHTML = '<p class="loading-text">Loading...</p>';

  const res = await fetch("/api/posts", {
    headers: authHeaders()
  });

  const data = await res.json();

  if (!data.success) {
    allPosts.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load.") + "</p>";
    recyclePosts.innerHTML = '<p class="loading-text">Unable to load recycle bin.</p>';

    if (res.status === 401 || res.status === 403) logoutBtn.click();

    return;
  }

  publishedPostCache = data.posts.filter((post) => !isDeleted(post));
  deletedPostCache = data.posts.filter(isDeleted);

  renderPostLists();
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
  const messages = {
    delete: "Move to Recycle Bin?",
    restore: "Restore post?",
    pin: "Show this post at the top of the homepage? This will replace the current featured post.",
    unpin: "Remove this post from the homepage top feature?"
  };

  if (!confirm(messages[action] || "Continue?")) return;

  const res = await fetch("/api/posts", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({ id, action })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Action failed.");
    return;
  }

  alert(data.message || "Done.");
  loadPosts();
}

async function permanentDelete(id) {
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

  const res = await fetch("/api/users", {
    headers: authHeaders()
  });

  const data = await res.json();

  if (!data.success) {
    userList.innerHTML = '<p class="loading-text">' + esc(data.message || "Unable to load users.") + "</p>";
    return;
  }

  userList.innerHTML = (data.users || []).map((user) => `
    <div class="user-item">
      <h4>${esc(user.name)} (${esc(user.username)})</h4>
      <div class="post-meta">${esc(user.role)} • ${user.active ? "active" : "inactive"}</div>
      <div class="post-actions">
        <button class="small-btn edit-btn" onclick="toggleUser('${esc(user.username)}', ${user.active ? 0 : 1}, '${esc(user.role)}', '${esc(user.name)}')">
          ${user.active ? "Deactivate" : "Activate"}
        </button>
        <button class="small-btn restore-btn" onclick="resetPw('${esc(user.username)}')">Reset PW</button>
      </div>
    </div>
  `).join("");
}

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const body = {
    username: user_username.value,
    name: user_name.value,
    role: user_role.value,
    password: user_password.value,
    active: 1
  };

  const res = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  setMsg("userMessage", data.message || "Done.", data.success ? "success" : "error");

  if (data.success) {
    userForm.reset();
    loadUsers();
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

  const data = await res.json();
  alert(data.message || "Done.");
  loadUsers();
}

async function resetPw(username) {
  const password = prompt("New password for " + username + "?");
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

  const data = await res.json();
  alert(data.message || "Done.");
}

function loadAll() {
  loadPosts();
  loadSettings();
  loadUsers();
}

start();

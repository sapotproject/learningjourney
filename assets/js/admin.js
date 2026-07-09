// Clear old persistent login from previous versions.
// This prevents admin.html from auto-opening the dashboard because of an old localStorage token.
localStorage.removeItem("lj_token");
localStorage.removeItem("lj_user");

let token = sessionStorage.getItem("lj_token") || "";
let currentUser = JSON.parse(sessionStorage.getItem("lj_user") || "null");

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const logoutBtn = document.getElementById("logoutBtn");

function authHeaders() {
  return { Authorization: "Bearer " + token };
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
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setMsg(id, text, className) {
  const el = document.getElementById(id);
  el.textContent = text || "";
  el.className = "form-message";
  if (className) el.classList.add(className);
}

function setMiniMsg(id, text, className) {
  const el = document.getElementById(id);
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

function start() {
  if (token && currentUser) {
    hide(loginPanel);
    show(dashboardPanel);
    show(logoutBtn);
    document.getElementById("postDate").valueAsDate = new Date();
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

document.getElementById("loginForm").addEventListener("submit", async (event) => {
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

function preview() {
  const type = postType.value;
  const date = postDate.value;
  const title = postTitle.value;
  const message = postMessageText.value;
  const imageFile = postImage.files && postImage.files[0];

  if (!type && !date && !title && !message && !imageFile && !existingImageUrl.value) {
    postPreview.innerHTML = '<p class="preview-empty">Preview will appear here while you type.</p>';
    return;
  }

  let imageHtml = "";

  if (imageFile) {
    const tempUrl = URL.createObjectURL(imageFile);
    imageHtml = `<img class="preview-image" src="${tempUrl}" alt="Preview image">`;
  } else if (existingImageUrl.value) {
    imageHtml = `<img class="preview-image" src="${esc(existingImageUrl.value)}" alt="Current image">`;
  }

  postPreview.innerHTML = `
    ${imageHtml}
    ${type ? `<span class="preview-tag">${esc(type)}</span>` : ""}
    ${date ? `<p class="preview-date">${esc(date)}</p>` : ""}
    <h2 class="preview-title">${esc(title || "Untitled Post")}</h2>
    <p class="preview-message">${esc(message || "No message yet.")}</p>
  `;
}

["postType", "postDate", "postTitle", "postMessageText", "postImage"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", preview);
  el.addEventListener("change", preview);
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMsg("postMessage", "Saving post...", "");

  const fd = new FormData();
  fd.append("id", postId.value);
  fd.append("type", postType.value);
  fd.append("title", postTitle.value);
  fd.append("message", postMessageText.value);
  fd.append("date", postDate.value);
  fd.append("existing_image_url", existingImageUrl.value);
  fd.append("existing_image_key", existingImageKey.value);

  if (postImage.files[0]) {
    fd.append("image", postImage.files[0]);
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
  postFormTitle.textContent = "Create New Post";
  savePostBtn.textContent = "Publish Post";
  postDate.valueAsDate = new Date();
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
    if (res.status === 401 || res.status === 403) logoutBtn.click();
    return;
  }

  const publishedPosts = data.posts.filter((post) => !isDeleted(post));
  const deletedPosts = data.posts.filter(isDeleted);

  allPosts.innerHTML = publishedPosts.length
    ? publishedPosts.map(postItem).join("")
    : '<p class="loading-text">No posts yet.</p>';

  recyclePosts.innerHTML = deletedPosts.length
    ? deletedPosts.map(recycleItem).join("")
    : '<p class="loading-text">Recycle Bin is empty.</p>';
}

function postItem(post) {
  return `
    <div class="post-item">
      <div class="dashboard-post-row">
        ${imageThumb(post)}
        <div class="dashboard-post-body">
          <h4>${esc(post.title)}</h4>
          <div class="post-meta">
            ${esc(post.type)} • ${esc(post.date)} • ${esc(post.author || "")}
          </div>
          <p>${esc(shortText(post.message, 170))}</p>
          <div class="post-actions">
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

  postFormTitle.textContent = "Edit Post";
  savePostBtn.textContent = "Update Post";

  window.scrollTo({ top: 0, behavior: "smooth" });
  preview();
}

async function postAction(id, action) {
  if (!confirm(action === "delete" ? "Move to Recycle Bin?" : "Restore post?")) return;

  const res = await fetch("/api/posts", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({ id, action })
  });

  const data = await res.json();
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

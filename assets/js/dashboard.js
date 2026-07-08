/* =========================================================
   Learning Journey Teacher Dashboard
   Stable Publish v1
   Cloudflare Worker R2 Upload + Apps Script Save
   ========================================================= */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFZrJEXsqktYS-Eamf4X1B7b-MJk-86aw-sYLhiCBv3636XDATjwQqf2YI6Q2mFrnzYw/exec";
const UPLOAD_WORKER_URL = "https://schoolsph-upload.sapotproject.workers.dev";

/*
  IMPORTANT:
  Replace this with the exact same UPLOAD_TOKEN value from Cloudflare Worker Variables.
*/
const UPLOAD_TOKEN = "8Qm!9Xv#LJ2026@SchoolsPH$Upload^7PkR2";

const token = sessionStorage.getItem("lj_token");
const loggedIn = sessionStorage.getItem("lj_logged_in");

if (loggedIn !== "true" || !token) {
  window.location.href = "admin.html";
}

const currentUser =
  sessionStorage.getItem("lj_name") ||
  sessionStorage.getItem("lj_username") ||
  "Teacher";

const postForm = document.getElementById("postForm");
const publishBtn = document.getElementById("publishBtn");
const clearBtn = document.getElementById("clearBtn");
const logoutBtn = document.getElementById("logoutBtn");
const postMessage = document.getElementById("postMessage");
const postPreview = document.getElementById("postPreview");
const imageFileInput = document.getElementById("imageFile");
const imageHiddenInput = document.getElementById("image");
const uploadPreview = document.getElementById("uploadPreview");
const uploadStatus = document.getElementById("uploadStatus");

let selectedImageFile = null;
let selectedImagePreviewUrl = "";

function setPostMessage(message, type) {
  postMessage.textContent = message || "";
  postMessage.className = "form-message";
  if (type) postMessage.classList.add(type);
}

function setUploadStatus(message) {
  if (uploadStatus) uploadStatus.textContent = message || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchWithTimeout(url, options, timeoutMs, stepName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(stepName + " timed out. Please check deployment/settings.");
    }

    throw error;
  }
}

async function parseJsonResponse(response, sourceName) {
  const text = await response.text();

  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    console.error(sourceName + " returned non-JSON:", text);
    throw new Error(sourceName + " returned non-JSON response.");
  }

  return result;
}

async function validateSessionOnLoad() {
  try {
    const response = await fetchWithTimeout(
      `${APPS_SCRIPT_URL}?action=validateSession&token=${encodeURIComponent(token)}&cacheBust=${Date.now()}`,
      { method: "GET" },
      15000,
      "Session validation"
    );

    const result = await parseJsonResponse(response, "Apps Script");

    if (!result.success) {
      sessionStorage.clear();
      window.location.href = "admin.html";
    }
  } catch (error) {
    console.error(error);
    sessionStorage.clear();
    window.location.href = "admin.html";
  }
}

function getFormValues() {
  return {
    type: document.getElementById("type").value.trim(),
    date: document.getElementById("date").value,
    title: document.getElementById("title").value.trim(),
    message: document.getElementById("message").value.trim(),
    image: imageHiddenInput.value.trim(),
    author: currentUser
  };
}

function formatDateForPreview(value) {
  if (!value) return "";

  const date = new Date(value + "T00:00:00");
  if (isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderPreview() {
  const post = getFormValues();
  const imageUrl = selectedImagePreviewUrl || post.image;

  if (!post.type && !post.date && !post.title && !post.message && !imageUrl) {
    postPreview.innerHTML = '<p class="preview-empty">Preview will appear here while you type.</p>';
    return;
  }

  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title || "Post image")}" class="preview-image" onerror="this.style.display='none'">`
    : "";

  postPreview.innerHTML = `
    ${imageHtml}
    ${post.type ? `<span class="preview-tag">${escapeHtml(post.type)}</span>` : ""}
    ${post.date ? `<p class="preview-date">${escapeHtml(formatDateForPreview(post.date))}</p>` : ""}
    <h2 class="preview-title">${escapeHtml(post.title || "Untitled Post")}</h2>
    <p class="preview-message">${escapeHtml(post.message || "No message yet.")}</p>
  `;
}

function resetForm() {
  postForm.reset();
  document.getElementById("date").valueAsDate = new Date();
  imageHiddenInput.value = "";
  selectedImageFile = null;

  if (selectedImagePreviewUrl) {
    URL.revokeObjectURL(selectedImagePreviewUrl);
  }

  selectedImagePreviewUrl = "";
  uploadPreview.style.display = "none";
  uploadPreview.src = "";
  setUploadStatus("Optional. Choose an image from your device. It will upload to Cloudflare R2 when you publish.");
  renderPreview();
}

imageFileInput.addEventListener("change", function() {
  const file = imageFileInput.files && imageFileInput.files[0];

  imageHiddenInput.value = "";
  selectedImageFile = null;

  if (selectedImagePreviewUrl) {
    URL.revokeObjectURL(selectedImagePreviewUrl);
    selectedImagePreviewUrl = "";
  }

  if (!file) {
    uploadPreview.style.display = "none";
    uploadPreview.src = "";
    setUploadStatus("Optional. Choose an image from your device. It will upload to Cloudflare R2 when you publish.");
    renderPreview();
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    imageFileInput.value = "";
    setUploadStatus("Please choose a JPG, PNG, WebP, or GIF image.");
    renderPreview();
    return;
  }

  const maxBytes = 3 * 1024 * 1024;

  if (file.size > maxBytes) {
    imageFileInput.value = "";
    setUploadStatus("Image is too large. Please choose an image below 3 MB.");
    renderPreview();
    return;
  }

  selectedImageFile = file;
  selectedImagePreviewUrl = URL.createObjectURL(file);

  uploadPreview.src = selectedImagePreviewUrl;
  uploadPreview.style.display = "block";
  setUploadStatus("Image selected: " + file.name);

  renderPreview();
});

async function uploadImageIfNeeded() {
  if (!selectedImageFile) {
    return imageHiddenInput.value.trim();
  }

  if (UPLOAD_TOKEN === "PASTE_YOUR_EXACT_UPLOAD_TOKEN_HERE") {
    throw new Error("UPLOAD_TOKEN is not configured in dashboard.js.");
  }

  setUploadStatus("Step 1 of 2: Uploading image to Cloudflare R2...");
  setPostMessage("Uploading image...", "");

  const formData = new FormData();
  formData.append("file", selectedImageFile);

  const response = await fetchWithTimeout(
    UPLOAD_WORKER_URL,
    {
      method: "POST",
      headers: { "X-SchoolsPH-Upload-Token": UPLOAD_TOKEN },
      body: formData
    },
    30000,
    "Image upload"
  );

  const result = await parseJsonResponse(response, "Upload Worker");

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Image upload failed.");
  }

  imageHiddenInput.value = result.url || "";
  setUploadStatus("Image uploaded successfully.");
  return result.url || "";
}

async function savePostToSheet(imageUrl) {
  const post = getFormValues();

  setPostMessage("Step 2 of 2: Saving post to Google Sheet...", "");

  const formData = new URLSearchParams();
  formData.append("action", "createPost");
  formData.append("token", token);
  formData.append("type", post.type);
  formData.append("date", post.date);
  formData.append("title", post.title);
  formData.append("message", post.message);
  formData.append("image", imageUrl || post.image || "");
  formData.append("author", post.author);

  const response = await fetchWithTimeout(
    APPS_SCRIPT_URL,
    { method: "POST", body: formData },
    30000,
    "Saving post"
  );

  const result = await parseJsonResponse(response, "Content Apps Script");

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to save post.");
  }

  return result;
}

clearBtn.addEventListener("click", function() {
  resetForm();
  setPostMessage("", "");
});

logoutBtn.addEventListener("click", async function() {
  try {
    const formData = new URLSearchParams();
    formData.append("action", "logout");
    formData.append("token", token);

    await fetchWithTimeout(
      APPS_SCRIPT_URL,
      { method: "POST", body: formData },
      10000,
      "Logout"
    );
  } catch (error) {
    console.error(error);
  }

  sessionStorage.clear();
  window.location.href = "admin.html";
});

postForm.addEventListener("input", renderPreview);

postForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const postBeforeUpload = getFormValues();

  if (!postBeforeUpload.type || !postBeforeUpload.date || !postBeforeUpload.title || !postBeforeUpload.message) {
    setPostMessage("Please complete all required fields before publishing.", "error");
    renderPreview();
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publishing...";
  setPostMessage("Starting publish...", "");

  try {
    const uploadedImageUrl = await uploadImageIfNeeded();
    const result = await savePostToSheet(uploadedImageUrl);

    setPostMessage("Post published successfully.", "success");
    setUploadStatus("Done. Saved to " + (result.sheet_used || "Google Sheet") + ".");
    resetForm();
    setPostMessage("Post published successfully.", "success");

  } catch (error) {
    console.error("Publish failed:", error);
    setPostMessage(error.message || "Unable to publish. Please check your connection and try again.", "error");
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "Publish Post";
  }
});

document.getElementById("date").valueAsDate = new Date();
renderPreview();
validateSessionOnLoad();

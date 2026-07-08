// =====================================
// SchoolsPH - CATEGORY PAGE ENGINE
// =====================================

const API_URL = "https://script.google.com/macros/s/AKfycbyOHLGgAxYbhITD4PYOEaFKVWZMntDHMCQ5raJYiDgwo2CQeFGTCXp-BUxPCF4Mu9k/exec";

document.addEventListener("DOMContentLoaded", function () {
    loadCategoryPage();
});

// ===============================
// LOAD POSTS
// ===============================
function loadCategoryPage() {

    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getPosts" })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            renderPosts(data.data);
        }
    })
    .catch(err => console.error(err));
}

// ===============================
// DETECT PAGE TYPE
// ===============================
function getPageType() {
    const path = window.location.pathname;

    if (path.includes("news")) return "News";
    if (path.includes("events")) return "Event";
    if (path.includes("reminders")) return "Reminder";
    if (path.includes("announcements")) return "School Advisory";

    return "";
}

// ===============================
// RENDER POSTS
// ===============================
function renderPosts(posts) {

    const type = getPageType();

    const filtered = posts
        .filter(p => p.type === type)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById("newsContainer");

    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = "<p>No posts available.</p>";
        return;
    }

    let html = "";

    filtered.forEach(post => {
        html += `
            <div class="post-card">
                <div class="post-header">
                    <span>${post.type}</span>
                    <span>${formatDate(post.date)}</span>
                </div>

                <h3>${post.title}</h3>
                <p>${post.message}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===============================
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}
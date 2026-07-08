// =====================================
// SchoolsPH - HOME PAGE ENGINE (FEATURED + FEED)
// NO DESIGN CHANGES - JS ONLY
// =====================================

const API_URL = "https://script.google.com/macros/s/AKfycbyOHLGgAxYbhITD4PYOEaFKVWZMntDHMCQ5raJYiDgwo2CQeFGTCXp-BUxPCF4Mu9k/exec";

document.addEventListener("DOMContentLoaded", function () {
    loadHome();
});

// ===============================
// MAIN LOAD
// ===============================
function loadHome() {
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getPosts" })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            renderFeatured(data.data);
            renderLatestFeed(data.data);
        }
    })
    .catch(err => console.error(err));
}

// ===============================
// FEATURED POST (TOP CARD)
// ===============================
function renderFeatured(posts) {

    if (!posts || posts.length === 0) return;

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const latest = posts[0];

    const card = document.querySelector(".card");
    if (!card) return;

    const tag = card.querySelector(".tag");
    const date = card.querySelector(".date");
    const title = card.querySelector("h2");
    const paragraph = card.querySelector("p");

    if (tag) tag.innerText = latest.type;
    if (date) date.innerText = formatDate(latest.date);
    if (title) title.innerText = latest.title;
    if (paragraph) paragraph.innerText = latest.message;
}

// ===============================
// LATEST FEED (ADDED BELOW EXISTING CONTENT)
// ===============================
function renderLatestFeed(posts) {

    if (!posts || posts.length === 0) return;

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // remove latest (already used in featured)
    const feed = posts.slice(1, 6);

    // create container dynamically (NO HTML CHANGE)
    let container = document.getElementById("latestFeed");

    if (!container) {
        container = document.createElement("section");
        container.id = "latestFeed";
        container.innerHTML = `
            <h3 style="margin-top:30px;">Latest Updates</h3>
            <div id="feedList"></div>
        `;

        document.querySelector(".container").appendChild(container);
    }

    const list = container.querySelector("#feedList");

    let html = "";

    feed.forEach(post => {
        html += `
            <div class="post-card" style="
                background:#fff;
                padding:15px;
                margin:10px 0;
                border-radius:12px;
                box-shadow:0 4px 10px rgba(0,0,0,0.05);
            ">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:#777;">
                    <span><b>${post.type}</b></span>
                    <span>${formatDate(post.date)}</span>
                </div>

                <h4 style="margin:8px 0 5px 0;">${post.title}</h4>

                <p style="margin:0; color:#555; font-size:14px;">
                    ${truncate(post.message, 140)}
                </p>
            </div>
        `;
    });

    list.innerHTML = html;
}

// ===============================
// HELPERS
// ===============================
function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
}

function truncate(text, limit) {
    if (!text) return "";
    return text.length > limit ? text.substring(0, limit) + "..." : text;
}
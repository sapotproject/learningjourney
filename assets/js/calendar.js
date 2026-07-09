const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const calendarEventList = document.getElementById("calendarEventList");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarStatus = document.getElementById("calendarStatus");

let allEvents = [];
let currentDate = new Date();

function byId(id) { return document.getElementById(id); }
function setText(id, value) { const el = byId(id); if (el) el.textContent = value || ""; }
function clean(value) { return String(value ?? "").trim(); }
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function category(type) {
  const value = clean(type).toLowerCase();
  if (["event", "events", "school event", "school events"].includes(value)) return "event";
  return value;
}
function parseDate(value) {
  if (!value) return null;
  const parts = String(value).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : value;
}
function setDynamicIcons(logo) {
  if (!logo) return;
  const favicon = byId("dynamicFavicon");
  const appleIcon = byId("dynamicAppleIcon");
  if (favicon) favicon.href = logo;
  if (appleIcon) appleIcon.href = logo;
}
function applySettings(settings) {
  settings = settings || {};
  const schoolName = clean(settings.school_name) || "Learning Journey Child Growth Center, Inc.";
  const tagline = clean(settings.school_tagline) || "Where Learning is a Journey and Not a Race";
  const logo = clean(settings.logo_url);
  setText("schoolName", schoolName);
  setText("schoolTagline", tagline);
  setText("footerSchoolName", schoolName);
  const logoEl = byId("schoolLogo");
  if (logoEl && logo) {
    logoEl.src = logo;
    logoEl.classList.remove("hidden");
    setDynamicIcons(logo);
  }
}
function normalizeEvent(post, index) {
  const dateValue = clean(post.date || post.created_at);
  const d = parseDate(dateValue);
  return {
    id: clean(post.id) || "event-" + index,
    title: clean(post.title),
    message: clean(post.message),
    date: dateValue,
    dateObj: d,
    dateDisplay: formatDate(dateValue)
  };
}
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function monthEvents(year, month) {
  return allEvents.filter(event => event.dateObj && event.dateObj.getFullYear() === year && event.dateObj.getMonth() === month);
}
function dayEvents(dayDate) {
  return allEvents.filter(event => sameDay(event.dateObj, dayDate));
}
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  calendarTitle.textContent = currentDate.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="calendar-day-name">${d}</div>`).join("");
  for (let i = 0; i < startDay; i++) html += `<div class="calendar-cell empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const events = dayEvents(dayDate);
    const isToday = sameDay(dayDate, new Date());
    html += `
      <button class="calendar-cell ${isToday ? "today" : ""} ${events.length ? "has-event" : ""}" onclick="showDayEvents(${year}, ${month}, ${day})">
        <span class="calendar-date-num">${day}</span>
        ${events.length ? `<span class="calendar-event-count">${events.length} event${events.length > 1 ? "s" : ""}</span>` : ""}
      </button>`;
  }
  calendarGrid.innerHTML = html;
  renderMonthEvents();
}
function renderEvents(events, emptyText) {
  if (!events.length) {
    calendarEventList.innerHTML = `<p class="loading-text">${esc(emptyText)}</p>`;
    return;
  }
  calendarEventList.innerHTML = events.map(event => `
    <article class="calendar-event-card">
      <span class="tag category-tag-large">Event</span>
      <h3>${esc(event.title)}</h3>
      <p class="calendar-event-date">${esc(event.dateDisplay)}</p>
      <p>${esc(event.message)}</p>
    </article>`).join("");
}
function showDayEvents(year, month, day) {
  renderEvents(dayEvents(new Date(year, month, day)), "No events on this date.");
}
function renderMonthEvents() {
  const events = monthEvents(currentDate.getFullYear(), currentDate.getMonth()).sort((a, b) => a.dateObj - b.dateObj);
  renderEvents(events, "No events plotted for this month.");
}
prevMonthBtn.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});
nextMonthBtn.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});
async function loadCalendar() {
  try {
    calendarStatus.textContent = "Loading calendar...";
    const res = await fetch("/api/public", { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Unable to load calendar.");
    applySettings(data.settings || {});
    allEvents = (data.posts || [])
      .filter(post => category(post.type) === "event")
      .map(normalizeEvent)
      .filter(event => event.title && event.dateObj);
    renderCalendar();
    calendarStatus.textContent = data.generated_at ? "Last updated: " + new Date(data.generated_at).toLocaleString("en-PH") : "";
  } catch (error) {
    calendarGrid.innerHTML = "";
    calendarEventList.innerHTML = `<p class="loading-text">Unable to load events.</p>`;
    calendarStatus.textContent = error.message || "Unable to load calendar.";
  }
}
loadCalendar();

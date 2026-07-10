const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const calendarEventList = document.getElementById("calendarEventList");
const upcomingEventList = document.getElementById("upcomingEventList");
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
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
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function sameMonth(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth();
}

function monthEvents(year, month) {
  return allEvents
    .filter((event) => event.dateObj && event.dateObj.getFullYear() === year && event.dateObj.getMonth() === month)
    .sort((a, b) => a.dateObj - b.dateObj);
}

function dayEvents(dayDate) {
  return allEvents.filter((event) => sameDay(event.dateObj, dayDate));
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calendarTitle.textContent = currentDate.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((d) => `<div class="calendar-day-name">${d}</div>`)
    .join("");

  for (let i = 0; i < startDay; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const events = dayEvents(dayDate);
    const isToday = sameDay(dayDate, new Date());

    html += `
      <button class="calendar-cell ${isToday ? "today" : ""} ${events.length ? "has-event" : ""}" onclick="showDayEvents(${year}, ${month}, ${day})">
        <span class="calendar-date-num">${day}</span>
        ${events.length ? `<span class="calendar-event-count">${events.length} event${events.length > 1 ? "s" : ""}</span>` : ""}
      </button>
    `;
  }

  calendarGrid.innerHTML = html;

  renderDefaultMonthEvents();
  renderUpcomingBeyondMonth();
}

function renderEvents(targetEl, events, emptyText) {
  if (!targetEl) return;

  if (!events.length) {
    targetEl.innerHTML = `<p class="loading-text">${esc(emptyText)}</p>`;
    return;
  }

  targetEl.innerHTML = events.map((event) => `
    <article class="calendar-event-card">
      <span class="tag category-tag-large">Event</span>
      <h3>${esc(event.title)}</h3>
      <p class="calendar-event-date">${esc(event.dateDisplay)}</p>
      <p>${esc(event.message)}</p>
    </article>
  `).join("");
}

function showDayEvents(year, month, day) {
  renderEvents(calendarEventList, dayEvents(new Date(year, month, day)), "No events on this date.");
}

function defaultEventsForShownMonth() {
  const events = monthEvents(currentDate.getFullYear(), currentDate.getMonth());
  if (!events.length) return [];

  const today = startOfDay(new Date());

  // If viewing the real current month:
  // 1. show today's event/s
  // 2. else nearest upcoming event
  // 3. else most recent past event
  if (sameMonth(currentDate, today)) {
    const todayEvents = events.filter((event) => sameDay(event.dateObj, today));
    if (todayEvents.length) return todayEvents;

    const upcoming = events.filter((event) => event.dateObj >= today);
    if (upcoming.length) return [upcoming[0]];

    return [events[events.length - 1]];
  }

  // If browsing another month, show the earliest event in that month.
  return [events[0]];
}

function renderDefaultMonthEvents() {
  renderEvents(calendarEventList, defaultEventsForShownMonth(), "No events plotted for this month.");
}

function renderUpcomingBeyondMonth() {
  const cutoff = endOfMonth(currentDate);

  const futureEvents = allEvents
    .filter((event) => event.dateObj && event.dateObj > cutoff)
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 8);

  renderEvents(upcomingEventList, futureEvents, "No upcoming events beyond this month yet.");
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

    const res = await fetch("/api/public", {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Unable to load calendar.");

    applySettings(data.settings || {});

    allEvents = (data.posts || [])
      .filter((post) => category(post.type) === "event")
      .map(normalizeEvent)
      .filter((event) => event.title && event.dateObj)
      .sort((a, b) => a.dateObj - b.dateObj);

    renderCalendar();

    calendarStatus.textContent = data.generated_at
      ? "Last updated: " + new Date(data.generated_at).toLocaleString("en-PH")
      : "";
  } catch (error) {
    calendarGrid.innerHTML = "";
    calendarEventList.innerHTML = `<p class="loading-text">Unable to load events.</p>`;

    if (upcomingEventList) {
      upcomingEventList.innerHTML = `<p class="loading-text">Unable to load upcoming events.</p>`;
    }

    calendarStatus.textContent = error.message || "Unable to load calendar.";
  }
}

loadCalendar();

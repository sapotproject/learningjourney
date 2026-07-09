function clean(value) {
  return String(value ?? "").trim();
}

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value || "";
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
  const address = clean(settings.address);
  const hours = clean(settings.office_hours);
  const phone = clean(settings.phone);
  const email = clean(settings.email);
  const messenger = clean(settings.messenger);
  const maps = clean(settings.google_maps);

  ["schoolName", "footerSchoolName", "aboutSchoolName"].forEach((id) => {
    setText(id, schoolName);
  });

  ["schoolTagline", "aboutTagline"].forEach((id) => {
    setText(id, tagline);
  });

  setText("footerAddress", address);

  const logoEl = byId("schoolLogo");
  if (logoEl) {
    if (logo) {
      logoEl.src = logo;
      logoEl.classList.remove("hidden");
      setDynamicIcons(logo);
    } else {
      logoEl.removeAttribute("src");
      logoEl.classList.add("hidden");
    }
  }

  setText("contactAddress", address || "Not available yet.");
  setText("contactHours", hours || "Not available yet.");
  setText("contactPhone", phone || "Not available yet.");
  setText("contactEmail", email || "Not available yet.");

  const contactCall = byId("contactCall");
  if (contactCall && phone) contactCall.href = "tel:" + phone;

  const contactMail = byId("contactMail");
  if (contactMail && email) contactMail.href = "mailto:" + email;

  const contactMessenger = byId("contactMessenger");
  if (contactMessenger && messenger) contactMessenger.href = messenger;

  const contactMaps = byId("contactMaps");
  if (contactMaps && maps) contactMaps.href = maps;

  setText("admissionPhone", phone || "Not available yet.");
  setText("admissionEmail", email || "Not available yet.");

  const admissionCall = byId("admissionCall");
  if (admissionCall && phone) admissionCall.href = "tel:" + phone;

  const admissionMessenger = byId("admissionMessenger");
  if (admissionMessenger && messenger) admissionMessenger.href = messenger;
}

async function loadSettings() {
  try {
    const res = await fetch("/api/public", {
      headers: { Accept: "application/json" }
    });

    const data = await res.json();
    if (data.success) applySettings(data.settings || {});
  } catch {
    // keep fallback text
  }
}

loadSettings();

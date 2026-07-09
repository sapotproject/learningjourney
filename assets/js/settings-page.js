function clean(value) {
  return String(value ?? "").trim();
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

  const schoolNameEls = ["schoolName", "footerSchoolName", "aboutSchoolName"];
  schoolNameEls.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = schoolName;
  });

  const taglineEls = ["schoolTagline", "aboutTagline"];
  taglineEls.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = tagline;
  });

  const footerAddress = document.getElementById("footerAddress");
  if (footerAddress) footerAddress.textContent = address;

  const logoEl = document.getElementById("schoolLogo");
  if (logoEl && logo) {
    logoEl.src = logo;
    logoEl.classList.remove("hidden");
  }

  const contactAddress = document.getElementById("contactAddress");
  if (contactAddress) contactAddress.textContent = address || "Not available yet.";

  const contactHours = document.getElementById("contactHours");
  if (contactHours) contactHours.textContent = hours || "Not available yet.";

  const contactPhone = document.getElementById("contactPhone");
  if (contactPhone) contactPhone.textContent = phone || "Not available yet.";

  const contactEmail = document.getElementById("contactEmail");
  if (contactEmail) contactEmail.textContent = email || "Not available yet.";

  const contactCall = document.getElementById("contactCall");
  if (contactCall && phone) contactCall.href = "tel:" + phone;

  const contactMail = document.getElementById("contactMail");
  if (contactMail && email) contactMail.href = "mailto:" + email;

  const contactMessenger = document.getElementById("contactMessenger");
  if (contactMessenger && messenger) contactMessenger.href = messenger;

  const contactMaps = document.getElementById("contactMaps");
  if (contactMaps && maps) contactMaps.href = maps;
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

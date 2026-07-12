(() => {
  "use strict";

  const nav = document.getElementById("mainNav");
  const toggle = document.querySelector(".mobile-menu-toggle");

  if (!nav || !toggle) return;

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function isOpen() {
    return nav.classList.contains("show");
  }

  function openMenu() {
    nav.classList.add("show");
    nav.classList.remove("open", "active");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    nav.classList.remove("show", "open", "active");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const modal = document.getElementById("imageModal");
    if (modal && modal.classList.contains("show")) {
      closeMenu();
      return;
    }

    if (isOpen()) closeMenu();
    else openMenu();
  });

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    // Let browser navigate normally.
    if (isMobile()) {
      setTimeout(closeMenu, 120);
    }
  });

  document.addEventListener("click", (event) => {
    if (!isMobile() || !isOpen()) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) closeMenu();
  });

  window.closeMobileMenu = closeMenu;
})();

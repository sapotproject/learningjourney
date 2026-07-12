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
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    nav.classList.remove("show");
    nav.classList.remove("open");
    nav.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
  }

  function toggleMenu(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const modal = document.getElementById("imageModal");
    if (modal && modal.classList.contains("show")) {
      closeMenu();
      return;
    }

    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener("click", toggleMenu);

  // Use pointerup only on the button. Do not attach touch handlers to links,
  // because that can cancel mobile page navigation.
  toggle.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
      toggleMenu(event);
    }
  });

  // Close after link click, but let browser navigate normally.
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    if (isMobile()) {
      setTimeout(closeMenu, 80);
    }
  });

  // Tap outside closes menu.
  document.addEventListener("click", (event) => {
    if (!isMobile()) return;
    if (!isOpen()) return;
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

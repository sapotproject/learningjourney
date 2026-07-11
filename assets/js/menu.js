(() => {
  "use strict";

  const nav = document.getElementById("mainNav");
  const toggle = document.querySelector(".mobile-menu-toggle");

  if (!nav || !toggle) return;

  function isMenuOpen() {
    return nav.classList.contains("show");
  }

  function openMenu() {
    nav.classList.add("show");
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    nav.classList.remove("show");
    nav.classList.remove("open");
    nav.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Do not open menu while an image modal is active.
    const imageModal = document.getElementById("imageModal");
    if (imageModal && imageModal.classList.contains("show")) {
      closeMenu();
      return;
    }

    if (isMenuOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Remove old inline/on-page browser weirdness by using both click and touchend safely.
  toggle.addEventListener("click", toggleMenu);

  toggle.addEventListener(
    "touchend",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu(event);
    },
    { passive: false }
  );

  // Stop clicks inside nav from closing before the link receives the tap.
  nav.addEventListener("click", (event) => {
    event.stopPropagation();

    const link = event.target.closest("a");
    if (link) {
      closeMenu();
    }
  });

  nav.addEventListener(
    "touchend",
    (event) => {
      const link = event.target.closest("a");
      if (link) {
        closeMenu();
      }
    },
    { passive: true }
  );

  // Tap outside closes menu.
  document.addEventListener("click", (event) => {
    if (!isMenuOpen()) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener(
    "touchend",
    (event) => {
      if (!isMenuOpen()) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    },
    { passive: true }
  );

  // Escape closes menu on laptop.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // If screen becomes desktop/tablet wide, reset mobile menu state.
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMenu();
  });

  // Public helper for gallery modal or future scripts.
  window.closeMobileMenu = closeMenu;
})();

(() => {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function closeMobileMenu() {
    if (window.closeMobileMenu) {
      window.closeMobileMenu();
      return;
    }

    const nav = byId("mainNav");
    const toggle = document.querySelector(".mobile-menu-toggle");

    if (nav) {
      nav.classList.remove("show", "open", "active");
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function ensureModal() {
    let modal = byId("imageModal");
    let img = byId("imageModalImg");
    let closeBtn = byId("imageCloseBtn");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "imageModal";
      modal.className = "image-modal";
      modal.setAttribute("aria-hidden", "true");
      document.body.appendChild(modal);
    }

    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.id = "imageCloseBtn";
      closeBtn.className = "image-close-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "Close ✕";
      modal.appendChild(closeBtn);
    } else if (closeBtn.parentElement !== modal) {
      modal.appendChild(closeBtn);
    }

    if (!img) {
      img = document.createElement("img");
      img.id = "imageModalImg";
      img.alt = "Full size image";
      modal.appendChild(img);
    } else if (img.parentElement !== modal) {
      modal.appendChild(img);
    }

    return { modal, img, closeBtn };
  }

  function openImage(src) {
    if (!src) return;

    const { modal, img } = ensureModal();

    closeMobileMenu();

    img.src = src;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-modal-open");
  }

  function closeImage() {
    const { modal, img } = ensureModal();

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    img.removeAttribute("src");
    document.body.classList.remove("image-modal-open");

    setTimeout(() => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("image-modal-open");
    }, 50);
  }

  function bindModalEvents() {
    const { modal, closeBtn } = ensureModal();

    if (closeBtn.dataset.bound === "1") return;
    closeBtn.dataset.bound = "1";

    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeImage();
    });

    closeBtn.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeImage();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeImage();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeImage();
    });
  }

  function bindImages() {
    bindModalEvents();

    const selectors = [
      ".post-image",
      ".card-image",
      ".featured-image",
      ".dashboard-post-thumb",
      ".calendar-event-image",
      ".public-gallery-image",
      ".post-full-image",
      ".news-image",
      ".event-image",
      ".announcement-image",
      "img[data-fullscreen='true']"
    ];

    document.querySelectorAll(selectors.join(",")).forEach((img) => {
      if (!img || img.dataset.modalBound === "1") return;
      if (!img.src) return;

      img.dataset.modalBound = "1";
      img.classList.add("clickable-image");
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");

      img.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openImage(img.currentSrc || img.src);
      });

      img.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openImage(img.currentSrc || img.src);
        }
      });
    });

    // Also support existing image buttons, but keep normal links working.
    document.querySelectorAll(".image-open-btn").forEach((button) => {
      if (button.dataset.modalBound === "1") return;
      button.dataset.modalBound = "1";

      button.addEventListener("click", (event) => {
        const img = button.querySelector("img");
        if (!img || !img.src) return;

        event.preventDefault();
        event.stopPropagation();
        openImage(img.currentSrc || img.src);
      });
    });
  }

  window.openImageModal = openImage;
  window.closeImageModal = closeImage;

  document.addEventListener("DOMContentLoaded", bindImages);
  window.addEventListener("load", bindImages);

  // Public pages load posts dynamically, so observe new images.
  const observer = new MutationObserver(() => bindImages());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

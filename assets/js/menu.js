document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("mobileMenuToggle");
  const nav = document.getElementById("mainNav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.textContent = isOpen ? "✕ Close" : "☰ Menu";
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰ Menu";
      });
    });
  }
});

function closeImageModal() {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("imageModalImg");

  if (modal) modal.classList.remove("show");
  if (img) img.src = "";
}

function openImageFull(src, alt) {
  if (!src) return;

  let modal = document.getElementById("imageModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageModal";
    modal.className = "image-modal";
    modal.innerHTML = '<button class="image-close-btn" type="button">Close</button><img id="imageModalImg" src="" alt="Post image">';
    document.body.appendChild(modal);
  }

  const img = document.getElementById("imageModalImg");

  if (!img) {
    window.open(src, "_blank", "noopener");
    return;
  }

  img.src = src;
  img.alt = alt || "Post image";
  modal.classList.add("show");
}

document.addEventListener("click", (event) => {
  const closeBtn = event.target.closest(".image-close-btn");

  if (closeBtn) {
    event.preventDefault();
    event.stopPropagation();
    closeImageModal();
    return;
  }

  const imageModal = document.getElementById("imageModal");

  if (imageModal && event.target === imageModal) {
    closeImageModal();
    return;
  }

  const img = event.target.closest("img.post-image, img.modal-img, img.archive-main-image");

  if (!img) return;

  event.preventDefault();
  event.stopPropagation();

  openImageFull(img.currentSrc || img.src, img.alt);
});

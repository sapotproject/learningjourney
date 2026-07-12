(() => {
  "use strict";

  const root = document.documentElement;

  function px(value) {
    return `${Math.max(0, Math.round(value || 0))}px`;
  }

  function visibleHeight(el) {
    if (!el) return 0;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return 0;

    return el.getBoundingClientRect().height || 0;
  }

  function applyStickyLayout() {
    const header = document.querySelector(".header");
    const line = document.querySelector(".line");
    const mobileBar = document.querySelector(".mobile-menu-bar");
    const nav = document.querySelector(".nav");

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const headerH = visibleHeight(header);
    const lineH = visibleHeight(line) || 6;
    const mobileBarH = isMobile ? visibleHeight(mobileBar) : 0;
    const navH = !isMobile ? visibleHeight(nav) : 0;

    const desktopTop = headerH + lineH + navH;
    const mobileTop = headerH + lineH + mobileBarH;

    root.style.setProperty("--lj-header-h", px(headerH));
    root.style.setProperty("--lj-line-h", px(lineH));
    root.style.setProperty("--lj-mobilebar-h", px(mobileBarH));
    root.style.setProperty("--lj-nav-h", px(navH));
    root.style.setProperty("--lj-desktop-offset", px(desktopTop));
    root.style.setProperty("--lj-mobile-offset", px(mobileTop));

    document.body.classList.add("sticky-layout-ready");
  }

  function scheduleApply() {
    requestAnimationFrame(() => {
      applyStickyLayout();
      requestAnimationFrame(applyStickyLayout);
    });
  }

  document.addEventListener("DOMContentLoaded", scheduleApply);
  window.addEventListener("load", scheduleApply);
  window.addEventListener("resize", scheduleApply);
  window.addEventListener("orientationchange", () => setTimeout(scheduleApply, 300));

  // Logo/settings can load after page start, so recalc a few times.
  setTimeout(scheduleApply, 250);
  setTimeout(scheduleApply, 800);
  setTimeout(scheduleApply, 1500);

  // Recalculate when logo loads.
  document.addEventListener("load", (event) => {
    if (event.target && event.target.tagName === "IMG") {
      scheduleApply();
    }
  }, true);

  window.applyStickyLayout = scheduleApply;
})();

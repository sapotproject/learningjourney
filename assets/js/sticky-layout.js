(() => {
  "use strict";
  const root = document.documentElement;
  function px(value) { return `${Math.max(0, Math.round(value || 0))}px`; }
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
    let navH = 0;
    if (!isMobile && nav) navH = visibleHeight(nav);
    root.style.setProperty("--lj-header-h", px(headerH));
    root.style.setProperty("--lj-line-h", px(lineH));
    root.style.setProperty("--lj-mobilebar-h", px(mobileBarH));
    root.style.setProperty("--lj-nav-h", px(navH));
    root.style.setProperty("--lj-desktop-offset", px(headerH + lineH + navH));
    root.style.setProperty("--lj-mobile-offset", px(headerH + lineH + mobileBarH));
    document.body.classList.add("sticky-layout-ready");
  }
  function scheduleApply() {
    requestAnimationFrame(() => { applyStickyLayout(); requestAnimationFrame(applyStickyLayout); });
  }
  document.addEventListener("DOMContentLoaded", scheduleApply);
  window.addEventListener("load", scheduleApply);
  window.addEventListener("resize", scheduleApply);
  window.addEventListener("orientationchange", () => setTimeout(scheduleApply, 300));
  setTimeout(scheduleApply, 100);
  setTimeout(scheduleApply, 400);
  setTimeout(scheduleApply, 900);
  setTimeout(scheduleApply, 1600);
  document.addEventListener("load", (event) => {
    if (event.target && event.target.tagName === "IMG") scheduleApply();
  }, true);
  window.applyStickyLayout = scheduleApply;
})();

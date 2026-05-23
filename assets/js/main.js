const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");

if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    document.body.classList.toggle("nav-open", !isOpen);
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }
  });
}

const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

const primaryMenuGroups = primaryNav
  ? Array.from(primaryNav.querySelectorAll(":scope > .nav-group")).filter(
      (group) => !group.classList.contains("nav-utility"),
    )
  : [];

const getMenuLinkData = (link) => ({
  label: normalizeText(link.textContent || ""),
  href: link.getAttribute("href") || "#",
  target: link.getAttribute("target") || "",
  rel: link.getAttribute("rel") || "",
});

const primaryMenuItems = primaryMenuGroups
  .map((group) => {
    const link = group.querySelector(":scope > .nav-link");
    if (!link) return null;

    return {
      ...getMenuLinkData(link),
      children: Array.from(group.querySelectorAll(":scope > .nav-dropdown a")).map(getMenuLinkData),
    };
  })
  .filter(Boolean);

const closeBreadcrumbMenus = (exceptMenu) => {
  document.querySelectorAll(".breadcrumb-menu.is-open").forEach((menu) => {
    if (menu !== exceptMenu) {
      menu.classList.remove("is-open");
      menu.querySelector(".breadcrumb-trigger")?.setAttribute("aria-expanded", "false");
    }
  });
};

const createBreadcrumbDropdown = (items, currentLabel) => {
  const dropdown = document.createElement("span");
  dropdown.className = "breadcrumb-dropdown";
  dropdown.setAttribute("role", "menu");

  items.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    link.setAttribute("role", "menuitem");

    if (item.target) link.target = item.target;
    if (item.rel) link.rel = item.rel;
    if (normalizeText(item.label) === normalizeText(currentLabel)) link.classList.add("is-active");

    dropdown.append(link);
  });

  return dropdown;
};

document.querySelectorAll(".breadcrumb").forEach((breadcrumb) => {
  const inner = breadcrumb.querySelector(".breadcrumb-inner");
  if (!inner || !primaryMenuItems.length || inner.dataset.enhanced === "true") return;

  const crumbs = Array.from(inner.querySelectorAll(".breadcrumb-link, .breadcrumb-current"));
  const sectionLabel = normalizeText(crumbs[0]?.textContent || "");
  const sectionMenu = primaryMenuItems.find((item) => normalizeText(item.label) === sectionLabel);

  crumbs.forEach((crumb, crumbIndex) => {
    const label = normalizeText(crumb.textContent || "");
    const sameLevelItems = crumbIndex === 0 ? primaryMenuItems : sectionMenu?.children || [];
    if (sameLevelItems.length < 2) return;

    const menu = document.createElement("span");
    menu.className = "breadcrumb-menu";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = `breadcrumb-trigger ${crumb.classList.contains("breadcrumb-current") ? "breadcrumb-current" : "breadcrumb-link"}`;
    trigger.textContent = label;
    trigger.setAttribute("aria-expanded", "false");

    if (crumb.getAttribute("aria-current") === "page") {
      trigger.setAttribute("aria-current", "page");
    }

    const dropdown = createBreadcrumbDropdown(sameLevelItems, label);

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !menu.classList.contains("is-open");
      closeBreadcrumbMenus(menu);
      menu.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
    });

    menu.append(trigger, dropdown);
    crumb.replaceWith(menu);
  });

  inner.dataset.enhanced = "true";
});

document.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest(".breadcrumb-menu")) return;
  closeBreadcrumbMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeBreadcrumbMenus();
});

const aboutSlides = Array.from(document.querySelectorAll("[data-about-slide]"));
const aboutDots = Array.from(document.querySelectorAll("[data-about-dot]"));
const aboutPrev = document.querySelector("[data-about-prev]");
const aboutNext = document.querySelector("[data-about-next]");

if (aboutSlides.length > 1) {
  let activeSlide = 0;
  let slideTimer;

  const showSlide = (index) => {
    activeSlide = (index + aboutSlides.length) % aboutSlides.length;
    aboutSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeSlide);
    });
    if (aboutDots.length === aboutSlides.length) {
      aboutDots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === activeSlide);
      });
    }
  };

  const startSlides = () => {
    window.clearInterval(slideTimer);
    slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 5200);
  };

  if (aboutDots.length === aboutSlides.length) {
    aboutDots.forEach((dot, dotIndex) => {
      dot.addEventListener("click", () => {
        showSlide(dotIndex);
        startSlides();
      });
    });
  }

  aboutPrev?.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    startSlides();
  });

  aboutNext?.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    startSlides();
  });

  startSlides();
}

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const track = carousel.querySelector("[data-carousel-track]");
  const prev = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");

  if (!track) return;

  const move = (direction) => {
    const card = track.querySelector(":scope > *");
    const amount = card ? card.getBoundingClientRect().width + 22 : track.clientWidth * 0.8;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  prev?.addEventListener("click", () => move(-1));
  next?.addEventListener("click", () => move(1));
});

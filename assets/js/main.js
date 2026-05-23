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

document.querySelectorAll("[data-home-board-tabs]").forEach((tabList) => {
  const tabs = Array.from(tabList.querySelectorAll("[data-home-board-tab]"));
  const panels = Array.from(tabList.closest(".board-panel")?.querySelectorAll("[data-home-board-panel]") || []);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-home-board-tab");

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-home-board-panel") === target;
        panel.classList.toggle("is-hidden", !isActive);
        panel.hidden = !isActive;
      });
    });
  });
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

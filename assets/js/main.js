const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector(".primary-nav");
const siteHeader = document.querySelector(".site-header");

const allMenuItems = [
  {
    label: "센터소개",
    href: "about.html",
    links: [
      ["인사말", "about.html"],
      ["비전", "vision.html"],
      ["연혁", "history.html"],
      ["시설소개", "spaces.html"],
      ["오시는길", "location.html"],
    ],
  },
  {
    label: "공간예약",
    href: "space-apply.html",
    links: [
      ["예약하기", "space-apply.html"],
      ["예약내역", "space-reservations.html"],
    ],
  },
  {
    label: "프로그램",
    href: "programs.html",
    links: [
      ["모집안내", "programs.html#current"],
      ["교육신청", "programs.html#apply"],
      ["신청확인", "program-check.html"],
    ],
  },
  {
    label: "소식마당",
    href: "news.html",
    links: [
      ["공지사항", "news.html"],
      ["꿈센터 갤러리", "gallery.html"],
      ["마을 이야기", "village-story.html"],
      ["문의 / 제안", "contact.html"],
    ],
  },
  {
    label: "금산다팜몰",
    href: "https://dafarm.co.kr/",
    external: true,
    links: [["금산다팜몰 바로가기", "https://dafarm.co.kr/", true]],
  },
];

const createAllMenuPanel = () => {
  const panel = document.createElement("div");
  panel.className = "all-menu-panel";
  panel.id = "all-menu-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="all-menu-inner" aria-label="전체메뉴">
      <div class="all-menu-list">
        ${allMenuItems
          .map(
            (item) => `
              <section class="all-menu-row">
                <a class="all-menu-title" href="${item.href}"${item.external ? ' target="_blank" rel="noreferrer"' : ""}>${item.label}</a>
                <div class="all-menu-links">
                  ${item.links
                    .map(
                      ([label, href, external]) =>
                        `<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
  return panel;
};

const setupAllMenu = () => {
  if (!siteHeader || !primaryNav || document.querySelector("[data-all-menu-toggle]")) return;

  const menuGroup = document.createElement("div");
  menuGroup.className = "nav-group nav-utility nav-all-menu-control";
  menuGroup.innerHTML = `
    <button class="nav-link nav-menu-link" type="button" aria-expanded="false" aria-controls="all-menu-panel" data-all-menu-toggle>
      <span class="menu-line-icon" aria-hidden="true"><span></span><span></span><span></span></span>
      <span>전체메뉴</span>
    </button>
  `;

  primaryNav.appendChild(menuGroup);

  const headerInner = siteHeader.querySelector(".header-inner");
  const allMenuPanel = document.querySelector("#all-menu-panel") || createAllMenuPanel();
  if (!allMenuPanel.parentElement && headerInner) {
    siteHeader.insertBefore(allMenuPanel, headerInner.nextSibling);
  }

  const allMenuToggle = menuGroup.querySelector("[data-all-menu-toggle]");
  let allMenuCloseTimer;

  const closeAllMenu = () => {
    window.clearTimeout(allMenuCloseTimer);
    allMenuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("all-menu-open");
    allMenuCloseTimer = window.setTimeout(() => {
      if (allMenuToggle.getAttribute("aria-expanded") === "false") {
        allMenuPanel.hidden = true;
      }
    }, 280);
  };

  const openAllMenu = () => {
    window.clearTimeout(allMenuCloseTimer);
    allMenuPanel.hidden = false;
    allMenuToggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      document.body.classList.add("all-menu-open");
    });
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };

  allMenuToggle.addEventListener("click", () => {
    const isOpen = allMenuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeAllMenu();
    } else {
      openAllMenu();
    }
  });

  allMenuToggle.addEventListener("mouseenter", openAllMenu);
  allMenuToggle.addEventListener("focus", openAllMenu);
  allMenuPanel.addEventListener("mouseenter", openAllMenu);
  siteHeader.addEventListener("mouseleave", closeAllMenu);

  allMenuPanel.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeAllMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("all-menu-open")) return;
    if (event.target instanceof Node && siteHeader.contains(event.target)) return;
    closeAllMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllMenu();
  });

  navToggle?.addEventListener("click", closeAllMenu);
};

setupAllMenu();

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

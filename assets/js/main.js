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
    label: "공간시설",
    href: "space-apply.html",
    links: [
      ["공간예약", "space-apply.html"],
      ["예약확인", "space-reservations.html"],
    ],
  },
  {
    label: "프로그램",
    href: "programs.html",
    links: [
      ["교육신청", "programs.html"],
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
      <div class="all-menu-login">
        <a class="all-menu-login-link" href="login.html">
          <span class="login-person-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M20 21a8 8 0 0 0-16 0"></path>
              <circle cx="12" cy="8" r="4"></circle>
            </svg>
          </span>
          <span>로그인</span>
        </a>
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
  const boardPanel = tabList.closest(".board-panel");
  const panels = Array.from(boardPanel?.querySelectorAll("[data-home-board-panel]") || []);
  const prevButton = boardPanel?.querySelector("[data-home-board-prev]");
  const nextButton = boardPanel?.querySelector("[data-home-board-next]");
  const pageSize = 5;
  let activeTab =
    tabs.find((tab) => tab.classList.contains("is-active"))?.getAttribute("data-home-board-tab") ||
    tabs[0]?.getAttribute("data-home-board-tab");
  const pageState = panels.reduce((state, panel) => {
    state[panel.getAttribute("data-home-board-panel")] = 0;
    return state;
  }, {});

  const getActivePanel = () =>
    panels.find((panel) => panel.getAttribute("data-home-board-panel") === activeTab);

  const updateBoardItems = () => {
    const activePanel = getActivePanel();
    if (!activePanel) return;

    const items = Array.from(activePanel.querySelectorAll("[data-home-board-item]"));
    const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    const currentPage = Math.min(pageState[activeTab] || 0, maxPage);
    pageState[activeTab] = currentPage;

    items.forEach((item, index) => {
      const isVisible = index >= currentPage * pageSize && index < (currentPage + 1) * pageSize;
      item.hidden = !isVisible;
    });

    if (prevButton) {
      const isDisabled = currentPage >= maxPage;
      prevButton.disabled = isDisabled;
      prevButton.setAttribute("aria-disabled", String(isDisabled));
    }

    if (nextButton) {
      const isDisabled = currentPage <= 0;
      nextButton.disabled = isDisabled;
      nextButton.setAttribute("aria-disabled", String(isDisabled));
    }
  };

  const activateTab = (target) => {
    activeTab = target;
    pageState[target] = 0;

    tabs.forEach((item) => {
      const isActive = item.getAttribute("data-home-board-tab") === target;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.getAttribute("data-home-board-panel") === target;
      panel.classList.toggle("is-hidden", !isActive);
      panel.hidden = !isActive;
    });

    updateBoardItems();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-home-board-tab");
      activateTab(target);
    });
  });

  prevButton?.addEventListener("click", () => {
    const activePanel = getActivePanel();
    const items = Array.from(activePanel?.querySelectorAll("[data-home-board-item]") || []);
    const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    pageState[activeTab] = Math.min(maxPage, (pageState[activeTab] || 0) + 1);
    updateBoardItems();
  });

  nextButton?.addEventListener("click", () => {
    pageState[activeTab] = Math.max(0, (pageState[activeTab] || 0) - 1);
    updateBoardItems();
  });

  updateBoardItems();
});

document.querySelectorAll("[data-board-pagination]").forEach((pagination) => {
  const buttons = Array.from(pagination.querySelectorAll("[data-board-page]"));
  const boardWrap = pagination.closest("[data-board-scope]") || pagination.closest(".board-table-wrap");
  const panels = Array.from(boardWrap?.querySelectorAll("[data-board-page-panel]") || []);

  if (!buttons.length || !panels.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPage = button.getAttribute("data-board-page");

      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        if (isActive) {
          item.setAttribute("aria-current", "page");
        } else {
          item.removeAttribute("aria-current");
        }
      });

      panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-board-page-panel") === targetPage;
        panel.classList.toggle("is-active", isActive);
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

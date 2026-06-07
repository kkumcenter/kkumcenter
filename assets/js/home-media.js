(() => {
  const root = document.querySelector("[data-home-media]");
  if (!root) return;

  const galleryTrack = root.querySelector("[data-home-gallery-track]");
  const galleryPanel = root.querySelector(".home-gallery-panel");
  const prevButton = root.querySelector("[data-home-gallery-prev]");
  const nextButton = root.querySelector("[data-home-gallery-next]");
  const config = window.KKOOM_SUPABASE || {};
  const SLIDE_INTERVAL = 2000;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const isSafeUrl = (value) => {
    const text = String(value || "").trim();
    return /^https?:\/\//.test(text) || text.startsWith("/") || text.startsWith("assets/");
  };

  const getClient = () => {
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  let currentIndex = 0;
  let timerId = null;

  const getSlides = () => Array.from(galleryTrack?.querySelectorAll("[data-home-gallery-slide]") || []);

  const showSlide = (index) => {
    const slides = getSlides();
    if (!slides.length) return;
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === currentIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      slide.tabIndex = isActive ? 0 : -1;
    });
  };

  const stop = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  const start = () => {
    stop();
    if (getSlides().length <= 1) return;
    timerId = window.setInterval(() => showSlide(currentIndex + 1), SLIDE_INTERVAL);
  };

  const restart = () => {
    showSlide(currentIndex);
    start();
  };

  const renderGallery = (items) => {
    if (!galleryTrack || !items.length) return;
    galleryTrack.innerHTML = items
      .map((item, index) => {
        const imageUrl = isSafeUrl(item.cover_image_url) ? item.cover_image_url : "assets/images/program-workshop.png";
        const title = item.title || "꿈키움센터 활동 사진";
        return `
          <a class="home-gallery-slide${index === 0 ? " is-active" : ""}" href="gallery.html" data-home-gallery-slide aria-hidden="${index === 0 ? "false" : "true"}" tabindex="${index === 0 ? "0" : "-1"}">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">
          </a>
        `;
      })
      .join("");
    currentIndex = 0;
    restart();
  };

  const loadGallery = async (client) => {
    const { data, error } = await client
      .from("galleries")
      .select("id, title, cover_image_url, event_date, created_at")
      .eq("status", "public")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    renderGallery((data || []).filter((item) => item.cover_image_url));
  };

  prevButton?.addEventListener("click", () => {
    showSlide(currentIndex - 1);
    start();
  });
  nextButton?.addEventListener("click", () => {
    showSlide(currentIndex + 1);
    start();
  });
  galleryPanel?.addEventListener("mouseenter", stop);
  galleryPanel?.addEventListener("mouseleave", start);
  galleryPanel?.addEventListener("focusin", stop);
  galleryPanel?.addEventListener("focusout", start);

  showSlide(0);
  start();

  const client = getClient();
  if (!client) return;

  loadGallery(client).catch((error) => {
    console.warn("Home media fallback:", error);
  });
})();

(() => {
  const root = document.querySelector("[data-home-media]");
  if (!root) return;

  const galleryTrack = root.querySelector("[data-home-gallery-track]");
  const galleryPanel = root.querySelector(".home-gallery-panel");
  const prevButton = root.querySelector("[data-home-gallery-prev]");
  const nextButton = root.querySelector("[data-home-gallery-next]");
  const youtubeLink = root.querySelector("[data-home-youtube-link]");
  const youtubeImage = root.querySelector("[data-home-youtube-image]");
  const youtubeTitle = root.querySelector("[data-home-youtube-title]");
  const config = window.KKOOM_SUPABASE || {};
  const SLIDE_INTERVAL = 2000;
  const HOME_YOUTUBE_KEY = "home_youtube_url";
  const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@kkumcenter";

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

  const getYoutubeId = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const url = new URL(text);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (!host.endsWith("youtube.com")) return "";
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "live", "embed"].includes(parts[0])) return parts[1] || "";
      return "";
    } catch {
      return "";
    }
  };

  const normalizeYoutubeUrl = (value) => {
    const text = String(value || "").trim();
    const videoId = getYoutubeId(text);
    if (!videoId) return "";
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  };

  const renderYoutubeCard = (value) => {
    if (!youtubeLink) return;
    const youtubeUrl = normalizeYoutubeUrl(value);
    const youtubeId = getYoutubeId(youtubeUrl);

    if (!youtubeUrl || !youtubeId) {
      youtubeLink.href = YOUTUBE_CHANNEL_URL;
      if (youtubeImage) {
        youtubeImage.src = "assets/images/community-news.png";
        youtubeImage.alt = "꿈키움센터 유튜브 채널";
      }
      if (youtubeTitle) youtubeTitle.textContent = "공식 유튜브 채널 바로가기";
      return;
    }

    youtubeLink.href = youtubeUrl;
    if (youtubeImage) {
      youtubeImage.src = `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
      youtubeImage.alt = "꿈키움센터 유튜브 대표 영상";
    }
    if (youtubeTitle) youtubeTitle.textContent = "대표 영상 바로가기";
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

  const loadHomeYoutube = async (client) => {
    const { data, error } = await client
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", HOME_YOUTUBE_KEY)
      .maybeSingle();
    if (error) throw error;
    renderYoutubeCard(data?.setting_value);
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
  renderYoutubeCard("");

  const client = getClient();
  if (!client) return;

  loadGallery(client).catch((error) => {
    console.warn("Home media fallback:", error);
  });
  loadHomeYoutube(client).catch((error) => {
    console.warn("Home YouTube fallback:", error);
  });
})();

(() => {
  const page = document.querySelector("[data-video-write-page]");
  if (!page) return;

  const config = window.KKOOM_SUPABASE || {};
  const form = page.querySelector("[data-video-write-form]");
  const guard = page.querySelector("[data-video-write-guard]");
  const status = page.querySelector("[data-form-status]");
  const titleNode = page.querySelector("[data-video-write-title]");
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id") || "";

  const state = {
    session: null,
    profile: null,
    existing: null,
  };

  const getClient = () => {
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  const client = getClient();

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
  };

  const setGuard = (title, message = "") => {
    if (!guard) return;
    guard.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<p>${escapeHtml(message)}</p>` : ""}`;
  };

  const parseYoutubeId = (value) => {
    const raw = String(value || "").trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    let url;
    try {
      url = new URL(raw);
    } catch {
      return "";
    }

    const host = url.hostname.replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    let id = "";
    if (host === "youtu.be") {
      id = pathParts[0] || "";
    } else if (host.endsWith("youtube.com")) {
      if (url.searchParams.get("v")) id = url.searchParams.get("v") || "";
      else if (["embed", "shorts", "live"].includes(pathParts[0])) id = pathParts[1] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  };

  const getSession = async () => {
    const { data } = await client.auth.getSession();
    return data?.session || null;
  };

  const getProfile = async () => {
    const { data, error } = await client
      .from("profiles")
      .select("role, admin_role, name")
      .eq("id", state.session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const canWrite = (profile) => profile?.role === "admin" && ["super_admin", "board_admin"].includes(profile.admin_role);

  const getAuthorName = () => {
    if (state.profile?.admin_role === "super_admin") return "관리자";
    const displayName = String(state.profile?.name || "").trim();
    return displayName && displayName !== "이름 미입력" ? displayName : "스텝";
  };

  const fillForm = (item) => {
    if (!form || !item) return;
    form.elements.title.value = item.title || "";
    form.elements.status.value = item.status || "public";
    form.elements.youtubeUrl.value = item.youtube_url || "";
    form.elements.eventDate.value = item.event_date || "";
    form.elements.description.value = item.description || "";
  };

  const loadExisting = async () => {
    if (!editId) return;
    const { data, error } = await client
      .from("videos")
      .select("id, title, youtube_url, youtube_id, description, event_date, status")
      .eq("id", editId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("수정할 영상을 찾을 수 없습니다.");
    state.existing = data;
    fillForm(data);
  };

  const ensurePermission = async () => {
    if (!client) throw new Error("Supabase 설정을 찾을 수 없습니다.");
    state.session = await getSession();
    if (!state.session?.user?.id) {
      window.location.href = "login.html";
      return false;
    }
    state.profile = await getProfile();
    if (!canWrite(state.profile)) {
      await client.auth.signOut();
      window.location.href = "login.html";
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const title = String(form.elements.title.value || "").trim();
    const youtubeUrl = String(form.elements.youtubeUrl.value || "").trim();
    const youtubeId = parseYoutubeId(youtubeUrl);
    const description = String(form.elements.description.value || "").trim();
    const eventDate = String(form.elements.eventDate.value || "").trim();
    const statusValue = String(form.elements.status.value || "public");

    if (!title) throw new Error("제목을 입력해주세요.");
    if (!youtubeId) throw new Error("유튜브 주소를 확인해주세요.");
    if (!description) throw new Error("설명을 입력해주세요.");

    return {
      title,
      youtube_url: youtubeUrl,
      youtube_id: youtubeId,
      description,
      event_date: eventDate || null,
      status: ["public", "hidden", "draft"].includes(statusValue) ? statusValue : "public",
      author_id: state.session.user.id,
      author_name: getAuthorName(),
    };
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;
    setStatus("저장하고 있습니다.");
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton?.setAttribute("disabled", "disabled");
    try {
      const payload = buildPayload();
      const request = editId
        ? client.from("videos").update(payload).eq("id", editId)
        : client.from("videos").insert(payload);
      const { error } = await request;
      if (error) throw error;
      setStatus("저장되었습니다.");
      window.location.href = "videos.html";
    } catch (error) {
      setStatus(error.message || "저장 중 문제가 발생했습니다.", true);
      submitButton?.removeAttribute("disabled");
    }
  });

  const init = async () => {
    try {
      if (titleNode) titleNode.textContent = editId ? "유튜브 링크 수정" : "유튜브 링크 작성";
      const ok = await ensurePermission();
      if (!ok) return;
      await loadExisting();
      if (guard) guard.hidden = true;
      if (form) form.hidden = false;
    } catch (error) {
      setGuard("유튜브 링크 작성 권한을 확인할 수 없습니다.", error.message || "잠시 후 다시 시도해주세요.");
    }
  };

  init();
})();

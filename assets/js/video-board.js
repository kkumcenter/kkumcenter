(() => {
  const root = document.querySelector("[data-video-board]");
  if (!root) return;

  const list = root.querySelector("[data-video-list]");
  const detail = root.querySelector("[data-video-detail]");
  const toolbar = root.querySelector("[data-video-admin-toolbar]");
  const config = window.KKOOM_SUPABASE || {};

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10).replaceAll("-", ".") : text;
  };

  const thumbnailUrl = (youtubeId) => `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;
  const embedUrl = (youtubeId) => `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`;

  const getClient = () => {
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  const client = getClient();

  const getSession = async () => {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  };

  const getProfile = async (session) => {
    if (!client || !session?.user?.id) return null;
    const { data, error } = await client
      .from("profiles")
      .select("role, admin_role")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const canManage = (profile) => profile?.role === "admin" && ["super_admin", "board_admin"].includes(profile.admin_role);
  const canDelete = (profile) => profile?.role === "admin" && profile.admin_role === "super_admin";

  let items = [];
  let profile = null;
  let selectedId = null;

  const statusLabel = (status) => {
    if (status === "public") return "공개";
    if (status === "hidden") return "숨김 처리됨";
    if (status === "draft") return "임시";
    return "비공개";
  };

  const renderActions = (item) => {
    if (!canManage(profile)) return "";
    return `
      <div class="board-admin-actions video-admin-actions">
        <a href="video-write.html?id=${encodeURIComponent(item.id)}">수정</a>
        ${
          item.status === "hidden"
            ? `<button class="board-restore-button" type="button" data-video-restore="${escapeHtml(item.id)}">복구</button>${
                canDelete(profile) ? `<button class="board-delete-button" type="button" data-video-delete="${escapeHtml(item.id)}">완전삭제</button>` : ""
              }`
            : `<button type="button" data-video-hide="${escapeHtml(item.id)}">숨김</button>`
        }
      </div>
    `;
  };

  const renderList = () => {
    if (!list) return;
    list.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <article class="${[
                selectedId === String(item.id) ? "is-selected" : "",
                item.status === "hidden" ? "is-hidden-row" : "",
              ].filter(Boolean).join(" ")}" data-video-row="${escapeHtml(item.id)}">
                <button class="video-card-button" type="button" data-video-detail-id="${escapeHtml(item.id)}">
                  <span class="video-thumb">
                    <img src="${escapeHtml(thumbnailUrl(item.youtube_id))}" alt="">
                    <span aria-hidden="true">▶</span>
                  </span>
                  <span class="video-card-copy">
                    <strong>${escapeHtml(item.title)}</strong>
                    <time>${escapeHtml(formatDate(item.event_date || item.created_at))}</time>
                    ${canManage(profile) ? `<em class="board-status-chip${item.status === "hidden" ? " is-hidden" : ""}">${escapeHtml(statusLabel(item.status))}</em>` : ""}
                  </span>
                </button>
                ${renderActions(item)}
              </article>
            `,
          )
          .join("")
      : '<article class="empty-state"><div><h3>등록된 영상이 없습니다.</h3><p>유튜브에 영상을 올린 뒤 링크로 연결할 수 있습니다.</p></div></article>';
  };

  const renderDetail = (item) => {
    if (!detail) return;
    if (!item) {
      detail.hidden = true;
      detail.innerHTML = "";
      return;
    }
    detail.hidden = false;
    detail.innerHTML = `
      <article class="board-detail-card video-detail-card">
        <div class="video-embed-frame">
          <iframe src="${escapeHtml(embedUrl(item.youtube_id))}" title="${escapeHtml(item.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="board-detail-head">
          <div>
            <p class="eyebrow">YouTube Link</p>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          ${renderActions(item)}
        </div>
        <dl class="board-detail-meta">
          <div><dt>작성자</dt><dd>${escapeHtml(item.author_name || "꿈키움센터")}</dd></div>
          <div><dt>등록일</dt><dd>${escapeHtml(formatDate(item.event_date || item.created_at))}</dd></div>
          ${canManage(profile) ? `<div><dt>상태</dt><dd>${escapeHtml(statusLabel(item.status))}</dd></div>` : ""}
        </dl>
        <div class="board-detail-content board-content-view">
          ${item.description ? `<p>${escapeHtml(item.description).replaceAll("\n", "<br>")}</p>` : "<p>등록된 설명이 없습니다.</p>"}
        </div>
        <p class="video-source-link"><a href="${escapeHtml(item.youtube_url)}" target="_blank" rel="noreferrer">유튜브에서 보기</a></p>
      </article>
    `;
  };

  const reload = async () => {
    if (!client) {
      items = [];
      renderList();
      return;
    }
    let query = client
      .from("videos")
      .select("id, title, youtube_url, youtube_id, description, event_date, author_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (!canManage(profile)) query = query.eq("status", "public");
    const { data, error } = await query;
    if (error) throw error;
    items = data || [];
    if (selectedId && !items.some((item) => String(item.id) === selectedId)) selectedId = null;
    renderList();
    renderDetail(selectedId ? items.find((item) => String(item.id) === selectedId) : null);
  };

  const updateStatus = async (id, status) => {
    const { error } = await client.from("videos").update({ status }).eq("id", id);
    if (error) throw error;
  };

  const deleteVideo = async (id) => {
    const item = items.find((entry) => String(entry.id) === String(id));
    if (!canDelete(profile)) throw new Error("관리자만 완전삭제할 수 있습니다.");
    if (!item || item.status !== "hidden") throw new Error("숨김 처리된 영상만 완전삭제할 수 있습니다.");
    const { error } = await client.from("videos").delete().eq("id", id).eq("status", "hidden");
    if (error) throw error;
  };

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const detailTarget = target.closest("[data-video-detail-id]");
    if (detailTarget instanceof HTMLElement) {
      selectedId = detailTarget.dataset.videoDetailId || "";
      renderList();
      renderDetail(items.find((item) => String(item.id) === selectedId));
      detail?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const hideTarget = target.closest("[data-video-hide]");
    const restoreTarget = target.closest("[data-video-restore]");
    const deleteTarget = target.closest("[data-video-delete]");
    try {
      if (hideTarget instanceof HTMLElement && window.confirm("이 영상을 숨김 처리할까요?")) {
        await updateStatus(hideTarget.dataset.videoHide, "hidden");
        await reload();
      } else if (restoreTarget instanceof HTMLElement && window.confirm("이 영상을 공개 상태로 복구할까요?")) {
        await updateStatus(restoreTarget.dataset.videoRestore, "public");
        await reload();
      } else if (deleteTarget instanceof HTMLElement) {
        const item = items.find((entry) => String(entry.id) === String(deleteTarget.dataset.videoDelete));
        if (
          item &&
          window.confirm("완전삭제하면 복구할 수 없습니다. 삭제할까요?") &&
          window.confirm(`"${item.title}" 영상을 정말 완전삭제할까요?`)
        ) {
          await deleteVideo(deleteTarget.dataset.videoDelete);
          selectedId = null;
          await reload();
        }
      }
    } catch (error) {
      window.alert(error.message || "처리 중 문제가 발생했습니다.");
    }
  });

  const init = async () => {
    try {
      const session = await getSession();
      profile = await getProfile(session);
      if (toolbar && canManage(profile)) {
        toolbar.hidden = false;
        toolbar.classList.add("board-admin-toolbar-bottom");
        toolbar.innerHTML = '<a class="button primary board-create-button" href="video-write.html">등록하기</a>';
      }
      await reload();
    } catch (error) {
      console.warn("Video board fallback:", error);
      items = [];
      renderList();
    }
  };

  init();
})();

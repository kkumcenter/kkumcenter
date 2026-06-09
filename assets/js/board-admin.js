(() => {
  const root = document.querySelector("[data-managed-board]");
  if (!root) return;

  const boardType = root.dataset.managedBoard;
  const boardKind = root.dataset.boardKind || "post";
  const list = root.querySelector("[data-board-list]");
  const toolbar = root.querySelector("[data-board-admin-toolbar]");
  const pagination = root.querySelector("[data-board-pagination]");
  const config = window.KKOOM_SUPABASE || {};
  const urlParams = new URLSearchParams(window.location.search);
  const requestedDetailId = urlParams.get("id") || urlParams.get("detail") || "";
  const tableName = boardKind === "gallery" ? "galleries" : "posts";
  const PAGE_SIZE = boardKind === "gallery" ? 12 : 10;
  const NO_PHOTO_COVER_URL = "about:blank#kkum-no-photo";

  if (!list) return;

  const getClient = () => {
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  const client = getClient();

  const listShell = list.closest(".board-table-wrap, .gallery-board-wrap");
  listShell?.classList.add("board-list-shell");
  const loadingState = document.createElement("div");
  loadingState.className = "container board-loading-state";
  loadingState.textContent = "게시글을 불러오는 중입니다.";
  if (listShell) {
    listShell.insertAdjacentElement("beforebegin", loadingState);
  } else {
    root.insertAdjacentElement("afterbegin", loadingState);
  }

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const safeImageWidth = (value) => {
    const width = parseFloat(String(value || "").replace("px", ""));
    if (!Number.isFinite(width)) return 0;
    return Math.min(1800, Math.max(40, Math.round(width)));
  };

  const allowedImageClasses = new Set(["image-align-left", "image-align-right", "image-align-center", "image-inline", "gallery-body-image"]);

  const isSafeUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    if (/^(https?:|data:image\/|\/|assets\/)/i.test(text)) return true;
    return false;
  };

  const isLegacyGalleryCover = (value) => {
    const text = String(value || "").trim();
    return [
      "",
      NO_PHOTO_COVER_URL,
      "assets/images/hero-center.png",
      "assets/images/program-workshop.png",
      "assets/images/community-news.png",
    ].includes(text);
  };

  const getGalleryCoverImage = (value) => {
    const text = String(value || "").trim();
    return !isLegacyGalleryCover(text) && isSafeUrl(text) ? text : "";
  };

  const normalizedImageUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      return new URL(text, window.location.href).href;
    } catch {
      return text;
    }
  };

  const sameImageUrl = (left, right) => normalizedImageUrl(left) === normalizedImageUrl(right);

  const markdownImagesToHtml = (value) => {
    const tokens = [];
    const text = String(value || "").replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
      const token = `__KKOOM_IMAGE_${tokens.length}__`;
      tokens.push({ alt, src });
      return token;
    });
    const html = text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br>")}</p>`)
      .join("");

    return tokens.reduce((result, image, index) => {
      const safeSrc = isSafeUrl(image.src) ? image.src : "";
      const tag = safeSrc
        ? `<figure><img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(image.alt || "")}" loading="lazy"></figure>`
        : "";
      return result.replaceAll(`__KKOOM_IMAGE_${index}__`, tag);
    }, html);
  };

  const sanitizeContentHtml = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (!/<[a-z][\s\S]*>/i.test(raw)) return markdownImagesToHtml(raw);

    const template = document.createElement("template");
    template.innerHTML = raw;
    const allowedTags = new Set([
      "A",
      "B",
      "BLOCKQUOTE",
      "BR",
      "DIV",
      "EM",
      "FIGCAPTION",
      "FIGURE",
      "H2",
      "H3",
      "H4",
      "HR",
      "I",
      "IMG",
      "LI",
      "OL",
      "P",
      "SPAN",
      "STRONG",
      "U",
      "UL",
    ]);
    const allowedAttrs = {
      A: new Set(["href", "target", "rel"]),
      IMG: new Set(["src", "alt", "width", "height", "loading", "class", "style"]),
    };

    template.content.querySelectorAll("*").forEach((node) => {
      if (!allowedTags.has(node.tagName)) {
        node.replaceWith(document.createTextNode(node.textContent || ""));
        return;
      }

      [...node.attributes].forEach((attr) => {
        const allowed = allowedAttrs[node.tagName]?.has(attr.name);
        if (!allowed) node.removeAttribute(attr.name);
      });

      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        if (!isSafeUrl(href)) node.removeAttribute("href");
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noreferrer");
      }

      if (node.tagName === "IMG") {
        const src = node.getAttribute("src") || "";
        if (!isSafeUrl(src) || node.classList.contains("ProseMirror-separator")) {
          node.remove();
          return;
        }
        const safeClasses = [...node.classList].filter((className) => allowedImageClasses.has(className));
        if (safeClasses.length) {
          node.setAttribute("class", safeClasses.join(" "));
        } else {
          node.removeAttribute("class");
        }
        const isGalleryBodyImage = safeClasses.includes("gallery-body-image");
        const width = safeImageWidth(node.style.width || node.getAttribute("width"));
        node.removeAttribute("style");
        if (isGalleryBodyImage) {
          node.removeAttribute("width");
          node.removeAttribute("height");
        } else if (width) {
          node.style.width = `${width}px`;
          node.style.height = "auto";
          node.style.maxWidth = "100%";
          node.setAttribute("width", String(width));
          node.removeAttribute("height");
        }
        node.setAttribute("loading", "lazy");
        if (!node.getAttribute("alt")) node.setAttribute("alt", "");
      }
    });

    template.content.querySelectorAll(".ProseMirror-trailingBreak, .ProseMirror-separator").forEach((node) => node.remove());
    template.content.querySelectorAll("p").forEach((paragraph) => {
      const text = (paragraph.textContent || "").trim();
      const hasMedia = paragraph.querySelector("img, video, iframe, object, embed");
      const hasLineBreakOnly = paragraph.children.length === 1 && paragraph.firstElementChild?.tagName === "BR";
      if (!text && !hasMedia && !hasLineBreakOnly) paragraph.remove();
    });

    return template.innerHTML;
  };

  const decorateGalleryContentHtml = (html, coverImageUrl) => {
    if (!html || !coverImageUrl) return html;
    const template = document.createElement("template");
    template.innerHTML = html;
    template.content.querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute("src") || "";
      image.classList.add("gallery-body-image");
      const isCover = sameImageUrl(src, coverImageUrl);
      const wrapper = document.createElement("figure");
      wrapper.className = `gallery-image-frame${isCover ? " is-cover" : ""}`;
      image.replaceWith(wrapper);
      wrapper.appendChild(image);
    });
    template.content.querySelectorAll("p").forEach((paragraph) => {
      const meaningfulChildren = [...paragraph.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim());
      if (!meaningfulChildren.length) return;
      if (!meaningfulChildren.every((node) => node instanceof HTMLElement && node.classList.contains("gallery-image-frame"))) return;
      paragraph.replaceWith(...meaningfulChildren);
    });
    return template.innerHTML;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10).replaceAll("-", ".") : text;
  };

  const formatBytes = (value) => {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  };

  const YOUTUBE_LINK_MIME = "text/x-youtube-url";
  const YOUTUBE_LINK_BUCKET = "youtube-link";

  const isYoutubeLinkAttachment = (file) =>
    file?.mime_type === YOUTUBE_LINK_MIME || file?.storage_bucket === YOUTUBE_LINK_BUCKET;

  const parseYoutubeId = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const url = new URL(text);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
      if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        if (url.pathname === "/watch") return url.searchParams.get("v") || "";
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch {
      return "";
    }
    return "";
  };

  const youtubeThumbnailUrl = (youtubeId) => `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;

  const boardWriteUrl = (id = "") =>
    `board-write.html?board=${encodeURIComponent(boardType)}${id ? `&id=${encodeURIComponent(id)}` : ""}`;

  const getSession = async () => {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  };

  const getProfile = async (session) => {
    if (!client) return null;
    if (!session?.user?.id) return null;
    const { data, error } = await client
      .from("profiles")
      .select("role, admin_role, email")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const canManageBoard = (profile) =>
    profile?.role === "admin" && ["super_admin", "board_admin"].includes(profile.admin_role);

  const canDeleteBoard = (profile) =>
    profile?.role === "admin" && profile.admin_role === "super_admin";

  const fetchAttachments = async (targetType, targetIds) => {
    if (!client || !targetIds.length) return new Map();
    const { data, error } = await client
      .from("attachments")
      .select("target_id, file_name, file_url, file_size, storage_bucket, mime_type")
      .eq("target_type", targetType)
      .in("target_id", targetIds);
    if (error) throw error;

    return (data || []).reduce((map, file) => {
      const key = String(file.target_id);
      const files = map.get(key) || [];
      files.push(file);
      map.set(key, files);
      return map;
    }, new Map());
  };

  const attachFiles = async (items, targetType) => {
    const ids = items.map((item) => String(item.id)).filter((id) => !id.startsWith("static-"));
    const filesById = await fetchAttachments(targetType, ids);
    return items.map((item) => {
      const files = filesById.get(String(item.id)) || [];
      const contentHtml = String(item.content || item.description || "");
      return {
        ...item,
        relatedYoutube: files.find(isYoutubeLinkAttachment) || null,
        attachments: files.filter((file) => !isYoutubeLinkAttachment(file) && !(file.file_url && contentHtml.includes(file.file_url))),
      };
    });
  };

  const callPublicSubmitFunction = async (action, payload) => {
    const token = currentSession?.access_token;
    if (!token) throw new Error("관리자 인증 정보가 필요합니다.");
    const response = await fetch(`${config.url}/functions/v1/public-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) throw new Error(result.error || "서버 함수 호출 중 문제가 발생했습니다.");
    return result;
  };

  const fetchItems = async (canManage) => {
    if (!client) return [];

    if (boardKind === "gallery") {
      let query = client
        .from("galleries")
        .select("id, title, event_date, place, description, author_name, cover_image_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!canManage) query = query.eq("status", "public");
      const { data, error } = await query;
      if (error) throw error;
      return attachFiles(data || [], "gallery");
    }

    let query = client
      .from("posts")
      .select("id, board_type, title, content, author_name, status, view_count, published_at, created_at")
      .eq("board_type", boardType)
      .order("created_at", { ascending: false })
      .limit(60);
    if (!canManage) query = query.eq("status", "public");
    const { data, error } = await query;
    if (error) throw error;
    return attachFiles(data || [], "post");
  };

  const ensureActionHeader = (canManage) => {
    if (boardKind === "gallery") return;
    const headRow = root.querySelector(".board-table thead tr");
    if (!headRow) return;
    const existing = headRow.querySelector("[data-board-action-head]");
    if (canManage && !existing) {
      headRow.insertAdjacentHTML("beforeend", '<th scope="col" data-board-action-head>관리</th>');
    }
    if (!canManage && existing) existing.remove();
  };

  const createDetailShell = () => {
    let shell = root.querySelector("[data-board-detail-shell]");
    if (shell) return shell;

    shell = document.createElement("div");
    shell.className = "container board-detail-shell";
    shell.setAttribute("data-board-detail-shell", "");
    shell.hidden = true;

    if (listShell) {
      listShell.insertAdjacentElement("afterend", shell);
    } else if (pagination) {
      pagination.insertAdjacentElement("afterend", shell);
    } else if (list?.parentElement) {
      list.parentElement.insertAdjacentElement("afterend", shell);
    } else {
      root.appendChild(shell);
    }

    return shell;
  };

  const detailShell = createDetailShell();

  const statusLabel = (status) => {
    if (status === "public") return "공개";
    if (status === "draft") return "임시";
    if (status === "hidden") return "숨김 처리됨";
    return "비공개";
  };

  const renderAdminActions = (item, canManage) =>
    canManage
      ? `<div class="board-admin-actions">
          <a href="${escapeHtml(boardWriteUrl(item.id))}">수정</a>
          ${
            item.status === "hidden"
              ? `<button class="board-restore-button" type="button" data-board-restore="${escapeHtml(item.id)}">복구</button>${
                  canDeleteBoard(currentProfile) ? `<button class="board-delete-button" type="button" data-board-delete="${escapeHtml(item.id)}">완전삭제</button>` : ""
                }`
              : `<button type="button" data-board-hide="${escapeHtml(item.id)}">숨김</button>`
          }
        </div>`
      : "";

  const renderPostList = (items, canManage, totalCount = items.length, offset = 0) => {
    ensureActionHeader(canManage);
    list.innerHTML = items.length
      ? items
          .map((item, index) => {
            const id = String(item.id);
            const actions = canManage ? `<td class="board-admin-actions-cell">${renderAdminActions(item, canManage)}</td>` : "";
            return `
              <tr data-board-row="${escapeHtml(id)}" class="${[
                selectedItemId === id ? "is-selected" : "",
                item.status === "hidden" ? "is-hidden-row" : "",
              ].filter(Boolean).join(" ")}">
                <td>${totalCount - offset - index}</td>
                <td class="board-title-cell">
                  <button class="board-title-button" type="button" title="${escapeHtml(item.title)}" data-board-detail="${escapeHtml(id)}">${escapeHtml(item.title)}</button>
                  ${canManage ? `<span class="board-status-chip${item.status === "hidden" ? " is-hidden" : ""}">${escapeHtml(statusLabel(item.status))}</span>` : ""}
                </td>
                <td>${escapeHtml(item.author_name || "꿈키움센터")}</td>
                <td>${escapeHtml(formatDate(item.published_at || item.created_at))}</td>
                <td>${Number(item.view_count || 0)}</td>
                ${actions}
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="${canManage ? 6 : 5}">등록된 게시글이 없습니다.</td></tr>`;
  };

  const renderGalleryList = (items, canManage) => {
    list.innerHTML = items.length
      ? items
          .map((item) => {
            const id = String(item.id);
            const coverImage = getGalleryCoverImage(item.cover_image_url);
            return `
              <article data-board-row="${escapeHtml(id)}" class="${[
                selectedItemId === id ? "is-selected" : "",
                item.status === "hidden" ? "is-hidden-row" : "",
              ].filter(Boolean).join(" ")}">
                <button class="gallery-detail-button" type="button" title="${escapeHtml(item.title)}" data-board-detail="${escapeHtml(id)}">
                  ${coverImage
                    ? `<img src="${escapeHtml(coverImage)}" alt="">`
                    : `<div class="gallery-photo-empty" aria-hidden="true"><strong>사진 없음</strong></div>`}
                  <span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <time>${escapeHtml(formatDate(item.event_date || item.created_at))}</time>
                    ${item.place ? `<small>${escapeHtml(item.place)}</small>` : ""}
                    ${canManage ? `<em class="board-status-chip${item.status === "hidden" ? " is-hidden" : ""}">${escapeHtml(statusLabel(item.status))}</em>` : ""}
                  </span>
                </button>
                ${renderAdminActions(item, canManage)}
              </article>
            `;
          })
          .join("")
      : '<article class="empty-state"><div><h3>등록된 사진이 없습니다.</h3><p>스텝 로그인 후 갤러리 글을 등록할 수 있습니다.</p></div></article>';
  };

  const renderAttachments = (files = []) => {
    const safeFiles = files.filter((file) => file?.file_url && isSafeUrl(file.file_url));
    if (!safeFiles.length) return "";
    return `
      <section class="board-detail-files" aria-label="첨부파일">
        <h4>첨부파일</h4>
        <ul>
          ${safeFiles
            .map(
              (file) => `
                <li>
                  <a href="${escapeHtml(file.file_url)}" target="_blank" rel="noreferrer">
                    <span>${escapeHtml(file.file_name || "첨부파일")}</span>
                    ${formatBytes(file.file_size) ? `<small>${escapeHtml(formatBytes(file.file_size))}</small>` : ""}
                  </a>
                </li>
              `,
            )
            .join("")}
        </ul>
      </section>
    `;
  };

  const renderRelatedYoutube = (file) => {
    if (!file?.file_url || !isSafeUrl(file.file_url)) return "";
    const youtubeId = parseYoutubeId(file.file_url);
    if (!youtubeId) return "";
    return `
      <section class="board-related-video" aria-label="관련 영상">
        <h4>관련 영상</h4>
        <a href="${escapeHtml(file.file_url)}" target="_blank" rel="noreferrer">
          <span class="board-related-video-thumb">
            <img src="${escapeHtml(youtubeThumbnailUrl(youtubeId))}" alt="" loading="lazy">
            <span aria-hidden="true">▶</span>
          </span>
          <span class="board-related-video-copy">
            <strong>${escapeHtml(file.file_name || "관련 유튜브 영상")}</strong>
            <small>유튜브에서 보기</small>
          </span>
        </a>
      </section>
    `;
  };

  const renderDetail = (item, canManage) => {
    if (!item) {
      detailShell.hidden = true;
      detailShell.innerHTML = "";
      return;
    }

    const isGallery = boardKind === "gallery";
    const date = formatDate(item.published_at || item.event_date || item.created_at);
    const author = item.author_name || "꿈키움센터";
    const image = isGallery ? getGalleryCoverImage(item.cover_image_url) : "";
    const rawContentHtml = sanitizeContentHtml(isGallery ? item.description : item.content);
    const fallbackGalleryImageHtml =
      isGallery && image && !rawContentHtml
        ? `<p><img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" class="gallery-body-image image-align-center" loading="lazy"></p>`
        : "";
    const contentHtml = isGallery ? decorateGalleryContentHtml(rawContentHtml || fallbackGalleryImageHtml, image) : rawContentHtml;

    detailShell.hidden = false;
    detailShell.innerHTML = `
      <article class="board-detail-card${isGallery ? " is-gallery-detail" : ""}">
        ${isGallery && !image ? `<div class="board-detail-empty-image" aria-hidden="true"><strong>사진 없음</strong><small>등록된 대표 사진이 없습니다.</small></div>` : ""}
        <div class="board-detail-head">
          <div>
            <p class="eyebrow">${isGallery ? "갤러리" : "게시글"}</p>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          ${renderAdminActions(item, canManage)}
        </div>
        <dl class="board-detail-meta">
          <div><dt>작성자</dt><dd>${escapeHtml(author)}</dd></div>
          <div><dt>작성일</dt><dd>${escapeHtml(date)}</dd></div>
          ${canManage ? `<div><dt>상태</dt><dd>${escapeHtml(statusLabel(item.status))}</dd></div>` : ""}
          ${isGallery && item.place ? `<div><dt>장소</dt><dd>${escapeHtml(item.place)}</dd></div>` : ""}
          ${!isGallery ? `<div><dt>조회</dt><dd>${Number(item.view_count || 0)}</dd></div>` : ""}
        </dl>
        <div class="board-detail-content board-content-view">
          ${contentHtml || "<p>등록된 내용이 없습니다.</p>"}
        </div>
        ${renderRelatedYoutube(item.relatedYoutube)}
        ${renderAttachments(item.attachments)}
      </article>
    `;
  };

  let currentItems = [];
  let currentProfile = null;
  let currentSession = null;
  let currentPage = 1;
  let selectedItemId = null;
  let pendingDetailId = requestedDetailId;
  let shouldScrollToRequestedDetail = Boolean(requestedDetailId);

  const renderPagination = (totalPages) => {
    if (!pagination) return;
    pagination.hidden = totalPages < 1;
    pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
      const page = index + 1;
      return `<button class="${page === currentPage ? "is-active" : ""}" type="button" data-board-page="${page}"${page === currentPage ? ' aria-current="page"' : ""}>${page}</button>`;
    }).join("");
  };

  const syncSelectedDetail = (canManage) => {
    const selected = selectedItemId ? currentItems.find((item) => String(item.id) === selectedItemId) : null;
    if (selected) renderDetail(selected, canManage);
    else renderDetail(null, canManage);
  };

  const renderItems = (items, canManage) => {
    loadingState.remove();
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const offset = (currentPage - 1) * PAGE_SIZE;
    const visibleItems = items.slice(offset, offset + PAGE_SIZE);

    root.querySelectorAll("[data-board-page-panel]").forEach((panel, index) => {
      if (panel !== list) panel.hidden = true;
      if (panel === list) {
        panel.hidden = false;
        panel.classList.add("is-active");
      } else if (index > 0) {
        panel.classList.remove("is-active");
      }
    });

    renderPagination(totalPages);
    if (boardKind === "gallery") renderGalleryList(visibleItems, canManage);
    else renderPostList(visibleItems, canManage, items.length, offset);
    syncSelectedDetail(canManage);
  };

  const hideItem = async (id) => {
    if (!client || String(id).startsWith("static-")) throw new Error("저장된 게시글만 숨김 처리할 수 있습니다.");
    const { error } = await client.from(tableName).update({ status: "hidden" }).eq("id", id);
    if (error) throw error;
  };

  const restoreItem = async (id) => {
    if (!client || String(id).startsWith("static-")) throw new Error("저장된 게시글만 복구할 수 있습니다.");
    const { error } = await client.from(tableName).update({ status: "public" }).eq("id", id);
    if (error) throw error;
  };

  const deleteItem = async (id) => {
    if (!client || String(id).startsWith("static-")) throw new Error("저장된 게시글만 완전삭제할 수 있습니다.");
    const item = currentItems.find((entry) => String(entry.id) === String(id));
    if (!canDeleteBoard(currentProfile)) throw new Error("관리자만 완전삭제할 수 있습니다.");
    if (!item || item.status !== "hidden") throw new Error("숨김 처리된 글만 완전삭제할 수 있습니다.");

    if (boardKind === "gallery") {
      await callPublicSubmitFunction("gallery-delete", { id });
      return;
    }

    await callPublicSubmitFunction("post-delete", { id });
  };

  const reload = async () => {
    const canManage = canManageBoard(currentProfile);
    currentItems = await fetchItems(canManage);
    if (pendingDetailId) {
      const requestedIndex = currentItems.findIndex((item) => String(item.id) === pendingDetailId);
      if (requestedIndex >= 0) {
        selectedItemId = pendingDetailId;
        currentPage = Math.floor(requestedIndex / PAGE_SIZE) + 1;
      }
      pendingDetailId = "";
    }
    if (selectedItemId && !currentItems.some((item) => String(item.id) === selectedItemId)) {
      selectedItemId = null;
    }
    renderItems(currentItems, canManage);
    if (shouldScrollToRequestedDetail && selectedItemId && !detailShell.hidden) {
      shouldScrollToRequestedDetail = false;
      window.setTimeout(() => detailShell.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  };

  const placeCreateButton = () => {
    if (!toolbar) return;
    const previousParent = toolbar.parentElement;
    if (pagination) {
      pagination.insertAdjacentElement("afterend", toolbar);
    } else if (list?.parentElement) {
      list.parentElement.insertAdjacentElement("afterend", toolbar);
    }
    if (previousParent && previousParent !== toolbar.parentElement && !previousParent.textContent.trim()) {
      previousParent.remove();
    }
  };

  const selectItem = (id, shouldScroll = true) => {
    selectedItemId = String(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", selectedItemId);
    window.history.replaceState({}, "", url.toString());
    const canManage = canManageBoard(currentProfile);
    renderItems(currentItems, canManage);
    if (shouldScroll && !detailShell.hidden) {
      detailShell.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const hideTarget = target.closest("[data-board-hide]");
    if (hideTarget instanceof HTMLElement) {
      const hideId = hideTarget.dataset.boardHide;
      if (hideId && window.confirm("이 글을 숨김 처리할까요?")) {
        hideTarget.setAttribute("disabled", "true");
        try {
          await hideItem(hideId);
          if (selectedItemId === hideId) selectedItemId = null;
          await reload();
        } catch (error) {
          window.alert(error.message || "숨김 처리 중 문제가 발생했습니다.");
        } finally {
          hideTarget.removeAttribute("disabled");
        }
      }
      return;
    }

    const restoreTarget = target.closest("[data-board-restore]");
    if (restoreTarget instanceof HTMLElement) {
      const restoreId = restoreTarget.dataset.boardRestore;
      if (restoreId && window.confirm("이 글을 공개 상태로 복구할까요?")) {
        restoreTarget.setAttribute("disabled", "true");
        try {
          await restoreItem(restoreId);
          await reload();
        } catch (error) {
          window.alert(error.message || "복구 중 문제가 발생했습니다.");
        } finally {
          restoreTarget.removeAttribute("disabled");
        }
      }
      return;
    }

    const deleteTarget = target.closest("[data-board-delete]");
    if (deleteTarget instanceof HTMLElement) {
      const deleteId = deleteTarget.dataset.boardDelete;
      const item = currentItems.find((entry) => String(entry.id) === String(deleteId));
      if (
        deleteId &&
        item &&
        window.confirm("완전삭제하면 복구할 수 없습니다. 삭제할까요?") &&
        window.confirm(`"${item.title}" 글을 정말 완전삭제할까요?`)
      ) {
        deleteTarget.setAttribute("disabled", "true");
        try {
          await deleteItem(deleteId);
          if (selectedItemId === deleteId) selectedItemId = null;
          await reload();
        } catch (error) {
          window.alert(error.message || "완전삭제 중 문제가 발생했습니다.");
        } finally {
          deleteTarget.removeAttribute("disabled");
        }
      }
      return;
    }

    const detailTarget = target.closest("[data-board-detail]");
    if (detailTarget instanceof HTMLElement) {
      const detailId = detailTarget.dataset.boardDetail;
      if (detailId) selectItem(detailId, true);
    }
  });

  pagination?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.boardPage) return;
    currentPage = Number(target.dataset.boardPage) || 1;
    renderItems(currentItems, canManageBoard(currentProfile));
    placeCreateButton();
  });

  const init = async () => {
    try {
      const session = await getSession();
      currentSession = session;
      currentProfile = await getProfile(session);
      const canManage = canManageBoard(currentProfile);

      if (toolbar && canManage) {
        toolbar.hidden = false;
        toolbar.classList.add("board-admin-toolbar-bottom");
        toolbar.innerHTML = `<a class="button primary board-create-button" href="${escapeHtml(boardWriteUrl())}">등록하기</a>`;
        placeCreateButton();
      }

      await reload();
      root.classList.add("is-board-ready");
    } catch (error) {
      currentItems = [];
      renderItems(currentItems, false);
      root.classList.add("is-board-ready");
      console.warn("Board data fallback:", error);
    }
  };

  init();
})();

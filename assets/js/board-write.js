(() => {
  const page = document.querySelector("[data-board-write-page]");
  if (!page) return;

  const boardConfigs = {
    notice: { label: "공지사항", kind: "post", listUrl: "news.html", bucket: "post-attachments", targetType: "post" },
    village: { label: "마을 이야기", kind: "post", listUrl: "village-story.html", bucket: "post-attachments", targetType: "post" },
    gallery: { label: "꿈센터 갤러리", kind: "gallery", listUrl: "gallery.html", bucket: "gallery-images", targetType: "gallery" },
  };

  const params = new URLSearchParams(window.location.search);
  const boardType = params.get("board") || "notice";
  const editId = params.get("id") || "";
  const board = boardConfigs[boardType] || boardConfigs.notice;
  const config = window.KKOOM_SUPABASE || {};

  const form = page.querySelector("[data-board-write-form]");
  const guard = page.querySelector("[data-board-write-guard]");
  const status = form?.querySelector("[data-form-status]");
  const fileInput = page.querySelector("[data-board-file-input]");
  const fileList = page.querySelector("[data-board-file-list]");
  const editorFallback = page.querySelector(".board-editor-fallback");

  const state = {
    session: null,
    profile: null,
    editor: null,
    draftId: editId || (crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`),
    images: [],
    files: [],
    coverImageUrl: "",
    existingItem: null,
    selectedImage: null,
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

  const safeFileName = (name) =>
    String(name || "file")
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "file";

  const imageLayoutClasses = ["image-align-left", "image-align-right", "image-align-center", "image-inline"];
  const editorTextTranslations = new Map([
    ["Select image file", "이미지 파일 선택"],
    ["Choose image file", "이미지 파일 선택"],
    ["Choose a file", "파일 선택"],
    ["Choose file", "파일 선택"],
    ["No file chosen", "선택된 파일 없음"],
    ["Description", "이미지 설명"],
    ["Image description", "이미지 설명"],
    ["Alt text", "이미지 설명"],
    ["Insert image", "이미지 삽입"],
    ["Insert Image", "이미지 삽입"],
    ["Image URL", "이미지 주소"],
    ["URL", "주소"],
    ["File", "파일"],
    ["OK", "확인"],
    ["Cancel", "취소"],
  ]);

  const fileExt = (name, fallback = "jpg") => {
    const match = String(name || "").match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || fallback;
  };

  const formatBytes = (value) => {
    const size = Number(value || 0);
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  };

  const translateEditorPopups = () => {
    document.querySelectorAll(".toastui-editor-popup").forEach((popup) => {
      popup.querySelectorAll("button, label, span, p, div, strong").forEach((element) => {
        const text = element.textContent?.trim();
        const translated = editorTextTranslations.get(text);
        if (translated && element.childNodes.length === 1) {
          element.textContent = translated;
        }
      });

      popup.querySelectorAll("input, textarea").forEach((input) => {
        if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
        const placeholder = editorTextTranslations.get(input.placeholder?.trim());
        if (placeholder) input.placeholder = placeholder;
        if (input instanceof HTMLInputElement && ["button", "submit"].includes(input.type)) {
          const value = editorTextTranslations.get(input.value?.trim());
          if (value) input.value = value;
        }
      });
    });
  };

  const startEditorKoreanPatch = () => {
    translateEditorPopups();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(translateEditorPopups);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const updatePageLabels = () => {
    document.title = `${board.label} ${editId ? "수정" : "작성"} | 군북면 꿈키움센터`;
    page.querySelector("[data-board-write-eyebrow]").textContent = board.kind === "gallery" ? "갤러리 작성" : "게시글 작성";
    page.querySelector("[data-board-write-title]").textContent = `${board.label} ${editId ? "수정" : "작성"}`;
    page.querySelectorAll("[data-board-back-link], [data-board-cancel-link]").forEach((link) => {
      link.setAttribute("href", board.listUrl);
    });
    document.querySelectorAll(".subnav a").forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === board.listUrl);
    });
  };

  const getSession = async () => {
    const { data } = await client.auth.getSession();
    return data?.session || null;
  };

  const getProfile = async () => {
    const { data, error } = await client
      .from("profiles")
      .select("role, admin_role, email, name")
      .eq("id", state.session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const ensurePermission = async () => {
    if (!client) throw new Error("Supabase 설정을 찾을 수 없습니다.");
    state.session = await getSession();
    if (!state.session?.user?.id) {
      window.location.href = "login.html";
      return false;
    }
    state.profile = await getProfile();
    const canWrite = state.profile?.role === "admin" && ["super_admin", "board_admin"].includes(state.profile.admin_role);
    if (!canWrite) {
      await client.auth.signOut();
      window.location.href = "login.html";
      return false;
    }
    return true;
  };

  const getAuthorName = () => {
    if (state.profile?.admin_role === "super_admin") return "관리자";
    const displayName = String(state.profile?.name || "").trim();
    return displayName && displayName !== "이름 미입력" ? displayName : "스텝";
  };

  const initEditor = () => {
    const editorEl = document.getElementById("board-editor");
    const Editor = window.toastui?.Editor;
    if (!editorEl || !Editor) {
      if (editorFallback) editorFallback.hidden = false;
      return;
    }

    state.editor = new Editor({
      el: editorEl,
      height: "520px",
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      initialValue: "",
      language: "ko-KR",
      usageStatistics: false,
      hooks: {
        addImageBlobHook: async (blob, callback) => {
          try {
            const file = blob instanceof File ? blob : new File([blob], `image-${Date.now()}.png`, { type: blob.type || "image/png" });
            const edited = await openImageEditor(file);
            const image = await uploadBoardFile(edited.blob, board.bucket, edited.name, "images");
            state.images.push(image);
            if (!state.coverImageUrl) state.coverImageUrl = image.url;
            callback(image.url, image.name);
          } catch (error) {
            if (error?.message !== "cancel") window.alert(error.message || "이미지 업로드 중 문제가 발생했습니다.");
          }
        },
      },
    });
    startEditorKoreanPatch();
    setupInteractiveEditorImages();
  };

  const setEditorContent = (value) => {
    if (state.editor) {
      if (state.editor.setHTML) state.editor.setHTML(value || "");
      else state.editor.setMarkdown(value || "");
      window.setTimeout(enhanceEditorImages, 80);
    } else if (editorFallback) {
      editorFallback.hidden = false;
      editorFallback.value = value || "";
    }
  };

  const getEditorEditable = () => {
    const editable = page.querySelector(".toastui-editor-ww-container .toastui-editor-contents");
    const container = editable?.closest(".toastui-editor-ww-container");
    if (!editable || (container && window.getComputedStyle(container).display === "none")) return null;
    return editable;
  };

  const cleanEditorHtml = (html) => {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    template.content.querySelectorAll("img").forEach((image) => {
      persistImageState(image);
      image.classList.remove("board-editor-image-selected", "board-editor-image-editing");
      image.removeAttribute("draggable");
      image.removeAttribute("data-board-editor-image");
      image.removeAttribute("data-board-image-width");
      image.removeAttribute("data-board-image-layout");
      image.style.removeProperty("outline");
      image.style.removeProperty("outline-offset");
      image.style.removeProperty("cursor");
      image.style.removeProperty("touch-action");
      image.style.removeProperty("user-select");
    });
    template.content.querySelectorAll(".ProseMirror-trailingBreak").forEach((node) => node.remove());
    return template.innerHTML.trim();
  };

  const getEditorContent = () => {
    const editable = getEditorEditable();
    if (editable) return cleanEditorHtml(editable.innerHTML);
    if (state.editor) return state.editor.getHTML();
    return editorFallback?.value?.trim() || "";
  };

  const uploadBoardFile = async (blob, bucket, originalName, folder) => {
    const ext = fileExt(originalName, blob.type?.includes("png") ? "png" : "jpg");
    const name = safeFileName(originalName || `${folder}.${ext}`);
    const path = `${boardType}/${state.draftId}/${folder}/${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}-${name}`;
    const { error } = await client.storage.from(bucket).upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return {
      name,
      url: data.publicUrl,
      path,
      size: blob.size || 0,
      bucket,
      saved: false,
    };
  };

  const imageFromElement = async (image) => {
    const response = await fetch(image.currentSrc || image.src);
    if (!response.ok) throw new Error("이미지를 다시 불러올 수 없습니다.");
    const blob = await response.blob();
    const srcName = decodeURIComponent((image.currentSrc || image.src).split("/").pop()?.split("?")[0] || "image.jpg");
    const name = image.getAttribute("alt") || srcName || "image.jpg";
    return new File([blob], safeFileName(name), { type: blob.type || "image/jpeg" });
  };

  const getImageToolbar = () => {
    let toolbar = document.querySelector("[data-board-image-toolbar]");
    if (toolbar) return toolbar;

    toolbar = document.createElement("div");
    toolbar.className = "board-image-toolbar";
    toolbar.dataset.boardImageToolbar = "";
    toolbar.hidden = true;
    toolbar.innerHTML = `
      <button type="button" data-image-layout="left">왼쪽</button>
      <button type="button" data-image-layout="center">가운데</button>
      <button type="button" data-image-layout="right">오른쪽</button>
      <button type="button" data-image-layout="inline">본문처럼</button>
      <button type="button" data-image-toolbar-edit>편집</button>
    `;

    toolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const layoutButton = target.closest("[data-image-layout]");
      const editButton = target.closest("[data-image-toolbar-edit]");
      const image = state.selectedImage;
      if (!(image instanceof HTMLImageElement)) return;

      if (layoutButton instanceof HTMLElement) {
        applyImageLayout(image, layoutButton.dataset.imageLayout || "center");
      } else if (editButton instanceof HTMLElement) {
        editEditorImage(image);
      }
    });

    document.body.appendChild(toolbar);
    return toolbar;
  };

  const hideImageToolbar = () => {
    const toolbar = getImageToolbar();
    toolbar.hidden = true;
    state.selectedImage = null;
    getEditorEditable()?.querySelectorAll("img.board-editor-image-selected").forEach((item) => {
      item.classList.remove("board-editor-image-selected");
    });
  };

  const activeLayoutForImage = (image) => {
    if (image.classList.contains("image-align-left")) return "left";
    if (image.classList.contains("image-align-right")) return "right";
    if (image.classList.contains("image-inline")) return "inline";
    return "center";
  };

  const imageWidthFor = (image) =>
    parseFloat(image.dataset.boardImageWidth || "") ||
    parseFloat(image.style.width || "") ||
    Number(image.getAttribute("width")) ||
    image.getBoundingClientRect().width ||
    image.naturalWidth ||
    image.width ||
    320;

  const getEditorWidth = () => getEditorEditable()?.clientWidth || 720;

  const captureImageState = (image) => ({
    width: imageWidthFor(image),
    layout: activeLayoutForImage(image),
  });

  const applyImageState = (image, snapshot) => {
    if (!(image instanceof HTMLImageElement) || !snapshot) return;
    image.classList.remove(...imageLayoutClasses);
    if (snapshot.layout === "left") image.classList.add("image-align-left");
    else if (snapshot.layout === "right") image.classList.add("image-align-right");
    else if (snapshot.layout === "inline") image.classList.add("image-inline");
    else image.classList.add("image-align-center");
    setImageWidth(image, snapshot.width);
  };

  const positionImageToolbar = (image) => {
    const toolbar = getImageToolbar();
    const rect = image.getBoundingClientRect();
    toolbar.hidden = false;
    const toolbarWidth = toolbar.offsetWidth || 360;
    const left = Math.max(12, Math.min(window.innerWidth - toolbarWidth - 12, rect.left + rect.width / 2 - toolbarWidth / 2));
    const top = Math.max(12, rect.top - (toolbar.offsetHeight || 42) - 10);
    toolbar.style.left = `${Math.round(left)}px`;
    toolbar.style.top = `${Math.round(top)}px`;
    const activeLayout = activeLayoutForImage(image);
    toolbar.querySelectorAll("[data-image-layout]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-image-layout") === activeLayout);
    });
  };

  const setImageWidth = (image, width) => {
    const maxWidth = Math.max(80, getEditorWidth());
    const nextWidth = Math.min(maxWidth, Math.max(80, Math.round(width || 0)));
    image.style.width = `${nextWidth}px`;
    image.style.height = "auto";
    image.style.maxWidth = "100%";
    image.setAttribute("width", String(nextWidth));
    image.dataset.boardImageWidth = String(nextWidth);
    image.dataset.boardImageLayout = activeLayoutForImage(image);
  };

  const persistImageState = (image) => {
    if (!(image instanceof HTMLImageElement)) return;
    const snapshot = captureImageState(image);
    applyImageState(image, snapshot);
  };

  const syncEditorModelFromDom = (image) => {
    const editable = getEditorEditable();
    if (!state.editor?.setHTML || !editable) return;

    const snapshot =
      image instanceof HTMLImageElement
        ? { ...captureImageState(image), src: image.currentSrc || image.src }
        : null;

    const html = cleanEditorHtml(editable.innerHTML);
    state.editor.setHTML(html);

    window.setTimeout(() => {
      enhanceEditorImages();
      if (!snapshot?.src) return;
      const nextImage = Array.from(getEditorEditable()?.querySelectorAll("img") || []).find(
        (item) => item.currentSrc === snapshot.src || item.src === snapshot.src,
      );
      if (nextImage instanceof HTMLImageElement) {
        applyImageState(nextImage, snapshot);
        selectEditorImage(nextImage);
      }
    }, 80);
  };

  const applyImageLayout = (image, layout) => {
    if (!(image instanceof HTMLImageElement)) return;
    const editable = getEditorEditable();
    const editorWidth = editable?.clientWidth || 720;
    const currentWidth = imageWidthFor(image);

    image.classList.remove(...imageLayoutClasses);

    if (layout === "left" || layout === "right") {
      image.classList.add(layout === "left" ? "image-align-left" : "image-align-right");
      setImageWidth(image, Math.min(Math.max(220, currentWidth), Math.min(420, editorWidth * 0.48)));
    } else if (layout === "inline") {
      image.classList.add("image-inline");
      setImageWidth(image, Math.min(Math.max(90, currentWidth), 220));
      image.insertAdjacentText("afterend", " ");
    } else {
      image.classList.add("image-align-center");
      setImageWidth(image, Math.min(currentWidth, editorWidth));
    }

    selectEditorImage(image);
    syncEditorModelFromDom(image);
    setStatus("이미지 배치를 적용했습니다.");
  };

  const selectEditorImage = (image) => {
    getEditorEditable()?.querySelectorAll("img.board-editor-image-selected").forEach((item) => {
      if (item !== image) item.classList.remove("board-editor-image-selected");
    });
    if (image instanceof HTMLImageElement) {
      state.selectedImage = image;
      image.classList.add("board-editor-image-selected");
      positionImageToolbar(image);
    }
  };

  const moveImageToPoint = (image, x, y) => {
    const doc = image.ownerDocument;
    let range = null;
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    } else if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      if (position) {
        range = doc.createRange();
        range.setStart(position.offsetNode, position.offset);
      }
    }
    const editable = getEditorEditable();
    if (!range || !editable?.contains(range.startContainer) || image.contains(range.startContainer)) return false;
    const snapshot = captureImageState(image);
    range.collapse(true);
    image.remove();
    range.insertNode(image);
    applyImageState(image, snapshot);
    image.insertAdjacentText("afterend", "\n");
    selectEditorImage(image);
    syncEditorModelFromDom(image);
    return true;
  };

  const editEditorImage = async (image) => {
    if (!image) return;
    const snapshot = captureImageState(image);
    image.classList.add("board-editor-image-editing");
    setStatus("이미지를 편집하고 있습니다.");
    try {
      const file = await imageFromElement(image);
      const edited = await openImageEditor(file);
      const uploaded = await uploadBoardFile(edited.blob, board.bucket, edited.name, "images");
      image.src = uploaded.url;
      image.alt = uploaded.name;
      image.removeAttribute("srcset");
      applyImageState(image, snapshot);
      state.images.push(uploaded);
      if (!state.coverImageUrl) state.coverImageUrl = uploaded.url;
      setStatus("본문 이미지가 교체되었습니다.");
    } catch (error) {
      if (error?.message !== "cancel") setStatus(error.message || "이미지 편집 중 문제가 발생했습니다.", true);
      else setStatus("");
    } finally {
      image.classList.remove("board-editor-image-editing");
      enhanceEditorImages();
    }
  };

  const enhanceEditorImages = () => {
    const editable = getEditorEditable();
    if (!editable) return;
    editable.querySelectorAll("img").forEach((image) => {
      image.dataset.boardEditorImage = "true";
      image.draggable = true;
      image.loading = "lazy";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      const savedWidth = imageWidthFor(image);
      if (savedWidth) {
        setImageWidth(image, Math.min(savedWidth, editable.clientWidth || savedWidth));
      }
      if (!imageLayoutClasses.some((className) => image.classList.contains(className))) {
        image.classList.add("image-align-center");
      }
      image.dataset.boardImageLayout = activeLayoutForImage(image);
    });
  };

  const setupInteractiveEditorImages = () => {
    const editorEl = document.getElementById("board-editor");
    if (!editorEl) return;
    let draggedImage = null;

    editorEl.addEventListener("click", (event) => {
      const image = event.target instanceof HTMLElement ? event.target.closest(".toastui-editor-contents img") : null;
      if (image instanceof HTMLImageElement) {
        selectEditorImage(image);
      } else if (!(event.target instanceof HTMLElement && event.target.closest("[data-board-image-toolbar]"))) {
        hideImageToolbar();
      }
    });

    editorEl.addEventListener("dblclick", (event) => {
      const image = event.target instanceof HTMLElement ? event.target.closest(".toastui-editor-contents img") : null;
      if (!(image instanceof HTMLImageElement)) return;
      event.preventDefault();
      editEditorImage(image);
    });

    editorEl.addEventListener("dragstart", (event) => {
      const image = event.target instanceof HTMLElement ? event.target.closest(".toastui-editor-contents img") : null;
      if (!(image instanceof HTMLImageElement)) return;
      draggedImage = image;
      selectEditorImage(image);
      event.dataTransfer?.setData("text/plain", image.alt || "image");
      event.dataTransfer?.setDragImage(image, Math.min(40, image.naturalWidth / 2 || 20), Math.min(40, image.naturalHeight / 2 || 20));
    });

    editorEl.addEventListener("dragover", (event) => {
      if (!draggedImage) return;
      event.preventDefault();
    });

    editorEl.addEventListener("drop", (event) => {
      if (!draggedImage) return;
      event.preventDefault();
      moveImageToPoint(draggedImage, event.clientX, event.clientY);
      draggedImage = null;
    });

    editorEl.addEventListener("dragend", () => {
      draggedImage = null;
    });

    const observer = new MutationObserver(enhanceEditorImages);
    observer.observe(editorEl, { childList: true, subtree: true });

    if (window.interact) {
      const resizeModifiers = [
        window.interact.modifiers.restrictSize({
          min: { width: 120, height: 80 },
          max: { width: getEditorWidth(), height: 1800 },
        }),
      ];
      if (window.interact.modifiers.aspectRatio) {
        resizeModifiers.unshift(window.interact.modifiers.aspectRatio({ ratio: "preserve" }));
      }

      window
        .interact(".board-toast-editor .toastui-editor-contents img")
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          listeners: {
            move(event) {
              const image = event.target;
              const width = Math.min(getEditorWidth(), Math.max(120, event.rect.width));
              setImageWidth(image, width);
              selectEditorImage(image);
            },
            end(event) {
              persistImageState(event.target);
              syncEditorModelFromDom(event.target);
            },
          },
          modifiers: resizeModifiers,
        });
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-board-image-toolbar]")) return;
      if (target.closest("#board-editor .toastui-editor-contents img")) return;
      if (target.closest("#board-editor")) return;
      if (!document.querySelector("[data-board-image-toolbar]")?.hidden) hideImageToolbar();
    });

    window.addEventListener("scroll", () => {
      if (state.selectedImage && !getImageToolbar().hidden) positionImageToolbar(state.selectedImage);
    }, true);
    window.addEventListener("resize", () => {
      if (state.selectedImage && !getImageToolbar().hidden) positionImageToolbar(state.selectedImage);
    });

    window.setTimeout(enhanceEditorImages, 120);
  };

  const renderFileList = () => {
    if (!fileList) return;
    fileList.innerHTML = state.files.length
      ? state.files
          .map(
            (file) => `
              <article class="board-upload-item board-file-item">
                <div>
                  <strong>${escapeHtml(file.name)}</strong>
                  <p>${escapeHtml(formatBytes(file.size))}</p>
                </div>
              </article>
            `,
          )
          .join("")
      : '<p class="board-help-text">첨부된 파일이 없습니다.</p>';
  };

  const insertImageIntoEditor = (image) => {
    const markdown = `\n![${image.name}](${image.url})\n`;
    if (state.editor?.insertText) state.editor.insertText(markdown);
    else if (editorFallback) editorFallback.value = `${editorFallback.value || ""}${markdown}`;
    window.setTimeout(enhanceEditorImages, 80);
  };

  const loadExisting = async () => {
    if (!editId) return;

    if (board.kind === "gallery") {
      const { data, error } = await client
        .from("galleries")
        .select("id, title, description, cover_image_url, status")
        .eq("id", editId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("수정할 글을 찾을 수 없습니다.");
      state.existingItem = data;
      form.elements.title.value = data.title || "";
      form.elements.status.value = data.status || "public";
      state.coverImageUrl = data.cover_image_url || "";
      setEditorContent(data.description || "");

      const { data: galleryImages, error: imageError } = await client
        .from("gallery_images")
        .select("image_url, caption, sort_order")
        .eq("gallery_id", editId)
        .order("sort_order", { ascending: true });
      if (imageError) throw imageError;
      state.images = (galleryImages || []).map((image, index) => ({
        name: image.caption || `이미지 ${index + 1}`,
        url: image.image_url,
        size: 0,
        saved: true,
      }));
      if (state.coverImageUrl && !state.images.some((image) => image.url === state.coverImageUrl)) {
        state.images.unshift({ name: "대표 이미지", url: state.coverImageUrl, size: 0, saved: true });
      }
    } else {
      const { data, error } = await client
        .from("posts")
        .select("id, title, content, status")
        .eq("id", editId)
        .eq("board_type", boardType)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("수정할 글을 찾을 수 없습니다.");
      state.existingItem = data;
      form.elements.title.value = data.title || "";
      form.elements.status.value = data.status || "public";
      setEditorContent(data.content || "");
    }

    const { data: attachments, error: attachmentError } = await client
      .from("attachments")
      .select("file_name, file_url, file_size")
      .eq("target_id", editId);
    if (!attachmentError) {
      state.files = (attachments || []).map((file) => ({
        name: file.file_name,
        url: file.file_url,
        size: file.file_size || 0,
        saved: true,
      }));
    }

    renderFileList();
  };

  const saveAttachments = async (targetId) => {
    const newFiles = state.files.filter((file) => !file.saved);
    const postImages = board.kind === "gallery" ? [] : state.images.filter((image) => !image.saved);
    const rows = [...newFiles, ...postImages].map((file) => ({
      target_type: board.targetType,
      target_id: targetId,
      file_name: file.name,
      file_url: file.url,
      file_size: file.size || null,
      uploaded_by: state.session.user.id,
    }));
    if (!rows.length) return;
    const { error } = await client.from("attachments").insert(rows);
    if (error) throw error;
    newFiles.forEach((file) => {
      file.saved = true;
    });
    postImages.forEach((image) => {
      image.saved = true;
    });
  };

  const saveGalleryImages = async (galleryId) => {
    const newImages = state.images.filter((image) => !image.saved);
    const rows = newImages.map((image, index) => ({
        gallery_id: galleryId,
        image_url: image.url,
        caption: image.name,
        sort_order: index,
      }));
    if (!rows.length) return;
    const { error } = await client.from("gallery_images").insert(rows);
    if (error) throw error;
    newImages.forEach((image) => {
      image.saved = true;
    });
  };

  const savePost = async () => {
    const payload = {
      board_type: boardType,
      title: form.elements.title.value.trim(),
      content: getEditorContent(),
      status: form.elements.status.value,
      published_at: form.elements.status.value === "public" ? new Date().toISOString() : null,
      author_id: state.session.user.id,
      author_name: getAuthorName(),
    };
    if (!payload.title || !payload.content) throw new Error("제목과 본문을 입력해주세요.");

    if (editId) {
      const { error } = await client.from("posts").update(payload).eq("id", editId);
      if (error) throw error;
      await saveAttachments(editId);
      return editId;
    }

    const { data, error } = await client.from("posts").insert(payload).select("id").single();
    if (error) throw error;
    await saveAttachments(data.id);
    return data.id;
  };

  const saveGallery = async () => {
    const coverImageUrl = state.coverImageUrl || state.images[0]?.url || state.existingItem?.cover_image_url || "assets/images/hero-center.png";
    const payload = {
      title: form.elements.title.value.trim(),
      description: getEditorContent(),
      event_date: null,
      place: null,
      cover_image_url: coverImageUrl,
      status: form.elements.status.value,
      author_id: state.session.user.id,
      author_name: getAuthorName(),
    };
    if (!payload.title || !payload.description) throw new Error("제목과 본문을 입력해주세요.");

    if (editId) {
      const { error } = await client.from("galleries").update(payload).eq("id", editId);
      if (error) throw error;
      await saveGalleryImages(editId);
      await saveAttachments(editId);
      return editId;
    }

    const { data, error } = await client.from("galleries").insert(payload).select("id").single();
    if (error) throw error;
    await saveGalleryImages(data.id);
    await saveAttachments(data.id);
    return data.id;
  };

  const blobToCanvas = (blob) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(blob);
      image.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        resolve(canvas);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("이미지를 읽을 수 없습니다."));
      };
      image.src = url;
    });

  const canvasToBlob = (canvas, type = "image/jpeg", quality = 0.9) =>
    new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });

  const clampRect = (rect, canvas) => {
    const x = Math.max(0, Math.min(canvas.width, Math.round(rect.x)));
    const y = Math.max(0, Math.min(canvas.height, Math.round(rect.y)));
    const width = Math.max(1, Math.min(canvas.width - x, Math.round(rect.width)));
    const height = Math.max(1, Math.min(canvas.height - y, Math.round(rect.height)));
    return { x, y, width, height };
  };

  const applyMosaicToBlob = async (blob, rect) => {
    const canvas = await blobToCanvas(blob);
    const area = clampRect(rect, canvas);
    const ctx = canvas.getContext("2d");
    const smallCanvas = document.createElement("canvas");
    const pixelSize = 12;
    smallCanvas.width = Math.max(1, Math.ceil(area.width / pixelSize));
    smallCanvas.height = Math.max(1, Math.ceil(area.height / pixelSize));
    const smallCtx = smallCanvas.getContext("2d");
    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(canvas, area.x, area.y, area.width, area.height, 0, 0, smallCanvas.width, smallCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, area.x, area.y, area.width, area.height);
    return canvasToBlob(canvas, blob.type || "image/jpeg");
  };

  const openImageEditor = (file) =>
    new Promise((resolve, reject) => {
      const modal = page.querySelector("[data-image-edit-modal]");
      const preview = page.querySelector("[data-image-edit-preview]");
      if (!modal || !preview || !window.Cropper) {
        resolve({ blob: file, name: file.name });
        return;
      }

      let cropper = null;
      let currentBlob = file;
      let currentUrl = "";

      const cleanup = () => {
        cropper?.destroy();
        cropper = null;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        modal.hidden = true;
        page.querySelector("[data-image-rotate-left]").removeEventListener("click", rotateLeft);
        page.querySelector("[data-image-rotate-right]").removeEventListener("click", rotateRight);
        page.querySelector("[data-image-apply-crop]").removeEventListener("click", applyCrop);
        page.querySelector("[data-image-apply-mosaic]").removeEventListener("click", applyMosaic);
        page.querySelector("[data-image-use-original]").removeEventListener("click", useOriginal);
        page.querySelector("[data-image-edit-done]").removeEventListener("click", done);
        page.querySelectorAll("[data-image-edit-cancel]").forEach((button) => button.removeEventListener("click", cancel));
      };

      const initCropper = () => {
        cropper?.destroy();
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = URL.createObjectURL(currentBlob);
        preview.src = currentUrl;
        preview.onload = () => {
          cropper = new Cropper(preview, {
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            background: false,
          });
        };
      };

      const rotateLeft = () => cropper?.rotate(-90);
      const rotateRight = () => cropper?.rotate(90);

      const applyCrop = async () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000 });
        const blob = await canvasToBlob(canvas, file.type || "image/jpeg");
        if (blob) {
          currentBlob = blob;
          initCropper();
        }
      };

      const applyMosaic = async () => {
        if (!cropper) return;
        const rect = cropper.getData(true);
        currentBlob = await applyMosaicToBlob(currentBlob, rect);
        initCropper();
      };

      const useOriginal = () => {
        cleanup();
        resolve({ blob: file, name: file.name });
      };

      const done = async () => {
        if (cropper) {
          const canvas = cropper.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000 });
          const blob = await canvasToBlob(canvas, file.type || "image/jpeg");
          if (blob) currentBlob = blob;
        }
        cleanup();
        const ext = fileExt(file.name, currentBlob.type?.includes("png") ? "png" : "jpg");
        const baseName = safeFileName(file.name).replace(/\.[^.]+$/, "");
        resolve({ blob: currentBlob, name: `${baseName || "image"}-edited.${ext}` });
      };

      const cancel = () => {
        cleanup();
        reject(new Error("cancel"));
      };

      page.querySelector("[data-image-rotate-left]").addEventListener("click", rotateLeft);
      page.querySelector("[data-image-rotate-right]").addEventListener("click", rotateRight);
      page.querySelector("[data-image-apply-crop]").addEventListener("click", applyCrop);
      page.querySelector("[data-image-apply-mosaic]").addEventListener("click", applyMosaic);
      page.querySelector("[data-image-use-original]").addEventListener("click", useOriginal);
      page.querySelector("[data-image-edit-done]").addEventListener("click", done);
      page.querySelectorAll("[data-image-edit-cancel]").forEach((button) => button.addEventListener("click", cancel));
      modal.hidden = false;
      initCropper();
    });

  fileInput?.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = "";
    if (!files.length) return;
    setStatus("파일을 업로드하고 있습니다.");

    try {
      for (const file of files) {
        state.files.push(await uploadBoardFile(file, "post-attachments", file.name, "files"));
      }
      renderFileList();
      setStatus("파일을 첨부했습니다.");
    } catch (error) {
      setStatus(error.message || "파일 첨부 중 문제가 발생했습니다.", true);
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus("저장하고 있습니다.");

    try {
      await (board.kind === "gallery" ? saveGallery() : savePost());
      setStatus("저장했습니다. 목록으로 이동합니다.");
      window.location.href = board.listUrl;
    } catch (error) {
      setStatus(error.message || "저장 중 문제가 발생했습니다.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  const init = async () => {
    updatePageLabels();
    renderFileList();

    try {
      if (!(await ensurePermission())) return;
      initEditor();
      await loadExisting();
      guard.hidden = true;
      form.hidden = false;
      form.elements.title.focus();
    } catch (error) {
      setGuard("글쓰기 화면을 열 수 없습니다.", error.message || "스텝 권한과 네트워크 상태를 확인해주세요.");
    }
  };

  init();
})();

(() => {
  const dashboard = document.querySelector("[data-admin-approval-dashboard]");
  if (!dashboard) return;

  const config = window.KKOOM_SUPABASE || {};
  const hasSupabase = Boolean(window.supabase && config.url && config.anonKey);
  const client = hasSupabase
    ? window.KKOOM_SUPABASE_CLIENT || window.supabase.createClient(config.url, config.anonKey)
    : null;

  if (client && !window.KKOOM_SUPABASE_CLIENT) {
    window.KKOOM_SUPABASE_CLIENT = client;
  }

  const TABLE_COLSPAN = 6;
  const PAGE_SIZE_OPTIONS = [10, 30, 50];
  const APPLICANT_PAGE_SIZE_OPTIONS = [10, 30];

  const nodes = {
    role: dashboard.querySelector("[data-admin-approval-role]"),
    pendingSpace: dashboard.querySelector("[data-pending-space-count]"),
    pendingProgram: dashboard.querySelector("[data-pending-program-count]"),
    pendingInquiry: dashboard.querySelector("[data-pending-inquiry-count]"),
    spaceList: dashboard.querySelector("[data-space-approval-list]"),
    programList: dashboard.querySelector("[data-program-approval-list]"),
    refresh: dashboard.querySelector("[data-admin-refresh]"),
    spaceSelectAll: dashboard.querySelector("[data-space-select-all]"),
    programSelectAll: dashboard.querySelector("[data-program-select-all]"),
    spaceSelectedCount: dashboard.querySelector("[data-space-selected-count]"),
    programSelectedCount: dashboard.querySelector("[data-program-selected-count]"),
    spaceBulkApprove: dashboard.querySelector("[data-space-bulk-approve]"),
    programBulkApprove: dashboard.querySelector("[data-program-bulk-approve]"),
    spaceApprovalKeyword: dashboard.querySelector("[data-space-approval-keyword]"),
    programApprovalKeyword: dashboard.querySelector("[data-program-approval-keyword]"),
    spacePageSize: dashboard.querySelector("[data-space-page-size]"),
    programPageSize: dashboard.querySelector("[data-program-page-size]"),
    spacePagePrev: dashboard.querySelector("[data-space-page-prev]"),
    spacePageNext: dashboard.querySelector("[data-space-page-next]"),
    programPagePrev: dashboard.querySelector("[data-program-page-prev]"),
    programPageNext: dashboard.querySelector("[data-program-page-next]"),
    spacePageInfo: dashboard.querySelector("[data-space-page-info]"),
    programPageInfo: dashboard.querySelector("[data-program-page-info]"),
    programStatusList: dashboard.querySelector("[data-program-status-list]"),
    programManageForm: dashboard.querySelector("[data-program-manage-form]"),
    programFormReset: dashboard.querySelector("[data-program-form-reset]"),
    programManageStatus: dashboard.querySelector("[data-program-manage-status]"),
    programManageRunStatus: dashboard.querySelector("[data-program-manage-run-status]"),
    programManageTarget: dashboard.querySelector("[data-program-manage-target]"),
    programManageYear: dashboard.querySelector("[data-program-manage-year]"),
    programManageVisibility: dashboard.querySelector("[data-program-manage-visibility]"),
    programManageOperation: dashboard.querySelector("[data-program-manage-operation]"),
    programManageKeyword: dashboard.querySelector("[data-program-manage-keyword]"),
    programManagePageSize: dashboard.querySelector("[data-program-manage-page-size]"),
    programManagePagePrev: dashboard.querySelector("[data-program-manage-page-prev]"),
    programManagePageNext: dashboard.querySelector("[data-program-manage-page-next]"),
    programManagePageInfo: dashboard.querySelector("[data-program-manage-page-info]"),
    programManageResult: dashboard.querySelector("[data-program-manage-result]"),
    programSelectedGuide: dashboard.querySelector("[data-program-selected-guide]"),
    programSelectedApplicants: dashboard.querySelector("[data-program-selected-applicants]"),
  };

  const DEFAULT_PROGRAM_FILTERS = {
    status: "all",
    runStatus: "all",
    target: "all",
    yearValue: "all",
    visibility: "all",
    operation: "all",
    keyword: "",
  };

  const state = {
    session: null,
    profile: null,
    spaces: [],
    programs: [],
    programCatalog: [],
    allProgramApplications: [],
    inquiryCount: 0,
    selectedSpaces: new Set(),
    selectedPrograms: new Set(),
    spacePage: 1,
    programPage: 1,
    spacePageSize: 10,
    programPageSize: 10,
    spaceApprovalKeyword: "",
    programApprovalKeyword: "",
    programManagePage: 1,
    programManagePageSize: 10,
    appliedProgramFilters: { ...DEFAULT_PROGRAM_FILTERS },
    selectedProgramId: null,
    selectedProgramApplicantPage: 1,
    selectedProgramApplicantPageSize: 10,
    detail: null,
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const displayValue = (value) => {
    const text = String(value ?? "").trim();
    return text || "-";
  };

  const safeFileName = (name) =>
    String(name || "program-image")
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "program-image";

  const fileExt = (name, fallback = "jpg") => {
    const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : fallback;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatDate(value);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (value) => String(value || "").slice(0, 5);

  const formatTimeRange = (start, end) => {
    const startText = formatTime(start);
    const endText = formatTime(end);
    if (startText && endText) return `${startText}-${endText}`;
    return startText || endText || "-";
  };

  const getRelationValue = (relation, key) => {
    if (Array.isArray(relation)) return relation[0]?.[key];
    return relation?.[key];
  };

  const programStatusLabel = (status) => {
    if (status === "waiting") return "대기";
    if (status === "approved") return "승인완료";
    if (status === "canceled") return "취소";
    if (status === "completed") return "접수완료";
    return "접수완료";
  };

  const statusClass = (value) => {
    const text = String(value || "");
    if (text.includes("승인") || text.includes("접수")) return "ongoing";
    if (text.includes("대기")) return "open";
    return "closed";
  };

  const educationStatusLabel = (status) => {
    if (status === "open") return "접수중";
    if (status === "closed" || status === "finished") return "접수마감";
    return "접수예정";
  };

  const educationStatusClass = (status) => {
    if (status === "open") return "admin-status-open";
    if (status === "scheduled") return "admin-status-scheduled";
    if (status === "closed" || status === "finished") return "admin-status-closed";
    return "admin-status-unknown";
  };

  const normalizedEducationStatus = (program) => (program?.status === "finished" ? "closed" : program?.status || "scheduled");
  const normalizeProgramVisibility = (value, isActive = true) => {
    if (value === "private" || isActive === false) return "private";
    return "public";
  };
  const programVisibilityValue = (program) => normalizeProgramVisibility(program?.visibility, program?.is_active);
  const programOperationValue = (program) => program?.operation_status || "normal";

  const programVisibilityLabel = (value) => {
    if (value === "private") return "비공개";
    return "공개";
  };

  const programVisibilityClass = (value) => {
    if (value === "private") return "admin-visibility-private";
    return "admin-visibility-public";
  };

  const programOperationLabel = (value) => (value === "canceled" ? "취소" : "정상");
  const programOperationClass = (value) => (value === "canceled" ? "admin-operation-canceled" : "admin-operation-normal");

  const educationRunStatusValue = (program) => {
    const today = new Date();
    const start = program.start_date ? new Date(`${program.start_date}T00:00:00`) : null;
    const end = program.end_date ? new Date(`${program.end_date}T23:59:59`) : null;
    if (end && today > end) return "finished";
    if (start && today < start) return "upcoming";
    return "ongoing";
  };

  const educationRunStatusLabel = (program) => {
    const value = educationRunStatusValue(program);
    if (value === "upcoming") return "진행예정";
    if (value === "ongoing") return "진행중";
    return "종료";
  };

  const educationRunStatusClass = (program) => {
    const value = educationRunStatusValue(program);
    if (value === "upcoming") return "admin-run-upcoming";
    if (value === "ongoing") return "admin-run-ongoing";
    return "admin-run-finished";
  };

  const formatDateRange = (start, end) => {
    const startText = formatDate(start);
    const endText = formatDate(end);
    if (startText === "-" && endText === "-") return "-";
    if (startText === endText) return startText;
    return `${startText} - ${endText}`;
  };

  const callPublicSubmitFunction = async (action, payload = {}) => {
    if (!state.session?.access_token) throw new Error("관리자 인증 정보가 필요합니다.");
    const response = await window.fetch(`${config.url}/functions/v1/public-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${state.session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
    return result;
  };

  const setCount = (node, value) => {
    if (node) node.textContent = String(value);
  };

  const setTableMessage = (node, message, isError = false) => {
    if (!node) return;
    node.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="${isError ? "is-error" : ""}">${escapeHtml(message)}</td></tr>`;
  };

  const setFormStatus = (form, message, isError = false) => {
    const status = form?.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  };

  const renderProgramImagePreview = (form, url = "") => {
    const preview = form?.querySelector("[data-program-image-preview]");
    const clearButton = form?.querySelector("[data-program-image-clear]");
    if (!preview) return;
    const imageUrl = String(url || "").trim();
    preview.innerHTML = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="대표 이미지 미리보기"><span>현재 대표 이미지</span>`
      : "<span>이미지가 없으면 기본 교육 이미지가 자동으로 표시됩니다.</span>";
    if (clearButton) clearButton.hidden = !imageUrl;
  };

  const uploadProgramImage = async (file, programId = "") => {
    if (!client) throw new Error("이미지 업로드를 위한 Supabase 연결이 필요합니다.");
    if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 첨부할 수 있습니다.");
    const ext = fileExt(file.name, file.type.includes("png") ? "png" : "jpg");
    const rawName = safeFileName(file.name || `program-image.${ext}`);
    const name = /\.[a-z0-9]+$/i.test(rawName) ? rawName : `${rawName}.${ext}`;
    const folder = programId ? `program-${programId}` : "new";
    const token = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2);
    const path = `${folder}/${Date.now()}-${token}-${name}`;
    const { error } = await client.storage.from("program-images").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    const { data } = client.storage.from("program-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const showMessage = (message, isError = false) => {
    setTableMessage(nodes.spaceList, message, isError);
    setTableMessage(nodes.programList, message, isError);
  };

  const friendlyErrorMessage = (error, fallback) => {
    const message = String(error?.message || "").trim();
    if (/column\s+.+\s+does\s+not\s+exist/i.test(message)) {
      return "관리자 정보 항목을 확인할 수 없습니다. 데이터베이스 설정을 확인해주세요.";
    }
    return message || fallback;
  };

  const requireSuperAdmin = async () => {
    if (!client) throw new Error("Supabase 연결 정보가 필요합니다.");
    const { data } = await client.auth.getSession();
    state.session = data?.session || null;
    if (!state.session) {
      window.location.href = "login.html";
      return false;
    }

    const { data: profile, error } = await client
      .from("profiles")
      .select("role, admin_role, email")
      .eq("id", state.session.user.id)
      .maybeSingle();

    if (error) throw error;
    state.profile = profile;
    if (profile?.role !== "admin" || profile?.admin_role !== "super_admin") {
      await client.auth.signOut();
      window.location.href = "login.html";
      return false;
    }

    if (nodes.role) {
      const name = profile?.email || state.session.user.email || "관리자";
      nodes.role.textContent = name;
    }
    return true;
  };

  const fetchSpaces = async () => {
    const { data, error } = await client
      .from("space_reservations")
      .select("id, reservation_no, applicant_name, phone, birth_year, region, reservation_date, start_time, end_time, purpose, note, status, created_at, spaces(name)")
      .eq("status", "received")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  };

  const fetchPrograms = async () => {
    const { data, error } = await client
      .from("program_applications")
      .select("id, application_no, program_id, applicant_name, phone, birth_year, region, status, created_at, programs(title)")
      .in("status", ["completed", "waiting"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  };

  const fetchProgramCatalog = async () => {
    const { data, error } = await client
      .from("programs")
      .select("id, title, summary, content, image_url, place, instructor, target, capacity, start_date, end_date, apply_start_date, apply_end_date, status, visibility, operation_status, cancel_reason, canceled_at, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchAllProgramApplications = async () => {
    const { data, error } = await client
      .from("program_applications")
      .select("id, application_no, program_id, applicant_name, phone, birth_year, region, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data || [];
  };

  const fetchInquiryCount = async () => {
    const { count, error } = await client
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["received", "checking"]);

    if (error) throw error;
    return Number(count || 0);
  };

  const keepVisibleSelections = () => {
    const spaceIds = new Set(state.spaces.map((item) => String(item.id)));
    const programIds = new Set(state.programs.map((item) => String(item.id)));

    [...state.selectedSpaces].forEach((id) => {
      if (!spaceIds.has(id)) state.selectedSpaces.delete(id);
    });
    [...state.selectedPrograms].forEach((id) => {
      if (!programIds.has(id)) state.selectedPrograms.delete(id);
    });
  };

  const getTotalPages = (items, pageSize) => Math.max(1, Math.ceil(items.length / pageSize));

  const clampPage = (page, items, pageSize) => Math.min(Math.max(1, page), getTotalPages(items, pageSize));

  const getPagedItems = (items, page, pageSize) => {
    const currentPage = clampPage(page, items, pageSize);
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const getFilteredSpaces = () => {
    const keyword = state.spaceApprovalKeyword.trim().toLowerCase();
    if (!keyword) return state.spaces;

    const keywordDigits = keyword.replace(/\D/g, "");
    return state.spaces.filter((item) => {
      const spaceName = getRelationValue(item.spaces, "name") || "";
      const haystack = `${spaceName} ${item.applicant_name || ""} ${item.phone || ""}`.toLowerCase();
      const phoneDigits = String(item.phone || "").replace(/\D/g, "");
      return haystack.includes(keyword) || (keywordDigits && phoneDigits.includes(keywordDigits));
    });
  };

  const getVisibleSpaces = () => getPagedItems(getFilteredSpaces(), state.spacePage, state.spacePageSize);

  const getFilteredPrograms = () => {
    const keyword = state.programApprovalKeyword.trim().toLowerCase();
    if (!keyword) return state.programs;

    const keywordDigits = keyword.replace(/\D/g, "");
    return state.programs.filter((item) => {
      const programTitle = getRelationValue(item.programs, "title") || "";
      const haystack = `${programTitle} ${item.applicant_name || ""} ${item.phone || ""}`.toLowerCase();
      const phoneDigits = String(item.phone || "").replace(/\D/g, "");
      return haystack.includes(keyword) || (keywordDigits && phoneDigits.includes(keywordDigits));
    });
  };

  const getVisiblePrograms = () => getPagedItems(getFilteredPrograms(), state.programPage, state.programPageSize);

  const getProgramManageYear = (program) => {
    const source = program.apply_start_date || program.start_date || program.created_at;
    const match = String(source || "").match(/^\d{4}/);
    return match ? Number(match[0]) : null;
  };

  const getProgramManageYears = () =>
    [...new Set(state.programCatalog.map(getProgramManageYear).filter(Boolean))].sort((a, b) => b - a);

  const syncProgramManageYearOptions = () => {
    if (!nodes.programManageYear) return;
    const currentValue = nodes.programManageYear.value || "all";
    const years = getProgramManageYears();
    nodes.programManageYear.innerHTML = `
      <option value="all">전체</option>
      <option value="current">올해</option>
      ${years.map((year) => `<option value="${year}">${year}년</option>`).join("")}
    `;
    nodes.programManageYear.value = [...nodes.programManageYear.options].some((option) => option.value === currentValue)
      ? currentValue
      : "all";
  };

  const readProgramManageFilters = () => ({
    status: nodes.programManageStatus?.value || DEFAULT_PROGRAM_FILTERS.status,
    runStatus: nodes.programManageRunStatus?.value || DEFAULT_PROGRAM_FILTERS.runStatus,
    target: nodes.programManageTarget?.value || DEFAULT_PROGRAM_FILTERS.target,
    yearValue: nodes.programManageYear?.value || DEFAULT_PROGRAM_FILTERS.yearValue,
    visibility: nodes.programManageVisibility?.value || DEFAULT_PROGRAM_FILTERS.visibility,
    operation: nodes.programManageOperation?.value || DEFAULT_PROGRAM_FILTERS.operation,
    keyword: (nodes.programManageKeyword?.value || "").trim().toLowerCase(),
  });

  const getFilteredProgramCatalog = () => {
    const filters = state.appliedProgramFilters || DEFAULT_PROGRAM_FILTERS;
    const status = filters.status || "all";
    const runStatus = filters.runStatus || "all";
    const target = filters.target || "all";
    const yearValue = filters.yearValue || "all";
    const visibility = filters.visibility || "all";
    const operation = filters.operation || "all";
    const keyword = (filters.keyword || "").trim().toLowerCase();
    const currentYear = new Date().getFullYear();
    const statusRank = { open: 0, scheduled: 1, closed: 2, finished: 3 };

    return state.programCatalog
      .filter((program) => {
        const programStatus = normalizedEducationStatus(program);
        const programYear = getProgramManageYear(program);
        const matchesStatus =
          status === "all" ||
          programStatus === status ||
          (status === "closed" && programStatus === "finished");
        const matchesRunStatus = runStatus === "all" || educationRunStatusValue(program) === runStatus;
        const matchesTarget = target === "all" || program.target === target;
        const matchesYear = yearValue === "all" || programYear === (yearValue === "current" ? currentYear : Number(yearValue));
        const matchesVisibility = visibility === "all" || programVisibilityValue(program) === visibility;
        const matchesOperation = operation === "all" || programOperationValue(program) === operation;
        const haystack = `${program.title} ${program.summary} ${program.content} ${program.place} ${program.instructor}`.toLowerCase();
        return matchesStatus && matchesRunStatus && matchesTarget && matchesYear && matchesVisibility && matchesOperation && (!keyword || haystack.includes(keyword));
      })
      .sort((a, b) => {
        const statusDiff = (statusRank[normalizedEducationStatus(a)] ?? 4) - (statusRank[normalizedEducationStatus(b)] ?? 4);
        if (statusDiff) return statusDiff;
        return String(b.apply_start_date || b.start_date || b.created_at || "").localeCompare(String(a.apply_start_date || a.start_date || a.created_at || ""));
      });
  };

  const syncPageControls = () => {
    const filteredSpaces = getFilteredSpaces();
    const filteredPrograms = getFilteredPrograms();
    state.spacePage = clampPage(state.spacePage, filteredSpaces, state.spacePageSize);
    state.programPage = clampPage(state.programPage, filteredPrograms, state.programPageSize);

    const update = (items, page, pageSize, prevButton, nextButton, infoNode, selectNode) => {
      const totalPages = getTotalPages(items, pageSize);
      if (infoNode) infoNode.textContent = `${page} / ${totalPages}`;
      if (prevButton) prevButton.disabled = page <= 1;
      if (nextButton) nextButton.disabled = page >= totalPages;
      if (selectNode) selectNode.value = String(pageSize);
    };

    update(filteredSpaces, state.spacePage, state.spacePageSize, nodes.spacePagePrev, nodes.spacePageNext, nodes.spacePageInfo, nodes.spacePageSize);
    update(filteredPrograms, state.programPage, state.programPageSize, nodes.programPagePrev, nodes.programPageNext, nodes.programPageInfo, nodes.programPageSize);
  };

  const applySpaceApprovalSearch = () => {
    state.spaceApprovalKeyword = (nodes.spaceApprovalKeyword?.value || "").trim().toLowerCase();
    state.spacePage = 1;
    renderAll();
  };

  const applyProgramApprovalSearch = () => {
    state.programApprovalKeyword = (nodes.programApprovalKeyword?.value || "").trim().toLowerCase();
    state.programPage = 1;
    renderAll();
  };

  const applyProgramManageFilters = () => {
    state.appliedProgramFilters = readProgramManageFilters();
    state.programManagePage = 1;
    renderProgramManagement();
  };

  const resetProgramManageFilters = () => {
    if (nodes.programManageKeyword) nodes.programManageKeyword.value = DEFAULT_PROGRAM_FILTERS.keyword;
    if (nodes.programManageStatus) nodes.programManageStatus.value = DEFAULT_PROGRAM_FILTERS.status;
    if (nodes.programManageRunStatus) nodes.programManageRunStatus.value = DEFAULT_PROGRAM_FILTERS.runStatus;
    if (nodes.programManageTarget) nodes.programManageTarget.value = DEFAULT_PROGRAM_FILTERS.target;
    if (nodes.programManageYear) nodes.programManageYear.value = DEFAULT_PROGRAM_FILTERS.yearValue;
    if (nodes.programManageVisibility) nodes.programManageVisibility.value = DEFAULT_PROGRAM_FILTERS.visibility;
    if (nodes.programManageOperation) nodes.programManageOperation.value = DEFAULT_PROGRAM_FILTERS.operation;
    state.appliedProgramFilters = { ...DEFAULT_PROGRAM_FILTERS };
    state.programManagePage = 1;
    renderProgramManagement();
  };

  const syncBulkControls = () => {
    const update = (visibleItems, selected, selectAll, countNode, approveButton) => {
      const visibleIds = visibleItems.map((item) => String(item.id));
      const total = visibleIds.length;
      const selectedCount = selected.size;
      if (countNode) countNode.textContent = `${selectedCount}건 선택`;
      if (approveButton) approveButton.disabled = selectedCount === 0;
      if (selectAll) {
        selectAll.disabled = total === 0;
        const selectedVisibleCount = visibleIds.filter((id) => selected.has(id)).length;
        selectAll.checked = total > 0 && selectedVisibleCount === total;
        selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < total;
      }
    };

    update(getVisibleSpaces(), state.selectedSpaces, nodes.spaceSelectAll, nodes.spaceSelectedCount, nodes.spaceBulkApprove);
    update(getVisiblePrograms(), state.selectedPrograms, nodes.programSelectAll, nodes.programSelectedCount, nodes.programBulkApprove);
  };

  const renderSpaces = () => {
    if (!nodes.spaceList) return;
    const filteredSpaces = getFilteredSpaces();
    if (!state.spaces.length) {
      setTableMessage(nodes.spaceList, "승인 대기 중인 공간예약이 없습니다.");
      return;
    }

    if (!filteredSpaces.length) {
      setTableMessage(nodes.spaceList, "검색어에 맞는 공간예약이 없습니다.");
      return;
    }

    nodes.spaceList.innerHTML = getVisibleSpaces()
      .map((item) => {
        const id = String(item.id);
        const spaceName = displayValue(getRelationValue(item.spaces, "name") || "공간");
        const reservationDate = `${formatDate(item.reservation_date)} ${formatTimeRange(item.start_time, item.end_time)}`;
        return `
          <tr data-space-row="${escapeHtml(id)}">
            <td class="admin-select-cell">
              <input class="admin-row-check" type="checkbox" aria-label="${escapeHtml(spaceName)} 예약 선택" data-space-select="${escapeHtml(id)}"${state.selectedSpaces.has(id) ? " checked" : ""}>
            </td>
            <td>
              <button class="admin-detail-link" type="button" data-space-detail="${escapeHtml(id)}">${escapeHtml(spaceName)}</button>
            </td>
            <td>${escapeHtml(displayValue(item.applicant_name))}</td>
            <td>${escapeHtml(displayValue(item.phone))}</td>
            <td>${escapeHtml(reservationDate)}</td>
            <td>
              <div class="admin-approval-actions">
                <button type="button" data-space-approve="${escapeHtml(id)}">승인</button>
                <button type="button" data-space-reject="${escapeHtml(id)}">반려</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderPrograms = () => {
    if (!nodes.programList) return;
    if (!state.programs.length) {
      setTableMessage(nodes.programList, "승인 대기 중인 교육신청이 없습니다.");
      return;
    }

    const filteredPrograms = getFilteredPrograms();
    if (!filteredPrograms.length) {
      setTableMessage(nodes.programList, "검색어에 맞는 교육신청이 없습니다.");
      return;
    }

    nodes.programList.innerHTML = getVisiblePrograms()
      .map((item) => {
        const id = String(item.id);
        const programTitle = displayValue(getRelationValue(item.programs, "title") || "프로그램");
        return `
          <tr data-program-row="${escapeHtml(id)}">
            <td class="admin-select-cell">
              <input class="admin-row-check" type="checkbox" aria-label="${escapeHtml(programTitle)} 신청 선택" data-program-select="${escapeHtml(id)}"${state.selectedPrograms.has(id) ? " checked" : ""}>
            </td>
            <td>
              <button class="admin-detail-link" type="button" data-program-detail="${escapeHtml(id)}">${escapeHtml(programTitle)}</button>
            </td>
            <td>${escapeHtml(displayValue(item.applicant_name))}</td>
            <td>${escapeHtml(displayValue(item.phone))}</td>
            <td>${escapeHtml(formatDate(item.created_at))}</td>
            <td>
              <div class="admin-approval-actions">
                <button type="button" data-program-approve="${escapeHtml(id)}">승인</button>
                <button type="button" data-program-cancel="${escapeHtml(id)}">취소</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const getProgramStats = (programId) => {
    const applications = state.allProgramApplications.filter((item) => String(item.program_id) === String(programId));
    const countByStatus = (status) => applications.filter((item) => item.status === status).length;
    const total = applications.length;
    const approved = countByStatus("approved");
    return {
      total,
      completed: countByStatus("completed"),
      waiting: countByStatus("waiting"),
      approved,
      canceled: countByStatus("canceled"),
    };
  };

  const renderProgramStatusList = () => {
    if (!nodes.programStatusList) return;
    syncProgramManageYearOptions();
    if (!state.programCatalog.length) {
      nodes.programStatusList.innerHTML = '<article class="empty-state"><strong>등록된 교육이 없습니다.</strong><p>아래 입력란에서 첫 교육을 등록하세요.</p></article>';
      if (nodes.programManageResult) nodes.programManageResult.textContent = "등록된 교육이 없습니다.";
      return;
    }

    const filteredPrograms = getFilteredProgramCatalog();
    state.programManagePage = clampPage(state.programManagePage, filteredPrograms, state.programManagePageSize);
    const visiblePrograms = getPagedItems(filteredPrograms, state.programManagePage, state.programManagePageSize);
    const totalPages = getTotalPages(filteredPrograms, state.programManagePageSize);

    if (nodes.programManagePageInfo) nodes.programManagePageInfo.textContent = `${state.programManagePage} / ${totalPages}`;
    if (nodes.programManagePagePrev) nodes.programManagePagePrev.disabled = state.programManagePage <= 1;
    if (nodes.programManagePageNext) nodes.programManagePageNext.disabled = state.programManagePage >= totalPages;
    if (nodes.programManagePageSize) nodes.programManagePageSize.value = String(state.programManagePageSize);
    if (nodes.programManageResult) {
      nodes.programManageResult.textContent = filteredPrograms.length
        ? `총 ${filteredPrograms.length}개 교육 중 ${visiblePrograms.length}개를 보여드립니다.`
        : "조건에 맞는 교육이 없습니다.";
    }

    if (!filteredPrograms.length) {
      nodes.programStatusList.innerHTML = '<article class="empty-state"><strong>조건에 맞는 교육이 없습니다.</strong><p>모집상태, 수업상태, 대상, 수업연도, 검색어를 다시 확인해주세요.</p></article>';
      return;
    }

    const rows = visiblePrograms
      .map((program) => {
        const stats = getProgramStats(program.id);
        const programStatus = normalizedEducationStatus(program);
        const visibility = programVisibilityValue(program);
        const operationStatus = programOperationValue(program);
        const selected = String(state.selectedProgramId || "") === String(program.id);
        return `
          <tr class="${selected ? "is-selected" : ""}">
            <td><span class="admin-status-badge ${programOperationClass(operationStatus)}">${escapeHtml(programOperationLabel(operationStatus))}</span></td>
            <td><span class="admin-status-badge ${programVisibilityClass(visibility)}">${escapeHtml(programVisibilityLabel(visibility))}</span></td>
            <td class="admin-program-title-cell">
              <button type="button" data-program-manage-select="${escapeHtml(program.id)}" aria-pressed="${selected ? "true" : "false"}">${escapeHtml(program.title)}</button>
              <span>${escapeHtml(displayValue(program.summary || program.content))}</span>
              ${operationStatus === "canceled" && program.cancel_reason ? `<em>${escapeHtml(program.cancel_reason)}</em>` : ""}
            </td>
            <td><span class="admin-status-badge ${educationStatusClass(programStatus)}">${escapeHtml(educationStatusLabel(programStatus))}</span></td>
            <td>${escapeHtml(formatDateRange(program.apply_start_date, program.apply_end_date))}</td>
            <td><span class="admin-status-badge ${educationRunStatusClass(program)}">${escapeHtml(educationRunStatusLabel(program))}</span></td>
            <td>${escapeHtml(formatDateRange(program.start_date, program.end_date))}</td>
            <td>${escapeHtml(program.capacity)}</td>
            <td class="admin-program-stats-cell">
              <div class="admin-program-stats-row">
                <span>신청 ${stats.total}</span>
                <span>승인 ${stats.approved}</span>
              </div>
              <div class="admin-program-stats-row">
                <span>대기 ${stats.waiting + stats.completed}</span>
                <span>취소 ${stats.canceled}</span>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    nodes.programStatusList.innerHTML = `
      <div class="admin-program-list-wrap">
        <table class="admin-program-list-table" aria-label="교육 관리 목록">
          <colgroup>
            <col class="admin-program-col-operation">
            <col class="admin-program-col-visibility">
            <col class="admin-program-col-title">
            <col class="admin-program-col-status">
            <col class="admin-program-col-apply">
            <col class="admin-program-col-run">
            <col class="admin-program-col-period">
            <col class="admin-program-col-capacity">
            <col class="admin-program-col-stats">
          </colgroup>
          <thead>
            <tr>
              <th scope="col">운영상태</th>
              <th scope="col">노출상태</th>
              <th scope="col">교육명</th>
              <th scope="col">모집상태</th>
              <th scope="col">모집기간</th>
              <th scope="col">수업상태</th>
              <th scope="col">수업기간</th>
              <th scope="col">정원</th>
              <th scope="col">신청현황</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  const getSelectedProgramApplications = () => {
    if (!state.selectedProgramId) return [];
    return state.allProgramApplications.filter((item) => String(item.program_id) === String(state.selectedProgramId));
  };

  const renderSelectedProgramApplicants = () => {
    if (!nodes.programSelectedApplicants) return;
    const selectedProgram = state.programCatalog.find((item) => String(item.id) === String(state.selectedProgramId));
    if (!state.selectedProgramId || !selectedProgram) {
      if (nodes.programSelectedGuide) {
        nodes.programSelectedGuide.textContent = "교육명을 클릭하면 교육 수정과 교육생 모집현황을 함께 확인할 수 있습니다.";
      }
      nodes.programSelectedApplicants.innerHTML = '<article class="empty-state"><strong>교육을 선택해주세요.</strong><p>교육명을 클릭하면 신청자 목록과 승인/취소 버튼이 여기에 표시됩니다.</p></article>';
      return;
    }

    const applications = getSelectedProgramApplications();
    state.selectedProgramApplicantPage = clampPage(state.selectedProgramApplicantPage, applications, state.selectedProgramApplicantPageSize);
    const visibleApplications = getPagedItems(applications, state.selectedProgramApplicantPage, state.selectedProgramApplicantPageSize);
    const totalPages = getTotalPages(applications, state.selectedProgramApplicantPageSize);
    const stats = getProgramStats(selectedProgram.id);
    if (nodes.programSelectedGuide) {
      nodes.programSelectedGuide.textContent = `${selectedProgram.title} 신청 ${stats.total}건 · 승인 ${stats.approved}건 · 대기 ${stats.waiting + stats.completed}건 · 취소 ${stats.canceled}건`;
    }

    if (!applications.length) {
      nodes.programSelectedApplicants.innerHTML = '<article class="empty-state"><strong>아직 신청자가 없습니다.</strong><p>교육 정보는 위 입력란에서 수정할 수 있습니다.</p></article>';
      return;
    }

    nodes.programSelectedApplicants.innerHTML = `
      <div class="admin-program-applicants-head">
        <h4>교육생 모집현황</h4>
        <label>목록
          <select data-selected-program-applicant-page-size>
            ${APPLICANT_PAGE_SIZE_OPTIONS.map((size) => `<option value="${size}"${state.selectedProgramApplicantPageSize === size ? " selected" : ""}>${size}줄보기</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="admin-applicant-table-wrap">
        <table class="admin-applicant-table">
          <thead>
            <tr>
              <th>신청번호</th>
              <th>이름</th>
              <th>연락처</th>
              <th>출생연도</th>
              <th>주소</th>
              <th>상태</th>
              <th>신청일</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            ${visibleApplications
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(displayValue(item.application_no))}</td>
                    <td>${escapeHtml(displayValue(item.applicant_name))}</td>
                    <td>${escapeHtml(displayValue(item.phone))}</td>
                    <td>${escapeHtml(displayValue(item.birth_year))}</td>
                    <td>${escapeHtml(displayValue(item.region))}</td>
                    <td><span class="status ${statusClass(programStatusLabel(item.status))}">${escapeHtml(programStatusLabel(item.status))}</span></td>
                    <td>${escapeHtml(formatDate(item.created_at))}</td>
                    <td>
                      <div class="admin-approval-actions">
                        <button type="button" data-selected-program-approve="${escapeHtml(item.id)}"${item.status === "approved" ? " disabled" : ""}>승인</button>
                        <button type="button" data-selected-program-cancel="${escapeHtml(item.id)}"${item.status === "canceled" ? " disabled" : ""}>취소</button>
                      </div>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="admin-program-page-nav admin-program-applicant-page-nav" aria-label="선택 교육 신청자 페이지 이동">
        <button type="button" data-selected-program-applicant-prev${state.selectedProgramApplicantPage <= 1 ? " disabled" : ""}>이전</button>
        <span>${state.selectedProgramApplicantPage} / ${totalPages}</span>
        <button type="button" data-selected-program-applicant-next${state.selectedProgramApplicantPage >= totalPages ? " disabled" : ""}>다음</button>
      </div>
    `;
  };

  const renderProgramManagement = () => {
    renderProgramStatusList();
    renderSelectedProgramApplicants();
  };

  const renderAll = () => {
    keepVisibleSelections();
    setCount(nodes.pendingSpace, state.spaces.length);
    setCount(nodes.pendingProgram, state.programs.length);
    setCount(nodes.pendingInquiry, state.inquiryCount);
    syncPageControls();
    renderSpaces();
    renderPrograms();
    renderProgramManagement();
    syncBulkControls();
  };

  const load = async () => {
    if (nodes.refresh) nodes.refresh.disabled = true;
    try {
      [state.spaces, state.programs, state.inquiryCount, state.programCatalog, state.allProgramApplications] = await Promise.all([
        fetchSpaces(),
        fetchPrograms(),
        fetchInquiryCount(),
        fetchProgramCatalog(),
        fetchAllProgramApplications(),
      ]);
      renderAll();
    } catch (error) {
      showMessage(friendlyErrorMessage(error, "처리할 목록을 불러오지 못했습니다."), true);
    } finally {
      if (nodes.refresh) nodes.refresh.disabled = false;
    }
  };

  const activateTab = (targetName) => {
    dashboard.querySelectorAll("[data-admin-tab]").forEach((tab) => {
      const isActive = tab.dataset.adminTab === targetName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    dashboard.querySelectorAll("[data-admin-panel]").forEach((panel) => {
      const isActive = panel.dataset.adminPanel === targetName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  const jumpToTab = (targetName) => {
    activateTab(targetName);
    const section = dashboard.querySelector("#approval-tabs") || dashboard.querySelector("[data-admin-panel].is-active");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateSpaces = async (ids, status) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const payload = {
      status,
      approved_by: state.session.user.id,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    };
    const { error } = await client.from("space_reservations").update(payload).in("id", idList);
    if (error) throw error;
    await logAdminAction(status === "approved" ? "approve" : "reject", "space_reservation", idList, status === "approved" ? "공간예약 승인" : "공간예약 반려");
  };

  const updatePrograms = async (ids, status) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const { error } = await client.from("program_applications").update({ status }).in("id", idList);
    if (error) throw error;
    await logAdminAction(status === "approved" ? "approve" : "cancel", "program_application", idList, status === "approved" ? "교육신청 승인" : "교육신청 취소");
  };

  const logAdminAction = async (actionType, targetType, ids, summary) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const logs = idList.map((id) => ({
      admin_id: state.session.user.id,
      action_type: actionType,
      target_type: targetType,
      target_id: id,
      summary,
    }));
    const { error } = await client.from("admin_logs").insert(logs);
    if (error) console.warn("Admin log failed:", error);
  };

  const getModalNodes = () => {
    let modal = document.querySelector("[data-admin-detail-modal]");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "admin-detail-modal";
      modal.dataset.adminDetailModal = "";
      modal.hidden = true;
      modal.innerHTML = `
        <div class="admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title">
          <div class="admin-detail-head">
            <div>
              <p class="eyebrow">상세 정보</p>
              <h3 id="admin-detail-title" data-admin-detail-title>상세 내용</h3>
            </div>
            <button class="admin-detail-close" type="button" aria-label="상세창 닫기" data-admin-detail-close>닫기</button>
          </div>
          <div class="admin-detail-body" data-admin-detail-content></div>
          <div class="admin-detail-actions">
            <button class="button primary" type="button" data-admin-detail-approve>승인</button>
            <button class="button tertiary" type="button" data-admin-detail-secondary>반려</button>
            <button class="button tertiary" type="button" data-admin-detail-close>닫기</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    return {
      modal,
      title: modal.querySelector("[data-admin-detail-title]"),
      content: modal.querySelector("[data-admin-detail-content]"),
      approve: modal.querySelector("[data-admin-detail-approve]"),
      secondary: modal.querySelector("[data-admin-detail-secondary]"),
    };
  };

  const renderDetailRows = (items) =>
    `<dl class="admin-detail-grid">${items
      .map(
        (item) => `
          <div class="${item.wide ? "admin-detail-wide" : ""}">
            <dt>${escapeHtml(item.label)}</dt>
            <dd>${escapeHtml(displayValue(item.value))}</dd>
          </div>
        `,
      )
      .join("")}</dl>`;

  const openSpaceDetail = (id) => {
    const item = state.spaces.find((entry) => String(entry.id) === String(id));
    if (!item) return;

    const spaceName = displayValue(getRelationValue(item.spaces, "name") || "공간");
    state.detail = { type: "space", id: String(item.id) };

    const modalNodes = getModalNodes();
    modalNodes.title.textContent = `${spaceName} 예약 상세`;
    modalNodes.content.innerHTML = renderDetailRows([
      { label: "예약번호", value: item.reservation_no },
      { label: "공간", value: spaceName },
      { label: "신청자", value: item.applicant_name },
      { label: "연락처", value: item.phone },
      { label: "출생연도", value: item.birth_year },
      { label: "주소", value: item.region },
      { label: "예약일", value: formatDate(item.reservation_date) },
      { label: "시간", value: formatTimeRange(item.start_time, item.end_time) },
      { label: "이용목적", value: item.purpose, wide: true },
      { label: "기타 메모", value: item.note, wide: true },
      { label: "접수일", value: formatDateTime(item.created_at) },
    ]);
    modalNodes.approve.textContent = "승인";
    modalNodes.secondary.textContent = "반려";
    modalNodes.approve.hidden = false;
    modalNodes.secondary.hidden = false;
    modalNodes.modal.hidden = false;
    modalNodes.modal.querySelector("[data-admin-detail-close]")?.focus();
  };

  const openProgramDetail = (id) => {
    const item = state.programs.find((entry) => String(entry.id) === String(id));
    if (!item) return;

    const programTitle = displayValue(getRelationValue(item.programs, "title") || "프로그램");
    state.detail = { type: "program", id: String(item.id) };

    const modalNodes = getModalNodes();
    modalNodes.title.textContent = `${programTitle} 신청 상세`;
    modalNodes.content.innerHTML = renderDetailRows([
      { label: "신청번호", value: item.application_no },
      { label: "프로그램명", value: programTitle },
      { label: "신청자", value: item.applicant_name },
      { label: "연락처", value: item.phone },
      { label: "출생연도", value: item.birth_year },
      { label: "주소", value: item.region },
      { label: "신청상태", value: programStatusLabel(item.status) },
      { label: "접수일", value: formatDateTime(item.created_at) },
    ]);
    modalNodes.approve.textContent = "승인";
    modalNodes.secondary.textContent = "취소";
    modalNodes.approve.hidden = false;
    modalNodes.secondary.hidden = false;
    modalNodes.modal.hidden = false;
    modalNodes.modal.querySelector("[data-admin-detail-close]")?.focus();
  };

  const closeDetail = () => {
    const modalNodes = getModalNodes();
    modalNodes.modal.hidden = true;
    state.detail = null;
  };

  const openProgramApplicants = async (programId) => {
    const program = state.programCatalog.find((item) => String(item.id) === String(programId));
    if (!program) return;
    const modalNodes = getModalNodes();
    modalNodes.title.textContent = `${program.title} 신청자 현황`;
    modalNodes.approve.hidden = true;
    modalNodes.secondary.hidden = true;
    state.detail = null;
    modalNodes.content.innerHTML = '<p class="admin-detail-loading">신청자 목록을 불러오고 있습니다.</p>';
    modalNodes.modal.hidden = false;

    try {
      const result = await callPublicSubmitFunction("program-applicants", { programId });
      const items = result?.items || [];
      modalNodes.content.innerHTML = items.length
        ? `
          <div class="admin-applicant-table-wrap">
            <table class="admin-applicant-table">
              <thead><tr><th>신청번호</th><th>이름</th><th>연락처</th><th>출생연도</th><th>주소</th><th>상태</th><th>신청일</th></tr></thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.applicationNo)}</td>
                        <td>${escapeHtml(item.applicantName)}</td>
                        <td>${escapeHtml(item.phone)}</td>
                        <td>${escapeHtml(item.birthYear)}</td>
                        <td>${escapeHtml(item.region)}</td>
                        <td><span class="status ${statusClass(item.statusLabel)}">${escapeHtml(item.statusLabel)}</span></td>
                        <td>${escapeHtml(formatDate(item.createdAt))}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        : '<article class="empty-state"><strong>아직 신청자가 없습니다.</strong></article>';
    } catch (error) {
      modalNodes.content.innerHTML = `<p class="is-error">${escapeHtml(friendlyErrorMessage(error, "신청자 목록을 불러오지 못했습니다."))}</p>`;
    }
  };

  const syncProgramCancelReason = (form) => {
    const wrap = form?.querySelector(".admin-program-cancel-reason");
    if (!wrap || !form?.elements.operationStatus) return;
    const isCanceled = form.elements.operationStatus.value === "canceled";
    wrap.hidden = !isCanceled;
    if (isCanceled) {
      if (form.elements.status) form.elements.status.value = "closed";
      if (form.elements.visibility) form.elements.visibility.value = "private";
    }
    if (form.elements.cancelReason) {
      form.elements.cancelReason.required = isCanceled;
      if (!isCanceled) form.elements.cancelReason.value = "";
    }
  };

  const resetProgramForm = (options = {}) => {
    if (!nodes.programManageForm) return;
    state.selectedProgramId = null;
    state.selectedProgramApplicantPage = 1;
    nodes.programManageForm.reset();
    nodes.programManageForm.elements.id.value = "";
    nodes.programManageForm.elements.imageUrl.value = "";
    if (nodes.programManageForm.elements.imageFile) nodes.programManageForm.elements.imageFile.value = "";
    if (nodes.programManageForm.elements.visibility) nodes.programManageForm.elements.visibility.value = "private";
    if (nodes.programManageForm.elements.operationStatus) nodes.programManageForm.elements.operationStatus.value = "normal";
    syncProgramCancelReason(nodes.programManageForm);
    renderProgramImagePreview(nodes.programManageForm, "");
    setFormStatus(nodes.programManageForm, "");
    const submit = nodes.programManageForm.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "수정하기";
    if (options.render !== false) renderProgramManagement();
  };

  const fillProgramForm = (programId, options = {}) => {
    if (!nodes.programManageForm) return;
    const item = state.programCatalog.find((entry) => String(entry.id) === String(programId));
    if (!item) return;
    state.selectedProgramId = String(item.id);
    state.selectedProgramApplicantPage = 1;
    const form = nodes.programManageForm;
    form.elements.id.value = item.id || "";
    form.elements.title.value = item.title || "";
    form.elements.target.value = item.target || "전체";
    form.elements.capacity.value = item.capacity || "";
    form.elements.status.value = item.status === "finished" ? "closed" : item.status || "scheduled";
    if (form.elements.visibility) form.elements.visibility.value = programVisibilityValue(item);
    if (form.elements.operationStatus) form.elements.operationStatus.value = programOperationValue(item);
    if (form.elements.cancelReason) form.elements.cancelReason.value = item.cancel_reason || "";
    syncProgramCancelReason(form);
    form.elements.applyStartDate.value = item.apply_start_date || "";
    form.elements.applyEndDate.value = item.apply_end_date || "";
    form.elements.startDate.value = item.start_date || "";
    form.elements.endDate.value = item.end_date || "";
    form.elements.place.value = item.place || "";
    form.elements.instructor.value = item.instructor || "";
    form.elements.imageUrl.value = item.image_url || "";
    if (form.elements.imageFile) form.elements.imageFile.value = "";
    renderProgramImagePreview(form, item.image_url || "");
    form.elements.summary.value = item.summary || "";
    form.elements.content.value = item.content || "";
    setFormStatus(form, "수정할 교육을 불러왔습니다.");
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "수정하기";
    if (options.render !== false) renderProgramManagement();
    if (options.scroll !== false) form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveProgramFromForm = async (form) => {
    let imageUrl = form.elements.imageUrl.value.trim();
    const imageFile = form.elements.imageFile?.files?.[0] || null;
    const payload = {
      id: form.elements.id.value.trim(),
      title: form.elements.title.value.trim(),
      target: form.elements.target.value,
      capacity: Number(form.elements.capacity.value),
      status: form.elements.status.value,
      visibility: form.elements.visibility ? form.elements.visibility.value : "private",
      operationStatus: form.elements.operationStatus ? form.elements.operationStatus.value : "normal",
      cancelReason: form.elements.cancelReason ? form.elements.cancelReason.value.trim() : "",
      applyStartDate: form.elements.applyStartDate.value,
      applyEndDate: form.elements.applyEndDate.value,
      startDate: form.elements.startDate.value,
      endDate: form.elements.endDate.value,
      place: form.elements.place.value.trim(),
      instructor: form.elements.instructor.value.trim(),
      imageUrl,
      summary: form.elements.summary.value.trim(),
      content: form.elements.content.value.trim(),
    };
    if (!payload.title || !payload.capacity || !payload.applyStartDate || !payload.applyEndDate || !payload.startDate || !payload.endDate || !payload.place || !payload.content) {
      setFormStatus(form, "프로그램명, 정원, 날짜, 장소, 상세내용을 입력해주세요.", true);
      return;
    }
    if (payload.operationStatus === "canceled" && !payload.cancelReason) {
      setFormStatus(form, "취소된 교육은 취소사유를 입력해주세요.", true);
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      if (imageFile) {
        setFormStatus(form, "대표 이미지를 업로드하고 있습니다.");
        imageUrl = await uploadProgramImage(imageFile, payload.id);
        payload.imageUrl = imageUrl;
        form.elements.imageUrl.value = imageUrl;
        form.elements.imageFile.value = "";
        renderProgramImagePreview(form, imageUrl);
      }
      const result = await callPublicSubmitFunction("program-save", payload);
      state.selectedProgramId = String(result?.item?.id || payload.id || "");
      await load();
      if (state.selectedProgramId) fillProgramForm(state.selectedProgramId, { scroll: false, render: false });
      renderProgramManagement();
      setFormStatus(form, "교육 정보를 저장했습니다.");
    } catch (error) {
      setFormStatus(form, friendlyErrorMessage(error, "교육 정보를 저장하지 못했습니다."), true);
    } finally {
      submit.disabled = false;
    }
  };

  const hideOrRestoreProgram = async (programId, shouldRestore = false) => {
    const item = state.programCatalog.find((entry) => String(entry.id) === String(programId));
    if (!item) return;
    const message = shouldRestore ? "이 교육을 공개로 전환할까요?" : "이 교육을 비공개로 전환할까요?";
    if (!window.confirm(message)) return;
    await callPublicSubmitFunction(shouldRestore ? "program-restore" : "program-hide", { id: programId });
    await load();
  };

  const approveSelectedSpaces = async () => {
    const ids = [...state.selectedSpaces];
    if (!ids.length) return;
    if (!window.confirm(`선택한 공간예약 ${ids.length}건을 승인할까요?`)) return;
    await updateSpaces(ids, "approved");
    state.selectedSpaces.clear();
    await load();
  };

  const approveSelectedPrograms = async () => {
    const ids = [...state.selectedPrograms];
    if (!ids.length) return;
    if (!window.confirm(`선택한 교육신청 ${ids.length}건을 승인할까요?`)) return;
    await updatePrograms(ids, "approved");
    state.selectedPrograms.clear();
    await load();
  };

  const runAction = async (button, action) => {
    try {
      button.disabled = true;
      await action();
    } catch (error) {
      window.alert(friendlyErrorMessage(error, "처리 중 문제가 발생했습니다."));
    } finally {
      button.disabled = false;
      syncBulkControls();
    }
  };

  dashboard.addEventListener("change", (event) => {
    const target = event.target;

    if (target instanceof HTMLSelectElement && target.matches("[data-space-page-size]")) {
      const nextPageSize = Number(target.value);
      state.spacePageSize = PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 10;
      state.spacePage = 1;
      renderAll();
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("[data-program-page-size]")) {
      const nextPageSize = Number(target.value);
      state.programPageSize = PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 10;
      state.programPage = 1;
      renderAll();
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("[data-program-manage-page-size]")) {
      const nextPageSize = Number(target.value);
      state.programManagePageSize = PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 10;
      state.programManagePage = 1;
      renderProgramManagement();
      return;
    }

    if (target instanceof HTMLSelectElement && target.matches("[data-selected-program-applicant-page-size]")) {
      const nextPageSize = Number(target.value);
      state.selectedProgramApplicantPageSize = APPLICANT_PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 10;
      state.selectedProgramApplicantPage = 1;
      renderSelectedProgramApplicants();
      return;
    }

    if (target instanceof HTMLSelectElement && target.name === "operationStatus") {
      syncProgramCancelReason(target.closest("[data-program-manage-form]"));
      return;
    }

    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-space-select-all]")) {
      const visibleIds = getVisibleSpaces().map((item) => String(item.id));
      visibleIds.forEach((id) => {
        if (target.checked) state.selectedSpaces.add(id);
        else state.selectedSpaces.delete(id);
      });
      renderSpaces();
      syncBulkControls();
      return;
    }

    if (target.matches("[data-program-select-all]")) {
      const visibleIds = getVisiblePrograms().map((item) => String(item.id));
      visibleIds.forEach((id) => {
        if (target.checked) state.selectedPrograms.add(id);
        else state.selectedPrograms.delete(id);
      });
      renderPrograms();
      syncBulkControls();
      return;
    }

    const spaceId = target.dataset.spaceSelect;
    if (spaceId) {
      if (target.checked) state.selectedSpaces.add(spaceId);
      else state.selectedSpaces.delete(spaceId);
      syncBulkControls();
      return;
    }

    const programId = target.dataset.programSelect;
    if (programId) {
      if (target.checked) state.selectedPrograms.add(programId);
      else state.selectedPrograms.delete(programId);
      syncBulkControls();
    }
  });

  dashboard.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches("[data-space-approval-keyword]")) {
      applySpaceApprovalSearch();
      return;
    }
    if (target.matches("[data-program-approval-keyword]")) {
      applyProgramApprovalSearch();
    }
  });

  dashboard.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches("[data-space-approval-keyword]")) {
      event.preventDefault();
      applySpaceApprovalSearch();
      return;
    }
    if (target.matches("[data-program-approval-keyword]")) {
      event.preventDefault();
      applyProgramApprovalSearch();
      return;
    }
    if (target.matches("[data-program-manage-keyword]")) {
      event.preventDefault();
      applyProgramManageFilters();
    }
  });

  dashboard.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== "imageFile") return;
    const form = target.closest("[data-program-manage-form]");
    const file = target.files?.[0];
    if (!(form instanceof HTMLFormElement) || !file) return;
    if (!file.type.startsWith("image/")) {
      target.value = "";
      setFormStatus(form, "이미지 파일만 첨부할 수 있습니다.", true);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    renderProgramImagePreview(form, previewUrl);
  });

  dashboard.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tabButton = target.closest("[data-admin-tab]");
    if (tabButton instanceof HTMLElement) {
      const tabTarget = tabButton.dataset.adminTab;
      if (tabTarget) activateTab(tabTarget);
      return;
    }

    const pendingJump = target.closest("[data-pending-jump]");
    if (pendingJump instanceof HTMLElement) {
      const tabTarget = pendingJump.dataset.pendingJump;
      if (tabTarget) jumpToTab(tabTarget);
      return;
    }

    const refreshButton = target.closest("[data-admin-refresh]");
    if (refreshButton instanceof HTMLElement) {
      await load();
      return;
    }

    if (target.closest("[data-space-page-prev]")) {
      state.spacePage = clampPage(state.spacePage - 1, getFilteredSpaces(), state.spacePageSize);
      renderAll();
      return;
    }

    if (target.closest("[data-space-page-next]")) {
      state.spacePage = clampPage(state.spacePage + 1, getFilteredSpaces(), state.spacePageSize);
      renderAll();
      return;
    }

    if (target.closest("[data-program-page-prev]")) {
      state.programPage = clampPage(state.programPage - 1, getFilteredPrograms(), state.programPageSize);
      renderAll();
      return;
    }

    if (target.closest("[data-program-page-next]")) {
      state.programPage = clampPage(state.programPage + 1, getFilteredPrograms(), state.programPageSize);
      renderAll();
      return;
    }

    if (target.closest("[data-space-approval-search]")) {
      applySpaceApprovalSearch();
      return;
    }

    if (target.closest("[data-program-approval-search]")) {
      applyProgramApprovalSearch();
      return;
    }

    if (target.closest("[data-program-filter-apply]")) {
      applyProgramManageFilters();
      return;
    }

    if (target.closest("[data-program-filter-reset]")) {
      resetProgramManageFilters();
      return;
    }

    if (target.closest("[data-program-manage-page-prev]")) {
      const filteredPrograms = getFilteredProgramCatalog();
      state.programManagePage = clampPage(state.programManagePage - 1, filteredPrograms, state.programManagePageSize);
      renderProgramManagement();
      return;
    }

    if (target.closest("[data-program-manage-page-next]")) {
      const filteredPrograms = getFilteredProgramCatalog();
      state.programManagePage = clampPage(state.programManagePage + 1, filteredPrograms, state.programManagePageSize);
      renderProgramManagement();
      return;
    }

    const spaceDetail = target.closest("[data-space-detail]");
    if (spaceDetail instanceof HTMLElement) {
      openSpaceDetail(spaceDetail.dataset.spaceDetail);
      return;
    }

    const programDetail = target.closest("[data-program-detail]");
    if (programDetail instanceof HTMLElement) {
      openProgramDetail(programDetail.dataset.programDetail);
      return;
    }

    const programSelect = target.closest("[data-program-manage-select]");
    if (programSelect instanceof HTMLElement) {
      fillProgramForm(programSelect.dataset.programManageSelect);
      return;
    }

    if (target.closest("[data-selected-program-applicant-prev]")) {
      state.selectedProgramApplicantPage = Math.max(1, state.selectedProgramApplicantPage - 1);
      renderSelectedProgramApplicants();
      return;
    }

    if (target.closest("[data-selected-program-applicant-next]")) {
      state.selectedProgramApplicantPage = clampPage(state.selectedProgramApplicantPage + 1, getSelectedProgramApplications(), state.selectedProgramApplicantPageSize);
      renderSelectedProgramApplicants();
      return;
    }

    if (target.closest("[data-program-form-reset]")) {
      resetProgramForm();
      return;
    }

    const imageClear = target.closest("[data-program-image-clear]");
    if (imageClear instanceof HTMLButtonElement) {
      const form = imageClear.closest("[data-program-manage-form]");
      if (form instanceof HTMLFormElement) {
        form.elements.imageUrl.value = "";
        if (form.elements.imageFile) form.elements.imageFile.value = "";
        renderProgramImagePreview(form, "");
        setFormStatus(form, "대표 이미지를 제거했습니다. 저장하면 기본 이미지로 표시됩니다.");
      }
      return;
    }

    const selectedProgramApprove = target.closest("[data-selected-program-approve]");
    if (selectedProgramApprove instanceof HTMLButtonElement) {
      const id = selectedProgramApprove.dataset.selectedProgramApprove;
      await runAction(selectedProgramApprove, async () => {
        await updatePrograms(id, "approved");
        await load();
      });
      return;
    }

    const selectedProgramCancel = target.closest("[data-selected-program-cancel]");
    if (selectedProgramCancel instanceof HTMLButtonElement) {
      const id = selectedProgramCancel.dataset.selectedProgramCancel;
      await runAction(selectedProgramCancel, async () => {
        if (!window.confirm("이 교육신청을 취소 처리할까요?")) return;
        await updatePrograms(id, "canceled");
        await load();
      });
      return;
    }

    const actionButton = target.closest(
      "[data-space-approve], [data-space-reject], [data-program-approve], [data-program-cancel], [data-space-bulk-approve], [data-program-bulk-approve]",
    );
    if (!(actionButton instanceof HTMLButtonElement)) return;

    const spaceApprove = actionButton.dataset.spaceApprove;
    const spaceReject = actionButton.dataset.spaceReject;
    const programApprove = actionButton.dataset.programApprove;
    const programCancel = actionButton.dataset.programCancel;

    await runAction(actionButton, async () => {
      if (actionButton.matches("[data-space-bulk-approve]")) {
        await approveSelectedSpaces();
      } else if (actionButton.matches("[data-program-bulk-approve]")) {
        await approveSelectedPrograms();
      } else if (spaceApprove) {
        await updateSpaces(spaceApprove, "approved");
        state.selectedSpaces.delete(spaceApprove);
        await load();
      } else if (spaceReject && window.confirm("이 공간예약을 반려할까요?")) {
        await updateSpaces(spaceReject, "rejected");
        state.selectedSpaces.delete(spaceReject);
        await load();
      } else if (programApprove) {
        await updatePrograms(programApprove, "approved");
        state.selectedPrograms.delete(programApprove);
        await load();
      } else if (programCancel && window.confirm("이 교육신청을 취소 처리할까요?")) {
        await updatePrograms(programCancel, "canceled");
        state.selectedPrograms.delete(programCancel);
        await load();
      }
    });
  });

  dashboard.addEventListener("submit", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-program-manage-form]")) return;
    event.preventDefault();
    await saveProgramFromForm(target);
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const modalNodes = getModalNodes();
    if (target === modalNodes.modal || target.closest("[data-admin-detail-close]")) {
      closeDetail();
      return;
    }

    const approveButton = target.closest("[data-admin-detail-approve]");
    if (approveButton instanceof HTMLButtonElement && state.detail) {
      await runAction(approveButton, async () => {
        if (state.detail.type === "space") {
          await updateSpaces(state.detail.id, "approved");
          state.selectedSpaces.delete(state.detail.id);
        } else {
          await updatePrograms(state.detail.id, "approved");
          state.selectedPrograms.delete(state.detail.id);
        }
        closeDetail();
        await load();
      });
      return;
    }

    const secondaryButton = target.closest("[data-admin-detail-secondary]");
    if (secondaryButton instanceof HTMLButtonElement && state.detail) {
      const isSpace = state.detail.type === "space";
      const message = isSpace ? "이 공간예약을 반려할까요?" : "이 교육신청을 취소 처리할까요?";
      if (!window.confirm(message)) return;
      await runAction(secondaryButton, async () => {
        if (isSpace) {
          await updateSpaces(state.detail.id, "rejected");
          state.selectedSpaces.delete(state.detail.id);
        } else {
          await updatePrograms(state.detail.id, "canceled");
          state.selectedPrograms.delete(state.detail.id);
        }
        closeDetail();
        await load();
      });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modal = document.querySelector("[data-admin-detail-modal]");
    if (modal && !modal.hidden) closeDetail();
  });

  const init = async () => {
    const allowed = await requireSuperAdmin();
    if (!allowed) return;
    await load();
  };

  init().catch((error) => {
    showMessage(friendlyErrorMessage(error, "관리자페이지를 준비하지 못했습니다."), true);
  });
})();

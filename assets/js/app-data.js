(() => {
  const SPACE_SLUGS = {
    공유주방: "kitchen",
    대회의실: "main-hall",
    강의실: "classroom",
    소회의실: "small-meeting",
    청소년활동실: "youth-room",
    미디어스튜디오: "media-studio",
  };

  const STATUS = {
    space: {
      received: "접수",
      approved: "승인",
      rejected: "반려",
      canceled: "취소",
    },
    program: {
      completed: "신청완료",
      waiting: "대기",
      approved: "승인",
      canceled: "취소",
    },
  };

  const INQUIRY_STATUS = {
    received: "접수",
    checking: "확인중",
    answered: "답변완료",
  };

  const getSupabaseClient = () => {
    const config = window.KKOOM_SUPABASE || {};
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  const getSupabaseConfig = () => {
    const config = window.KKOOM_SUPABASE || {};
    return config.url && config.anonKey ? config : null;
  };

  const callPublicSubmitFunction = async (action, payload) => {
    const config = getSupabaseConfig();
    if (!config) return null;

    const response = await window.fetch(`${config.url}/functions/v1/public-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Supabase 서버 함수 처리 중 문제가 발생했습니다.");
    }
    return result;
  };

  const loadExternalStyle = (id, href) =>
    new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });

  const loadExternalScript = (id, src) =>
    new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const createId = (prefix) => {
    const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
    const token = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${token}`;
  };

  const statusClass = (status) => {
    if (["승인", "승인완료", "접수", "접수완료", "신청완료"].includes(status)) return "open";
    if (["승인대기", "확인중", "대기"].includes(status)) return "ongoing";
    return "closed";
  };

  const getStatusLabel = (type, value) => STATUS[type]?.[value] || value || "-";

  const getInquiryStatusLabel = (value) => INQUIRY_STATUS[value] || value || "-";

  const getProgramStatusLabel = (value) => {
    if (value === "open") return "접수중";
    if (value === "closed") return "접수마감";
    if (value === "finished") return "종료";
    return "접수예정";
  };

  const getProgramRunStatus = (program) => {
    const now = new Date();
    const start = program.startDate ? new Date(`${program.startDate}T00:00:00`) : null;
    const end = program.endDate ? new Date(`${program.endDate}T23:59:59`) : null;
    if (end && now > end) return "finished";
    if (start && now < start) return "upcoming";
    return "ongoing";
  };

  const getProgramRunStatusLabel = (program) => {
    const value = getProgramRunStatus(program);
    if (value === "finished") return "종료";
    if (value === "ongoing") return "진행중";
    return "진행예정";
  };

  const isCurrentProgram = (program) => {
    if (program.operationStatus === "canceled" || program.visibility !== "public") return false;
    if (getProgramRunStatus(program) === "finished") return false;
    if (program.status === "open" || program.status === "scheduled") return true;
    return program.status === "closed" && getProgramRunStatus(program) !== "finished";
  };

  const isArchiveProgram = (program) =>
    program.operationStatus !== "canceled" &&
    program.visibility === "public" &&
    getProgramRunStatus(program) === "finished";

  const getProgramYear = (program) => {
    const source = program.startDate || program.applyStartDate || "";
    const year = Number(String(source).slice(0, 4));
    return Number.isInteger(year) ? year : null;
  };

  const programStatusClass = (value) => {
    if (value === "open") return "ongoing";
    if (value === "scheduled") return "open";
    return "closed";
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10).replaceAll("-", ".") : text;
  };

  const formatDateRange = (start, end) => {
    const startText = formatDate(start);
    const endText = formatDate(end);
    if (startText === "-" && endText === "-") return "-";
    if (startText === endText) return startText;
    return `${startText} - ${endText}`;
  };

  const formatTime = (value) => {
    if (!value) return "-";
    const text = String(value);
    return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text;
  };

  const formatTimeRange = (start, end) => {
    const startText = formatTime(start);
    const endText = formatTime(end);
    if (startText === "-" && endText === "-") return "-";
    if (startText === endText) return startText;
    return `${startText} - ${endText}`;
  };

  const formatAdminDate = (value) => {
    if (!value) return "-";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(5, 10).replace("-", ".");
    return text;
  };

  const displayValue = (value) => {
    const text = String(value ?? "").trim();
    return text || "-";
  };

  const fieldValue = (form, name) => form.elements[name]?.value?.trim() || "";

  const setFormStatus = (form, message, isError = false) => {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const getLookupPassword = (value, phone) => value || phone;

  const getSession = async (client) => {
    const { data } = await client.auth.getSession();
    return data?.session || null;
  };

  const findSpaceId = async (client, spaceName) => {
    const slug = SPACE_SLUGS[spaceName];
    const query = client.from("spaces").select("id").limit(1);
    const { data, error } = slug
      ? await query.eq("slug", slug).maybeSingle()
      : await query.eq("name", spaceName).maybeSingle();
    if (error) throw error;
    return data?.id || null;
  };

  const insertSupabaseReservation = async (reservation) => {
    if (!getSupabaseConfig()) throw new Error("예약 접수 서버 연결 정보가 필요합니다.");
    return await callPublicSubmitFunction("space-reservation", {
      spaceName: reservation.spaceName,
      applicantName: reservation.applicant,
      phone: reservation.phone,
      birthYear: Number(reservation.birthYear),
      region: reservation.region,
      lookupPassword: reservation.lookupPassword,
      reservationDate: reservation.startDate,
      endDate: reservation.endDate,
      purpose: reservation.purpose || "공간 이용",
      headcount: Number(reservation.headcount || 1),
      note: reservation.memo || null,
    });
  };

  const findProgram = async (client, title) => {
    const { data, error } = await client
      .from("programs")
      .select("id, capacity")
      .eq("title", title)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const getProgramApplicationStatus = async (client, program) => {
    const { count, error } = await client
      .from("program_applications")
      .select("id", { count: "exact", head: true })
      .eq("program_id", program.id)
      .in("status", ["completed", "approved"]);

    if (error) throw error;
    return Number(count || 0) >= Number(program.capacity || 0) ? "waiting" : "completed";
  };

  const insertSupabaseProgramApplication = async (application) => {
    if (!getSupabaseConfig()) throw new Error("교육신청 접수 서버 연결 정보가 필요합니다.");
    const result = await callPublicSubmitFunction("program-application", {
      programName: application.programName,
      applicantName: application.applicant,
      phone: application.phone,
      lookupPassword: application.lookupPassword,
      birthYear: Number(application.birthYear),
      region: application.region,
    });
    return result?.status || false;
  };

  const fetchSupabaseSpaceReservations = async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const session = await getSession(client);
    if (!session) return null;

    const { data, error } = await client
      .from("space_reservations")
      .select("id, reservation_no, applicant_name, phone, birth_year, region, reservation_date, reservation_end_date, start_time, end_time, purpose, headcount, note, status, created_at, spaces(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.map((item) => ({
      rowId: item.id,
      id: item.reservation_no,
      spaceName: item.spaces?.name || "공간",
      applicant: item.applicant_name,
      phone: item.phone,
      birthYear: item.birth_year,
      region: item.region,
      startDate: item.reservation_date,
      endDate: item.reservation_end_date || item.reservation_date,
      startTime: item.start_time,
      endTime: item.end_time,
      purpose: item.purpose,
      headcount: item.headcount,
      memo: item.note || "",
      status: getStatusLabel("space", item.status),
      statusValue: item.status,
      createdAt: item.created_at,
      source: "supabase",
    }));
  };

  const fetchSupabaseProgramApplications = async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const session = await getSession(client);
    if (!session) return null;

    const { data, error } = await client
      .from("program_applications")
      .select("id, application_no, applicant_name, phone, birth_year, region, status, created_at, programs(title, place, start_date, end_date)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.map((item) => ({
      rowId: item.id,
      id: item.application_no,
      programName: item.programs?.title || "프로그램",
      applicant: item.applicant_name,
      phone: item.phone,
      birthYear: item.birth_year,
      group: item.region || "참여자",
      region: item.region || "",
      place: item.programs?.place || "",
      startDate: item.programs?.start_date || "",
      endDate: item.programs?.end_date || "",
      status: getStatusLabel("program", item.status),
      statusValue: item.status,
      createdAt: item.created_at,
      source: "supabase",
    }));
  };

  const normalizeProgram = (item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || "",
    content: item.content || "",
    imageUrl: item.imageUrl || item.image_url || "assets/images/program-default.png",
    place: item.place || "-",
    target: item.target || "전체",
    capacity: item.capacity || 0,
    startDate: item.startDate || item.start_date,
    endDate: item.endDate || item.end_date,
    applyStartDate: item.applyStartDate || item.apply_start_date,
    applyEndDate: item.applyEndDate || item.apply_end_date,
    status: item.status || "scheduled",
    visibility: item.visibility === "private" || item.is_active === false ? "private" : "public",
    operationStatus: item.operationStatus || item.operation_status || "normal",
    cancelReason: item.cancelReason || item.cancel_reason || "",
    canceledAt: item.canceledAt || item.canceled_at || "",
    isActive: item.isActive ?? item.is_active !== false,
  });

  const fetchSupabasePrograms = async ({ openOnly = false } = {}) => {
    const result = await callPublicSubmitFunction("program-list", { onlyOpen });
    if (!result) return null;
    return (result.items || []).map(normalizeProgram);
  };

  const lookupSupabaseProgramApplication = async (lookup) => {
    const result = await callPublicSubmitFunction("program-lookup", {
      applicantName: lookup.applicantName,
      phone: lookup.phone,
      lookupPassword: lookup.lookupPassword,
    });
    return result?.items || (result?.item ? [result.item] : []);
  };

  const fetchSupabaseInquiries = async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const session = await getSession(client);
    if (!session) return null;

    const { data, error } = await client
      .from("inquiries")
      .select("id, inquiry_no, writer_name, phone, title, content, status, answer, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.map((item) => ({
      rowId: item.id,
      id: item.inquiry_no,
      writerName: item.writer_name,
      phone: item.phone,
      title: item.title,
      content: item.content,
      status: getInquiryStatusLabel(item.status),
      statusValue: item.status,
      answer: item.answer || "",
      createdAt: item.created_at,
      source: "supabase",
    }));
  };

  const insertSupabaseInquiry = async (inquiry) => {
    if (!getSupabaseConfig()) throw new Error("문의 접수 서버 연결 정보가 필요합니다.");
    return await callPublicSubmitFunction("inquiry", {
      inquiryNo: inquiry.id,
      writerName: inquiry.writerName,
      phone: inquiry.phone,
      birthYear: Number(inquiry.birthYear),
      region: inquiry.region,
      lookupPassword: inquiry.lookupPassword,
      title: inquiry.title,
      content: inquiry.content,
    });
  };

  const lookupSupabaseInquiry = async ({ inquiryNo, lookupPassword }) => {
    const result = await callPublicSubmitFunction("inquiry-open", {
      inquiryNo,
      lookupPassword,
    });
    return result?.item || null;
  };

  const lookupSupabaseSpaceReservation = async (lookup) => {
    const result = await callPublicSubmitFunction("space-lookup", {
      applicantName: lookup.applicantName,
      phone: lookup.phone,
      lookupPassword: lookup.lookupPassword,
    });
    return result?.items || (result?.item ? [result.item] : []);
  };

  const setupContactForms = () => {
    const publicList = document.querySelector("[data-inquiry-public-list]");
    const form = document.querySelector("[data-contact-form]");
    const passwordModal = document.querySelector("[data-inquiry-password-modal]");
    const passwordForm = document.querySelector("[data-inquiry-password-form]");
    const passwordNo = document.querySelector("[data-inquiry-password-no]");
    const detailModal = document.querySelector("[data-inquiry-detail-modal]");
    const detailContent = document.querySelector("[data-inquiry-detail-content]");
    let selectedInquiryNo = "";
    let isSuperAdmin = false;
    let currentSession = null;
    const inquiryPageSize = 10;
    let inquiryItems = [];
    let inquiryCurrentPage = 1;
    const inquiryPagination = (() => {
      if (!publicList) return null;
      const nav = document.createElement("nav");
      nav.className = "board-pagination inquiry-pagination";
      nav.setAttribute("aria-label", "문의 목록 페이지");
      const wrap = publicList.closest(".inquiry-table-wrap");
      if (wrap) wrap.insertAdjacentElement("afterend", nav);
      return nav;
    })();

    const maskExceptFirst = (value, fallback = "-") => {
      const text = String(value || "").trim();
      if (!text) return fallback;
      const chars = Array.from(text);
      return `${chars[0]}${"*".repeat(Math.max(0, chars.length - 1))}`;
    };

    const toPublicInquiryItem = (item) => ({
      id: item.id,
      title: maskExceptFirst(item.title, "비공개 문의"),
      writerName: maskExceptFirst(item.writerName, "익명"),
      status: item.status || "접수",
      createdAt: item.createdAt,
    });

    const checkSuperAdmin = async () => {
      const client = getSupabaseClient();
      if (!client) return false;
      currentSession = await getSession(client);
      if (!currentSession?.user?.id) return false;

      const { data, error } = await client
        .from("profiles")
        .select("role, admin_role")
        .eq("id", currentSession.user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role === "admin" && data.admin_role === "super_admin";
    };

    const renderInquiryPagination = () => {
      if (!inquiryPagination) return;
      const totalPages = Math.ceil(inquiryItems.length / inquiryPageSize);
      inquiryPagination.hidden = totalPages <= 1;
      if (totalPages <= 1) {
        inquiryPagination.innerHTML = "";
        return;
      }
      inquiryPagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button class="${page === inquiryCurrentPage ? "is-active" : ""}" type="button" data-inquiry-page="${page}"${page === inquiryCurrentPage ? ' aria-current="page"' : ""}>${page}</button>`;
      }).join("");
    };

    const renderPublicInquiryList = (items) => {
      if (!publicList) return;
      if (items !== inquiryItems) {
        inquiryItems = (items || []).map(toPublicInquiryItem);
        inquiryCurrentPage = 1;
      }
      const totalPages = Math.max(1, Math.ceil(inquiryItems.length / inquiryPageSize));
      inquiryCurrentPage = Math.min(Math.max(1, inquiryCurrentPage), totalPages);
      items = inquiryItems.slice((inquiryCurrentPage - 1) * inquiryPageSize, inquiryCurrentPage * inquiryPageSize);
      renderInquiryPagination();
      publicList.innerHTML = items.length
        ? items
            .map(
              (item) => `
                <tr class="inquiry-public-row" data-inquiry-open="${escapeHtml(item.id)}" tabindex="0">
                  <td>${escapeHtml(item.id)}</td>
                  <td>${escapeHtml(item.title)}</td>
                  <td>${escapeHtml(item.writerName)}</td>
                  <td>${escapeHtml(formatAdminDate(item.createdAt))}</td>
                  <td>
                    <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
                    ${
                      isSuperAdmin
                        ? `<button class="inquiry-answer-button" type="button" data-inquiry-answer="${escapeHtml(item.id)}">답변</button>`
                        : ""
                    }
                  </td>
                </tr>
              `,
            )
            .join("")
        : '<tr><td colspan="5">등록된 문의가 없습니다.</td></tr>';
    };

    const closeModal = (modal) => {
      if (modal) modal.hidden = true;
    };

    const openModal = (modal) => {
      if (modal) modal.hidden = false;
    };

    const openPasswordModal = (inquiryNo) => {
      selectedInquiryNo = inquiryNo;
      if (passwordNo) passwordNo.textContent = inquiryNo;
      if (passwordForm) {
        passwordForm.reset();
        setFormStatus(passwordForm, "");
      }
      openModal(passwordModal);
      passwordForm?.elements.inquiryOpenPassword?.focus();
    };

    const renderInquiryDetail = (item, { adminMode = false } = {}) => {
      if (!detailContent) return;
      const rowId = item.rowId || item.id || "";
      const status = item.status || "접수";
      detailContent.innerHTML = `
        <article class="contact-answer-card inquiry-detail-card">
          <span>${escapeHtml(status)}</span>
          <strong>${escapeHtml(item.title || "문의 상세")}</strong>
          <dl class="inquiry-detail-meta">
            <div><dt>문의번호</dt><dd>${escapeHtml(item.id || item.inquiryNo || "-")}</dd></div>
            <div><dt>작성일</dt><dd>${escapeHtml(formatAdminDate(item.createdAt))}</dd></div>
            ${adminMode && item.writerName ? `<div><dt>작성자</dt><dd>${escapeHtml(item.writerName)}</dd></div>` : ""}
            ${adminMode && item.phone ? `<div><dt>연락처</dt><dd>${escapeHtml(item.phone)}</dd></div>` : ""}
          </dl>
          <div class="inquiry-detail-block">
            <h4>문의내용</h4>
            <p>${escapeHtml(item.content || "")}</p>
          </div>
          <div class="contact-answer-reply inquiry-detail-block">
            <h4>답변</h4>
            <p>${escapeHtml(item.answer || "아직 답변이 등록되지 않았습니다.")}</p>
          </div>
          ${
            isSuperAdmin && adminMode
              ? `<form class="inquiry-answer-form" data-inquiry-answer-form data-row-id="${escapeHtml(rowId)}" data-inquiry-no="${escapeHtml(item.id || item.inquiryNo || "")}">
                  <label><span>관리자 답변</span><textarea name="answer" rows="5" required>${escapeHtml(item.answer || "")}</textarea></label>
                  <p class="form-status" data-form-status aria-live="polite"></p>
                  <div class="inquiry-modal-actions">
                    <button type="button" data-inquiry-modal-close>닫기</button>
                    <button type="submit">답변 저장</button>
                  </div>
                </form>`
              : ""
          }
        </article>
      `;
      openModal(detailModal);
    };

    const fetchAdminInquiry = async (inquiryNo) => {
      const client = getSupabaseClient();
      if (!client || !isSuperAdmin) throw new Error("관리자만 답변할 수 있습니다.");

      const { data, error } = await client
        .from("inquiries")
        .select("id, inquiry_no, writer_name, phone, title, content, status, answer, created_at, answered_at")
        .eq("inquiry_no", inquiryNo)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("문의를 찾을 수 없습니다.");
      return {
        rowId: data.id,
        id: data.inquiry_no,
        writerName: data.writer_name,
        phone: data.phone,
        title: data.title,
        content: data.content,
        status: getInquiryStatusLabel(data.status),
        answer: data.answer || "",
        createdAt: data.created_at,
      };
    };

    const loadPublicInquiryList = async () => {
      if (!publicList) return;
      try {
        isSuperAdmin = await checkSuperAdmin();
        const result = await callPublicSubmitFunction("inquiry-list", {});
        renderPublicInquiryList(result?.items || []);
      } catch (error) {
        console.warn("Supabase inquiry public list error:", error);
        renderPublicInquiryList([]);
      }
    };

    loadPublicInquiryList();

    inquiryPagination?.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-inquiry-page]");
      if (!pageButton) return;
      inquiryCurrentPage = Number(pageButton.dataset.inquiryPage || 1);
      renderPublicInquiryList(inquiryItems);
    });

    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const inquiry = {
          id: createId("Q"),
          writerName: fieldValue(form, "writerName"),
          phone: fieldValue(form, "phone"),
          birthYear: fieldValue(form, "birthYear"),
          region: fieldValue(form, "inquiryRegion"),
          lookupPassword: fieldValue(form, "inquiryPassword"),
          title: fieldValue(form, "title"),
        content: fieldValue(form, "content"),
        status: "접수",
        answer: "",
        createdAt: new Date().toISOString(),
      };

        if (form.elements.privacyConsent && !form.elements.privacyConsent.checked) {
          setFormStatus(form, "개인정보 수집·이용에 동의해주세요.", true);
          return;
        }

        if (!inquiry.writerName || !inquiry.phone || !inquiry.birthYear || !inquiry.region || !inquiry.lookupPassword || !inquiry.title || !inquiry.content) {
          setFormStatus(form, "이름, 연락처, 출생연도, 주소, 비밀번호, 제목, 내용을 모두 입력해주세요.", true);
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
          await insertSupabaseInquiry(inquiry);
          setFormStatus(form, "문의가 접수되었습니다. 답변은 위의 문의목록에서 해당 문의를 선택한 뒤 비밀번호를 입력해 확인해주세요.");
          form.reset();
          loadPublicInquiryList();
        } catch (error) {
          setFormStatus(form, error.message || "문의 저장 중 문제가 발생했습니다.", true);
        } finally {
          submitButton.disabled = false;
        }
      });
    }

    publicList?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const answerNo = target.dataset.inquiryAnswer;
      if (answerNo) {
        try {
          selectedInquiryNo = answerNo;
          renderInquiryDetail(await fetchAdminInquiry(answerNo), { adminMode: true });
        } catch (error) {
          window.alert(error.message || "문의를 불러오지 못했습니다.");
        }
        return;
      }

      const row = target.closest("[data-inquiry-open]");
      if (row instanceof HTMLElement) openPasswordModal(row.dataset.inquiryOpen || "");
    });

    publicList?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const row = target.closest("[data-inquiry-open]");
      if (!(row instanceof HTMLElement)) return;
      event.preventDefault();
      openPasswordModal(row.dataset.inquiryOpen || "");
    });

    passwordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const lookup = {
        inquiryNo: selectedInquiryNo,
        lookupPassword: fieldValue(passwordForm, "inquiryOpenPassword"),
      };

      if (!lookup.inquiryNo || !lookup.lookupPassword) {
        setFormStatus(passwordForm, "비밀번호를 입력해주세요.", true);
        return;
      }

      const submitButton = passwordForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        const supabaseItem = await lookupSupabaseInquiry(lookup);
        const item = supabaseItem || null;

        if (!item) {
          setFormStatus(passwordForm, "비밀번호가 일치하지 않습니다.", true);
        } else {
          closeModal(passwordModal);
          renderInquiryDetail(item);
        }
      } catch (error) {
        setFormStatus(passwordForm, error.message || "문의 조회 중 문제가 발생했습니다.", true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    detailContent?.addEventListener("submit", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || !target.matches("[data-inquiry-answer-form]")) return;
      event.preventDefault();

      const answer = fieldValue(target, "answer");
      if (!answer) {
        setFormStatus(target, "답변 내용을 입력해주세요.", true);
        return;
      }

      const client = getSupabaseClient();
      if (!client || !currentSession?.user?.id) {
        setFormStatus(target, "관리자 권한 확인 후 답변을 저장할 수 있습니다.", true);
        return;
      }

      const submitButton = target.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      try {
        const { error } = await client
          .from("inquiries")
          .update({
            answer,
            status: "answered",
            answered_by: currentSession.user.id,
            answered_at: new Date().toISOString(),
          })
          .eq("id", target.dataset.rowId);
        if (error) throw error;
        setFormStatus(target, "답변을 저장했습니다.");
        await loadPublicInquiryList();
        const item = await fetchAdminInquiry(target.dataset.inquiryNo || selectedInquiryNo);
        renderInquiryDetail(item, { adminMode: true });
      } catch (error) {
        setFormStatus(target, error.message || "답변 저장 중 문제가 발생했습니다.", true);
      } finally {
        submitButton.disabled = false;
      }
    });

    detailContent?.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("[data-inquiry-modal-close]")) {
        closeModal(detailModal);
      }
    });

    document.querySelectorAll("[data-inquiry-modal-close]").forEach((button) => {
      button.addEventListener("click", () => {
        closeModal(passwordModal);
        closeModal(detailModal);
      });
    });

    [passwordModal, detailModal].forEach((modal) => {
      modal?.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(modal);
      });
    });
  };

  const setupSpaceReservationForms = () => {
    document.querySelectorAll("[data-space-reservation-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const reservation = {
          id: createId("R"),
          spaceName: form.dataset.spaceName || "공간",
          floor: form.dataset.spaceFloor || "",
          applicant: fieldValue(form, "spaceApplicant") || fieldValue(form, "applicant"),
          phone: fieldValue(form, "spacePhone") || fieldValue(form, "phone"),
          birthYear: fieldValue(form, "spaceBirthYear") || fieldValue(form, "birthYear"),
          region: fieldValue(form, "spaceRegion") || fieldValue(form, "region"),
          lookupPassword: fieldValue(form, "spacePassword") || fieldValue(form, "lookupPassword"),
          startDate: fieldValue(form, "startDate"),
          endDate: fieldValue(form, "endDate"),
          purpose: fieldValue(form, "purpose"),
          memo: fieldValue(form, "memo"),
          status: "승인대기",
          createdAt: new Date().toISOString(),
          source: "local",
        };

        if (form.elements.privacyConsent && !form.elements.privacyConsent.checked) {
          setFormStatus(form, "개인정보 수집·이용에 동의해주세요.", true);
          return;
        }

        if (!reservation.applicant || !reservation.phone || !reservation.birthYear || !reservation.region || !reservation.lookupPassword || !reservation.startDate || !reservation.endDate) {
          setFormStatus(form, "이름, 연락처, 출생연도, 주소, 비밀번호, 예약일을 모두 입력해주세요.", true);
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
          await insertSupabaseReservation(reservation);
          setFormStatus(form, "예약 신청이 접수되었습니다. 예약확인 시 신청자명, 연락처, 비밀번호를 입력해주세요.");
          window.setTimeout(() => {
            window.location.href = "space-reservations.html";
          }, 650);
        } catch (error) {
          setFormStatus(form, error.message || "예약 저장 중 문제가 발생했습니다.", true);
        } finally {
          submitButton.disabled = false;
        }
      });
    });
  };

  const setupSpaceReservationCalendars = async () => {
    const inputs = document.querySelectorAll(
      '[data-space-reservation-form] input[name="startDate"], [data-space-reservation-form] input[name="endDate"]',
    );
    if (!inputs.length) return;

    try {
      await loadExternalStyle("flatpickr-style", "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css");
      await loadExternalScript("flatpickr-script", "https://cdn.jsdelivr.net/npm/flatpickr");
      await loadExternalScript("flatpickr-ko", "https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ko.js");

      inputs.forEach((input) => {
        if (input._flatpickr || !window.flatpickr) return;
        window.flatpickr(input, {
          dateFormat: "Y-m-d",
          disableMobile: true,
          locale: window.flatpickr.l10ns?.ko || "ko",
          monthSelectorType: "dropdown",
          onReady: (_selectedDates, _dateStr, instance) => {
            instance.calendarContainer.classList.add("kkoom-space-calendar");
          },
        });
      });
    } catch (error) {
      console.warn("Large date picker fallback:", error);
    }
  };

  const setupProgramCatalogPage = async () => {
    const list = document.querySelector("[data-program-list]");
    if (!list) return;

    const form = document.querySelector("[data-program-filter-form]");
    const mode = list.getAttribute("data-program-list") === "archive" ? "archive" : "current";
    let programs = [];
    const INITIAL_PROGRAM_LIMIT = 6;
    let visibleLimit = INITIAL_PROGRAM_LIMIT;
    const moreWrap = document.createElement("div");
    moreWrap.className = "program-list-more";
    moreWrap.innerHTML = '<button type="button" data-program-more hidden>더보기</button>';
    list.insertAdjacentElement("afterend", moreWrap);
    const moreButton = moreWrap.querySelector("[data-program-more]");

    const programSortRank = (program) => ({ open: 0, scheduled: 1, closed: 2, finished: 3 }[program.status] ?? 4);
    const programDateValue = (program) => Date.parse(program.applyStartDate || program.startDate || "") || 0;
    const archiveDateValue = (program) => Date.parse(program.endDate || program.startDate || "") || 0;

    const syncArchiveYearOptions = () => {
      const yearSelect = form?.elements.year;
      if (!yearSelect) return;
      const currentValue = yearSelect.value || "all";
      const years = [...new Set(programs.filter(isArchiveProgram).map(getProgramYear).filter(Boolean))].sort((a, b) => b - a);
      yearSelect.innerHTML = `<option value="all">전체</option>${years.map((year) => `<option value="${year}">${year}년</option>`).join("")}`;
      yearSelect.value = years.includes(Number(currentValue)) ? currentValue : "all";
    };

    const renderPrograms = ({ resetLimit = false } = {}) => {
      if (resetLimit) visibleLimit = INITIAL_PROGRAM_LIMIT;
      const status = form?.elements.status?.value || "all";
      const target = form?.elements.target?.value || "all";
      const year = form?.elements.year?.value || "all";
      const keyword = (form?.elements.keyword?.value || "").trim().toLowerCase();
      const filtered = programs
        .filter((program) => {
          const matchesMode = mode === "archive" ? isArchiveProgram(program) : isCurrentProgram(program);
          const matchesStatus = mode === "archive" || status === "all" ? true : program.status === status;
          const matchesYear = year === "all" || getProgramYear(program) === Number(year);
          const matchesTarget = target === "all" || program.target === target;
          const haystack = `${program.title} ${program.summary} ${program.content} ${program.place}`.toLowerCase();
          return matchesMode && matchesStatus && matchesYear && matchesTarget && (!keyword || haystack.includes(keyword));
        })
        .sort((a, b) => mode === "archive"
          ? archiveDateValue(b) - archiveDateValue(a)
          : programSortRank(a) - programSortRank(b) || programDateValue(b) - programDateValue(a));
      const visiblePrograms = filtered.slice(0, visibleLimit);

      list.innerHTML = visiblePrograms.length
        ? visiblePrograms
            .map((program) => {
              const canApply = mode === "current" && program.visibility === "public" && program.operationStatus === "normal" && program.status === "open";
              const badgeText = mode === "archive" ? getProgramRunStatusLabel(program) : getProgramStatusLabel(program.status);
              const badgeClass = mode === "archive" ? "closed" : programStatusClass(program.status);
              return `
                <article class="program-list-card">
                  <img src="${escapeHtml(program.imageUrl)}" alt="${escapeHtml(program.title)} 이미지">
                  <div>
                    <span class="status ${badgeClass}">${escapeHtml(badgeText)}</span>
                    <h3>${escapeHtml(program.title)}</h3>
                    <p>${escapeHtml(program.summary || program.content || "교육 상세내용을 확인해주세요.")}</p>
                    <dl>
                      <div><dt>모집기간</dt><dd>${escapeHtml(formatDateRange(program.applyStartDate, program.applyEndDate))}</dd></div>
                      <div><dt>진행기간</dt><dd>${escapeHtml(formatDateRange(program.startDate, program.endDate))}</dd></div>
                      <div><dt>장소</dt><dd>${escapeHtml(program.place)}</dd></div>
                      <div><dt>대상</dt><dd>${escapeHtml(program.target)}</dd></div>
                      <div><dt>정원</dt><dd>${escapeHtml(program.capacity)}명</dd></div>
                    </dl>
                  </div>
                  ${
                    canApply
                      ? `<a href="program-apply.html?program=${encodeURIComponent(program.title)}">신청하기</a>`
                      : `<span class="program-apply-disabled">${escapeHtml(mode === "archive" ? "지난 교육" : getProgramStatusLabel(program.status))}</span>`
                  }
                </article>
              `;
            })
            .join("")
        : mode === "archive"
          ? `<article class="empty-state program-list-empty"><strong>조건에 맞는 지난 교육이 없습니다.</strong><p>연도, 대상, 검색어를 다시 확인해주세요.</p></article>`
          : `<article class="empty-state program-list-empty"><strong>조건에 맞는 교육이 없습니다.</strong><p>검색 조건을 바꾸거나 다음 모집을 기다려주세요.</p></article>`;

      if (moreButton) {
        moreButton.hidden = visiblePrograms.length >= filtered.length;
      }
    };

    try {
      const loadedPrograms = await fetchSupabasePrograms();
      if (!loadedPrograms) return;
      programs = loadedPrograms;
      syncArchiveYearOptions();
      renderPrograms();
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        renderPrograms({ resetLimit: true });
      });
      form?.addEventListener("change", () => renderPrograms({ resetLimit: true }));
      form?.elements.keyword?.addEventListener("input", () => renderPrograms({ resetLimit: true }));
      moreButton?.addEventListener("click", () => {
        visibleLimit += INITIAL_PROGRAM_LIMIT;
        renderPrograms();
      });
    } catch (error) {
      console.warn("Supabase program catalog fallback:", error);
    }
  };

  const setupProgramApplyForm = () => {
    const form = document.querySelector("[data-program-apply-form]");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const selectedProgram = params.get("program");
    const programSelect = form.elements.programName;
    const submitButton = form.querySelector('button[type="submit"]');

    const populateProgramOptions = async () => {
      if (!programSelect) return;
      try {
        const programs = await fetchSupabasePrograms({ openOnly: true });
        if (!programs) {
          if (selectedProgram) programSelect.value = selectedProgram;
          return;
        }

        programSelect.innerHTML = `<option value="">신청할 프로그램을 선택하세요</option>${programs
          .map((program) => `<option value="${escapeHtml(program.title)}">${escapeHtml(program.title)}</option>`)
          .join("")}`;

        if (selectedProgram && programs.some((program) => program.title === selectedProgram)) {
          programSelect.value = selectedProgram;
        }

        if (!programs.length) {
          if (submitButton) submitButton.disabled = true;
          setFormStatus(form, "현재 신청 가능한 교육이 없습니다.", true);
        }
      } catch (error) {
        console.warn("Supabase program option fallback:", error);
        if (selectedProgram && programSelect) programSelect.value = selectedProgram;
      }
    };

    populateProgramOptions();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const application = {
        id: createId("P"),
        programName: fieldValue(form, "programName") || "프로그램",
        applicant: fieldValue(form, "programApplicant") || fieldValue(form, "applicant"),
        phone: fieldValue(form, "programPhone") || fieldValue(form, "phone"),
        birthYear: fieldValue(form, "programBirthYear") || fieldValue(form, "birthYear"),
        region: fieldValue(form, "programRegion") || fieldValue(form, "region"),
        lookupPassword: fieldValue(form, "programPassword") || fieldValue(form, "lookupPassword"),
        group: fieldValue(form, "programRegion") || fieldValue(form, "region") || "참여자",
        status: "접수완료",
        createdAt: new Date().toISOString(),
        source: "local",
      };

      if (form.elements.privacyConsent && !form.elements.privacyConsent.checked) {
        setFormStatus(form, "개인정보 수집·이용에 동의해주세요.", true);
        return;
      }

      if (!application.programName || !application.applicant || !application.phone || !application.birthYear || !application.region || !application.lookupPassword) {
        setFormStatus(form, "프로그램명, 이름, 연락처, 출생연도, 주소, 비밀번호를 모두 입력해주세요.", true);
        return;
      }

      submitButton.disabled = true;

      try {
        const supabaseStatus = await insertSupabaseProgramApplication(application);

        setFormStatus(
          form,
          `교육 신청이 ${getStatusLabel("program", supabaseStatus)} 상태로 접수되었습니다. 신청확인 시 신청자명, 연락처, 비밀번호를 입력해주세요.`,
        );
        window.setTimeout(() => {
          window.location.href = "program-check.html";
        }, 650);
      } catch (error) {
        setFormStatus(form, error.message || "교육 신청 저장 중 문제가 발생했습니다.", true);
      } finally {
        submitButton.disabled = false;
      }
    });
  };

  const renderCheckDetailRows = (rows) =>
    `<dl class="check-detail-list">${rows
      .map(
        (row) => `
          <div class="${row.wide ? "is-wide" : ""}">
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(displayValue(row.value))}</dd>
          </div>
        `,
      )
      .join("")}</dl>`;

  const renderList = (container, items, type) => {
    if (!container) return;
    const emptyText = type === "space" ? "아직 저장된 공간 예약이 없습니다." : "아직 저장된 교육 신청이 없습니다.";
    container.innerHTML = items.length
      ? items
      .map((item) => {
        const title = type === "space" ? item.spaceName : item.programName;
        const rows =
          type === "space"
            ? [
                { label: "예약번호", value: item.id },
                { label: "접수상태", value: item.status },
                { label: "공간명", value: title },
                { label: "신청자명", value: item.applicant },
                { label: "연락처", value: item.phone },
                { label: "출생연도", value: item.birthYear },
                { label: "주소", value: item.region },
                { label: "예약기간", value: formatDateRange(item.startDate, item.endDate) },
                { label: "이용시간", value: formatTimeRange(item.startTime, item.endTime) },
                { label: "이용목적", value: item.purpose, wide: true },
                { label: "기타 메모", value: item.memo || item.note, wide: true },
                { label: "접수일", value: formatDate(item.createdAt) },
              ]
            : [
                { label: "신청번호", value: item.id },
                { label: "접수상태", value: item.status },
                { label: "프로그램명", value: title },
                { label: "신청자명", value: item.applicant },
                { label: "연락처", value: item.phone },
                { label: "출생연도", value: item.birthYear },
                { label: "주소", value: item.region || item.group },
                { label: "장소", value: item.place },
                { label: "수업기간", value: formatDateRange(item.startDate, item.endDate) },
                { label: "접수일", value: formatDate(item.createdAt) },
              ];
        return `
          <article class="program-check-detail-card">
            <div class="check-detail-head">
              <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
              <strong>${escapeHtml(title)}</strong>
            </div>
            ${renderCheckDetailRows(rows)}
          </article>
        `;
      })
          .join("")
      : `<article class="empty-state"><strong>${emptyText}</strong><p>신청을 완료하면 이곳에 목록이 표시됩니다.</p></article>`;
  };

  const setupCheckLists = async () => {
    const spaceList = document.querySelector("[data-space-reservation-list]");
    if (spaceList) {
      const spaceCheckForm = document.querySelector("[data-space-check-form]");
      if (spaceCheckForm) {
        spaceList.innerHTML = '<article class="empty-state"><strong>예약 내역을 조회해주세요.</strong><p>신청자명, 연락처, 비밀번호가 일치할 때 본인 예약만 표시됩니다.</p></article>';
        spaceCheckForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const lookup = {
            applicantName: fieldValue(spaceCheckForm, "applicantName"),
            phone: fieldValue(spaceCheckForm, "phone"),
            lookupPassword: fieldValue(spaceCheckForm, "lookupPassword"),
          };
          if (!lookup.applicantName || !lookup.phone || !lookup.lookupPassword) {
            spaceList.innerHTML = '<article class="empty-state"><strong>신청자명, 연락처, 비밀번호를 모두 입력해주세요.</strong></article>';
            return;
          }
          const submitButton = spaceCheckForm.querySelector('button[type="submit"]');
          if (submitButton) submitButton.disabled = true;
          try {
            const items = await lookupSupabaseSpaceReservation(lookup);
            if (!items.length) {
              spaceList.innerHTML = '<article class="empty-state"><strong>일치하는 예약 내역이 없습니다.</strong><p>신청자명, 연락처, 비밀번호를 다시 확인해주세요.</p></article>';
              return;
            }
            renderList(
              spaceList,
              items.map((item) => ({
                id: item.id,
                spaceName: item.spaceName,
                applicant: item.applicant,
                phone: item.phone,
                birthYear: item.birthYear,
                region: item.region,
                startDate: item.reservationDate,
                endDate: item.reservationEndDate || item.reservationDate,
                startTime: item.startTime,
                endTime: item.endTime,
                purpose: item.purpose,
                headcount: item.headcount,
                memo: item.note,
                status: item.statusLabel,
                createdAt: item.createdAt,
              })),
              "space",
            );
          } catch (error) {
            spaceList.innerHTML = `<article class="empty-state"><strong>${escapeHtml(error.message || "예약 내역을 조회하지 못했습니다.")}</strong></article>`;
          } finally {
            if (submitButton) submitButton.disabled = false;
          }
        });
        return;
      }

      try {
        const supabaseItems = await fetchSupabaseSpaceReservations();
        renderList(spaceList, supabaseItems || [], "space");
      } catch (error) {
        renderList(spaceList, [], "space");
        console.warn("Supabase space list fallback:", error);
      }
    }

    const programList = document.querySelector("[data-program-application-list]");
    if (programList) {
      const programCheckForm = document.querySelector("[data-program-check-form]");
      if (programCheckForm) {
        renderList(programList, [], "program");
        programList.innerHTML = '<article class="empty-state"><strong>신청 내역을 조회해주세요.</strong><p>신청자명, 연락처, 비밀번호가 일치할 때 본인 신청만 표시됩니다.</p></article>';
        programCheckForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const lookup = {
            applicantName: fieldValue(programCheckForm, "applicantName"),
            phone: fieldValue(programCheckForm, "phone"),
            lookupPassword: fieldValue(programCheckForm, "lookupPassword"),
          };
          if (!lookup.applicantName || !lookup.phone || !lookup.lookupPassword) {
            programList.innerHTML = '<article class="empty-state"><strong>신청자명, 연락처, 비밀번호를 모두 입력해주세요.</strong></article>';
            return;
          }
          const submitButton = programCheckForm.querySelector('button[type="submit"]');
          if (submitButton) submitButton.disabled = true;
          try {
            const items = await lookupSupabaseProgramApplication(lookup);
            if (!items.length) {
              programList.innerHTML = '<article class="empty-state"><strong>일치하는 신청 내역이 없습니다.</strong><p>신청자명, 연락처, 비밀번호를 다시 확인해주세요.</p></article>';
              return;
            }
            renderList(
              programList,
              items.map((item) => ({
                id: item.id,
                programName: item.programName,
                applicant: item.applicant,
                phone: item.phone,
                birthYear: item.birthYear,
                group: item.region,
                region: item.region,
                place: item.place,
                startDate: item.startDate,
                endDate: item.endDate,
                status: item.statusLabel,
                createdAt: item.createdAt,
              })),
              "program",
            );
          } catch (error) {
            programList.innerHTML = `<article class="empty-state"><strong>${escapeHtml(error.message || "신청 내역을 조회하지 못했습니다.")}</strong></article>`;
          } finally {
            if (submitButton) submitButton.disabled = false;
          }
        });
        return;
      }

      try {
        const supabaseItems = await fetchSupabaseProgramApplications();
        renderList(programList, supabaseItems || [], "program");
      } catch (error) {
        renderList(programList, [], "program");
        console.warn("Supabase program list fallback:", error);
      }
    }
  };

  setupSpaceReservationForms();
  setupSpaceReservationCalendars();
  setupProgramCatalogPage();
  setupProgramApplyForm();
  setupContactForms();
  setupCheckLists();
})();

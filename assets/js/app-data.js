(() => {
  const SPACE_KEY = "kkoom-space-reservations";
  const PROGRAM_KEY = "kkoom-program-applications";

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

  const LOCAL_STATUS_TO_VALUE = {
    space: {
      승인대기: "received",
      승인완료: "approved",
      이용완료: "approved",
      반려: "rejected",
      취소: "canceled",
    },
    program: {
      접수완료: "completed",
      확인중: "completed",
      수강완료: "approved",
      신청완료: "completed",
      대기: "waiting",
      취소: "canceled",
    },
  };

  const sampleSpaceReservations = [
    {
      id: "R-2026-014",
      spaceName: "공유주방",
      applicant: "김○○",
      phone: "010-1234-0000",
      startDate: "2026-06-20",
      endDate: "2026-06-20",
      purpose: "베이킹 교육 준비",
      memo: "오븐 사용 예정",
      status: "승인대기",
      createdAt: "2026-06-10T09:00:00.000Z",
      source: "sample",
    },
    {
      id: "R-2026-013",
      spaceName: "강의실",
      applicant: "박○○",
      phone: "010-2345-0000",
      startDate: "2026-06-18",
      endDate: "2026-06-18",
      purpose: "주민교육",
      memo: "프로젝터 사용",
      status: "승인완료",
      createdAt: "2026-06-08T09:00:00.000Z",
      source: "sample",
    },
    {
      id: "R-2026-012",
      spaceName: "소회의실",
      applicant: "이○○",
      phone: "010-3456-0000",
      startDate: "2026-06-14",
      endDate: "2026-06-14",
      purpose: "마을 회의",
      memo: "",
      status: "이용완료",
      createdAt: "2026-06-04T09:00:00.000Z",
      source: "sample",
    },
  ];

  const sampleProgramApplications = [
    {
      id: "P-2026-021",
      programName: "베이킹 교육과정",
      applicant: "김○○",
      phone: "010-1234-0000",
      group: "성인",
      memo: "초보자 참여",
      status: "접수완료",
      createdAt: "2026-06-11T09:00:00.000Z",
      source: "sample",
    },
    {
      id: "P-2026-020",
      programName: "원예심리치료교실",
      applicant: "박○○",
      phone: "010-2345-0000",
      group: "성인",
      memo: "",
      status: "확인중",
      createdAt: "2026-06-07T09:00:00.000Z",
      source: "sample",
    },
    {
      id: "P-2026-019",
      programName: "바리스타 양성과정 2급",
      applicant: "이○○",
      phone: "010-3456-0000",
      group: "성인",
      memo: "수료 확인",
      status: "수강완료",
      createdAt: "2026-05-28T09:00:00.000Z",
      source: "sample",
    },
  ];

  const getSupabaseClient = () => {
    const config = window.KKOOM_SUPABASE || {};
    if (!window.supabase || !config.url || !config.anonKey) return null;
    if (!window.KKOOM_SUPABASE_CLIENT) {
      window.KKOOM_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.KKOOM_SUPABASE_CLIENT;
  };

  const safeParse = (key) => {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };

  const safeSave = (key, items) => {
    window.localStorage.setItem(key, JSON.stringify(items));
  };

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

  const getStatusValue = (type, label) =>
    Object.entries(STATUS[type]).find(([, value]) => value === label)?.[0] ||
    LOCAL_STATUS_TO_VALUE[type]?.[label] ||
    label;

  const getStatusLabel = (type, value) => STATUS[type]?.[value] || value || "-";

  const fieldValue = (form, name) => form.elements[name]?.value?.trim() || "";

  const setFormStatus = (form, message, isError = false) => {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

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
    const client = getSupabaseClient();
    if (!client) return false;

    const session = await getSession(client);
    if (!session) return false;

    const spaceId = await findSpaceId(client, reservation.spaceName);
    if (!spaceId) {
      throw new Error("Supabase에 해당 공간이 등록되어 있지 않습니다. seed.sql을 먼저 실행해 주세요.");
    }

    const { error } = await client.from("space_reservations").insert({
      reservation_no: reservation.id,
      space_id: spaceId,
      user_id: session?.user?.id || null,
      applicant_type: session ? "member" : "guest",
      applicant_name: reservation.applicant,
      phone: reservation.phone,
      reservation_date: reservation.startDate,
      start_time: "09:00",
      end_time: "18:00",
      purpose: reservation.purpose || "공간 이용",
      headcount: 1,
      note: reservation.memo || null,
      status: "received",
    });

    if (error) throw error;
    return true;
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
    const client = getSupabaseClient();
    if (!client) return false;

    const session = await getSession(client);
    if (!session) return false;

    const program = await findProgram(client, application.programName);
    if (!program) {
      throw new Error("Supabase에 해당 프로그램이 등록되어 있지 않습니다. seed.sql의 프로그램 데이터를 확인해 주세요.");
    }

    const status = await getProgramApplicationStatus(client, program);
    const { error } = await client.from("program_applications").insert({
      application_no: application.id,
      program_id: program.id,
      user_id: session?.user?.id || null,
      applicant_type: session ? "member" : "guest",
      applicant_name: application.applicant,
      phone: application.phone,
      birth_year: Number(application.birthYear),
      region: application.region,
      status,
      waitlist_order: status === "waiting" ? 1 : null,
    });

    if (error) throw error;
    return status;
  };

  const fetchSupabaseSpaceReservations = async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const session = await getSession(client);
    if (!session) return null;

    const { data, error } = await client
      .from("space_reservations")
      .select("id, reservation_no, applicant_name, phone, reservation_date, purpose, note, status, created_at, spaces(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.map((item) => ({
      rowId: item.id,
      id: item.reservation_no,
      spaceName: item.spaces?.name || "공간",
      applicant: item.applicant_name,
      phone: item.phone,
      startDate: item.reservation_date,
      endDate: item.reservation_date,
      purpose: item.purpose,
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
      .select("id, application_no, applicant_name, phone, region, status, created_at, programs(title)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data.map((item) => ({
      rowId: item.id,
      id: item.application_no,
      programName: item.programs?.title || "프로그램",
      applicant: item.applicant_name,
      phone: item.phone,
      group: item.region || "참여자",
      status: getStatusLabel("program", item.status),
      statusValue: item.status,
      createdAt: item.created_at,
      source: "supabase",
    }));
  };

  const setupSpaceReservationForms = () => {
    document.querySelectorAll("[data-space-reservation-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const reservation = {
          id: createId("R"),
          spaceName: form.dataset.spaceName || "공간",
          floor: form.dataset.spaceFloor || "",
          applicant: fieldValue(form, "applicant"),
          phone: fieldValue(form, "phone"),
          startDate: fieldValue(form, "startDate"),
          endDate: fieldValue(form, "endDate"),
          purpose: fieldValue(form, "purpose"),
          memo: fieldValue(form, "memo"),
          status: "승인대기",
          createdAt: new Date().toISOString(),
          source: "local",
        };

        if (!reservation.applicant || !reservation.phone || !reservation.startDate || !reservation.endDate) {
          setFormStatus(form, "신청자명, 연락처, 예약일을 입력해 주세요.", true);
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
          const savedToSupabase = await insertSupabaseReservation(reservation);
          if (!savedToSupabase) {
            const items = safeParse(SPACE_KEY);
            safeSave(SPACE_KEY, [reservation, ...items]);
          }

          setFormStatus(
            form,
            savedToSupabase
              ? "예약 신청이 접수되었습니다. 관리자 확인 후 승인됩니다."
              : "예약 신청이 임시 저장되었습니다. Supabase 연결 후 실제 저장됩니다.",
          );
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

  const setupProgramApplyForm = () => {
    const form = document.querySelector("[data-program-apply-form]");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const selectedProgram = params.get("program");
    const programSelect = form.elements.programName;
    if (selectedProgram && programSelect) {
      programSelect.value = selectedProgram;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const application = {
        id: createId("P"),
        programName: fieldValue(form, "programName") || "프로그램",
        applicant: fieldValue(form, "applicant"),
        phone: fieldValue(form, "phone"),
        birthYear: fieldValue(form, "birthYear"),
        region: fieldValue(form, "region"),
        group: fieldValue(form, "region") || "참여자",
        memo: fieldValue(form, "memo"),
        status: "접수완료",
        createdAt: new Date().toISOString(),
        source: "local",
      };

      if (!application.programName || !application.applicant || !application.phone || !application.birthYear || !application.region) {
        setFormStatus(form, "프로그램명, 신청자명, 연락처, 출생연도, 지역을 입력해 주세요.", true);
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      try {
        const supabaseStatus = await insertSupabaseProgramApplication(application);
        if (!supabaseStatus) {
          const items = safeParse(PROGRAM_KEY);
          safeSave(PROGRAM_KEY, [application, ...items]);
        }

        setFormStatus(
          form,
          supabaseStatus
            ? `교육 신청이 ${getStatusLabel("program", supabaseStatus)} 상태로 접수되었습니다.`
            : "교육 신청이 임시 저장되었습니다. Supabase 연결 후 실제 저장됩니다.",
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

  const renderList = (container, items, type) => {
    if (!container) return;
    const emptyText = type === "space" ? "아직 저장된 공간 예약이 없습니다." : "아직 저장된 교육 신청이 없습니다.";
    container.innerHTML = items.length
      ? items
          .map((item) => {
            const title = type === "space" ? item.spaceName : item.programName;
            const meta =
              type === "space"
                ? `${item.id} · ${item.startDate || "-"}${item.endDate && item.endDate !== item.startDate ? ` - ${item.endDate}` : ""} · ${item.applicant || "-"}`
                : `${item.id} · ${item.group || "참여자"} · ${item.applicant || "-"}`;
            return `<article><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(meta)}</p></article>`;
          })
          .join("")
      : `<article class="empty-state"><strong>${emptyText}</strong><p>신청을 완료하면 이곳에 목록이 표시됩니다.</p></article>`;
  };

  const setupCheckLists = async () => {
    const spaceList = document.querySelector("[data-space-reservation-list]");
    if (spaceList) {
      try {
        const supabaseItems = await fetchSupabaseSpaceReservations();
        renderList(spaceList, supabaseItems || [...safeParse(SPACE_KEY), ...sampleSpaceReservations], "space");
      } catch (error) {
        renderList(spaceList, [...safeParse(SPACE_KEY), ...sampleSpaceReservations], "space");
        console.warn("Supabase space list fallback:", error);
      }
    }

    const programList = document.querySelector("[data-program-application-list]");
    if (programList) {
      try {
        const supabaseItems = await fetchSupabaseProgramApplications();
        renderList(programList, supabaseItems || [...safeParse(PROGRAM_KEY), ...sampleProgramApplications], "program");
      } catch (error) {
        renderList(programList, [...safeParse(PROGRAM_KEY), ...sampleProgramApplications], "program");
        console.warn("Supabase program list fallback:", error);
      }
    }
  };

  const renderAdminList = (container, items, type) => {
    if (!container) return;
    const options = Object.entries(STATUS[type]);
    container.innerHTML = items
      .map((item) => {
        const title = type === "space" ? item.spaceName : item.programName;
        const date = type === "space" ? item.startDate || "-" : item.createdAt?.slice(0, 10) || "-";
        const value = item.statusValue || getStatusValue(type, item.status);
        return `
          <article class="admin-item">
            <div>
              <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(item.id)} · ${escapeHtml(item.applicant || "-")} · ${escapeHtml(date)}</p>
            </div>
            <select data-admin-status="${escapeHtml(type)}" data-admin-id="${escapeHtml(item.rowId || item.id)}" data-admin-source="${escapeHtml(item.source || "local")}">
              ${options
                .map(([optionValue, label]) => `<option value="${optionValue}"${optionValue === value ? " selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </article>
        `;
      })
      .join("");
  };

  const setupAdminPage = async () => {
    const dashboard = document.querySelector("[data-admin-dashboard]");
    if (!dashboard) return;

    let spaceItems = [...safeParse(SPACE_KEY), ...sampleSpaceReservations];
    let programItems = [...safeParse(PROGRAM_KEY), ...sampleProgramApplications];

    try {
      spaceItems = (await fetchSupabaseSpaceReservations()) || spaceItems;
      programItems = (await fetchSupabaseProgramApplications()) || programItems;
    } catch (error) {
      console.warn("Supabase admin fallback:", error);
    }

    dashboard.querySelector("[data-admin-space-count]").textContent = String(spaceItems.length);
    dashboard.querySelector("[data-admin-program-count]").textContent = String(programItems.length);
    dashboard.querySelector("[data-admin-waiting-count]").textContent = String(
      [...spaceItems, ...programItems].filter((item) => ["접수", "승인대기", "대기", "확인중"].includes(item.status)).length,
    );

    renderAdminList(dashboard.querySelector("[data-admin-space-list]"), spaceItems, "space");
    renderAdminList(dashboard.querySelector("[data-admin-program-list]"), programItems, "program");

    dashboard.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.dataset.adminStatus) return;

      const type = target.dataset.adminStatus;
      const source = target.dataset.adminSource;
      const label = getStatusLabel(type, target.value);

      if (source === "supabase") {
        const client = getSupabaseClient();
        const table = type === "space" ? "space_reservations" : "program_applications";
        const { error } = await client.from(table).update({ status: target.value }).eq("id", target.dataset.adminId);
        if (error) {
          window.alert(error.message || "상태 변경 중 문제가 발생했습니다.");
        }
        return;
      }

      const key = type === "space" ? SPACE_KEY : PROGRAM_KEY;
      const items = safeParse(key);
      const updated = items.map((item) =>
        item.id === target.dataset.adminId ? { ...item, status: label } : item,
      );
      safeSave(key, updated);
    });
  };

  setupSpaceReservationForms();
  setupProgramApplyForm();
  setupCheckLists();
  setupAdminPage();
})();

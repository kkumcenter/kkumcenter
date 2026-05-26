(() => {
  const SPACE_KEY = "kkoom-space-reservations";
  const PROGRAM_KEY = "kkoom-program-applications";

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
    },
  ];

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
    if (["승인완료", "접수완료", "신청완료"].includes(status)) return "open";
    if (["승인대기", "확인중"].includes(status)) return "ongoing";
    return "closed";
  };

  const fieldValue = (form, name) => form.elements[name]?.value?.trim() || "";

  const setFormStatus = (form, message, isError = false) => {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const setupSpaceReservationForms = () => {
    document.querySelectorAll("[data-space-reservation-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
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
        };

        if (!reservation.applicant || !reservation.phone || !reservation.startDate || !reservation.endDate) {
          setFormStatus(form, "신청자명, 연락처, 예약일을 입력해 주세요.", true);
          return;
        }

        const items = safeParse(SPACE_KEY);
        safeSave(SPACE_KEY, [reservation, ...items]);
        setFormStatus(form, "예약 신청이 임시 저장되었습니다. 예약확인 화면으로 이동합니다.");
        window.setTimeout(() => {
          window.location.href = "space-reservations.html";
        }, 450);
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

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const application = {
        id: createId("P"),
        programName: fieldValue(form, "programName") || "프로그램",
        applicant: fieldValue(form, "applicant"),
        phone: fieldValue(form, "phone"),
        group: fieldValue(form, "group"),
        memo: fieldValue(form, "memo"),
        status: "접수완료",
        createdAt: new Date().toISOString(),
      };

      if (!application.programName || !application.applicant || !application.phone) {
        setFormStatus(form, "프로그램명, 신청자명, 연락처를 입력해 주세요.", true);
        return;
      }

      const items = safeParse(PROGRAM_KEY);
      safeSave(PROGRAM_KEY, [application, ...items]);
      setFormStatus(form, "교육 신청이 임시 저장되었습니다. 신청확인 화면으로 이동합니다.");
      window.setTimeout(() => {
        window.location.href = "program-check.html";
      }, 450);
    });
  };

  const renderList = (container, items, type) => {
    if (!container) return;
    const emptyText = type === "space" ? "아직 저장된 공간 예약이 없습니다." : "아직 저장된 교육 신청이 없습니다.";
    const rows = items.length ? items : [];
    container.innerHTML = rows.length
      ? rows
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

  const setupCheckLists = () => {
    const spaceList = document.querySelector("[data-space-reservation-list]");
    if (spaceList) {
      renderList(spaceList, [...safeParse(SPACE_KEY), ...sampleSpaceReservations], "space");
    }

    const programList = document.querySelector("[data-program-application-list]");
    if (programList) {
      renderList(programList, [...safeParse(PROGRAM_KEY), ...sampleProgramApplications], "program");
    }
  };

  const renderAdminList = (container, items, type) => {
    if (!container) return;
    container.innerHTML = items
      .map((item) => {
        const title = type === "space" ? item.spaceName : item.programName;
        const date = type === "space" ? item.startDate || "-" : item.createdAt?.slice(0, 10) || "-";
        return `
          <article class="admin-item">
            <div>
              <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
              <strong>${escapeHtml(title)}</strong>
              <p>${escapeHtml(item.id)} · ${escapeHtml(item.applicant || "-")} · ${escapeHtml(date)}</p>
            </div>
            <select data-admin-status="${escapeHtml(type)}" data-admin-id="${escapeHtml(item.id)}">
              ${["승인대기", "승인완료", "접수완료", "확인중", "이용완료", "수강완료", "반려"].map(
                (status) => `<option${status === item.status ? " selected" : ""}>${status}</option>`,
              ).join("")}
            </select>
          </article>
        `;
      })
      .join("");
  };

  const setupAdminPage = () => {
    const dashboard = document.querySelector("[data-admin-dashboard]");
    if (!dashboard) return;

    const spaceItems = [...safeParse(SPACE_KEY), ...sampleSpaceReservations];
    const programItems = [...safeParse(PROGRAM_KEY), ...sampleProgramApplications];

    dashboard.querySelector("[data-admin-space-count]").textContent = String(spaceItems.length);
    dashboard.querySelector("[data-admin-program-count]").textContent = String(programItems.length);
    dashboard.querySelector("[data-admin-waiting-count]").textContent = String(
      [...spaceItems, ...programItems].filter((item) => ["승인대기", "확인중"].includes(item.status)).length,
    );

    renderAdminList(dashboard.querySelector("[data-admin-space-list]"), spaceItems, "space");
    renderAdminList(dashboard.querySelector("[data-admin-program-list]"), programItems, "program");

    dashboard.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.dataset.adminStatus) return;
      const key = target.dataset.adminStatus === "space" ? SPACE_KEY : PROGRAM_KEY;
      const items = safeParse(key);
      const updated = items.map((item) =>
        item.id === target.dataset.adminId ? { ...item, status: target.value } : item,
      );
      safeSave(key, updated);
    });
  };

  setupSpaceReservationForms();
  setupProgramApplyForm();
  setupCheckLists();
  setupAdminPage();
})();

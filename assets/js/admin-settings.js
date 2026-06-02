(() => {
  const config = window.KKOOM_SUPABASE || {};
  const form = document.querySelector("[data-admin-register-form]");
  const list = document.querySelector("[data-admin-allowlist]");
  const roleLabel = document.querySelector("[data-admin-settings-role]");
  let staffItems = [];
  let selectedStaffEmail = "";

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

  const roleName = (value) => (value === "super_admin" ? "관리자" : "스텝");

  const genderName = (value) => {
    if (value === "female") return "여";
    if (value === "male") return "남";
    return "-";
  };

  const genderFormValue = (value) => (value === "female" || value === "male" ? value : "");

  const activeName = (value) => (value ? "활성" : "비활성");
  const activeClass = (value) => (value ? "admin-staff-active" : "admin-staff-inactive");
  const roleClass = (value) => (value === "super_admin" ? "admin-staff-role-admin" : "admin-staff-role-staff");
  const boolFormValue = (value) => (value === false || value === "false" ? "false" : "true");

  const setStatus = (message, isError = false) => {
    const status = form?.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
  };

  const callStaffAction = async (session, action, payload = {}) => {
    const response = await window.fetch(`${config.url}/functions/v1/public-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const rawError = String(result.error || "");
      const message =
        rawError.startsWith("지원하지")
          ? "관리자·스텝 설정 기능을 사용하려면 서버 함수 재배포가 필요합니다."
          : rawError || "관리자·스텝 처리 중 문제가 발생했습니다.";
      throw new Error(message);
    }
    return result;
  };

  const renderList = (items) => {
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<article class="empty-state"><strong>등록된 관리자·스텝이 없습니다.</strong></article>';
      return;
    }

    list.innerHTML = `
      <div class="admin-settings-table-wrap">
        <table class="admin-settings-table" aria-label="관리자·스텝 목록">
          <colgroup>
            <col class="admin-settings-col-active">
            <col class="admin-settings-col-role">
            <col class="admin-settings-col-display">
            <col class="admin-settings-col-name">
            <col class="admin-settings-col-email">
            <col class="admin-settings-col-birth">
            <col class="admin-settings-col-gender">
          </colgroup>
          <thead>
            <tr>
              <th>상태</th>
              <th>권한</th>
              <th>표시명</th>
              <th>이름</th>
              <th>이메일</th>
              <th>생년월일</th>
              <th>성별</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => {
                  const email = String(item.email || "");
                  const isSelected = email.toLowerCase() === selectedStaffEmail.toLowerCase();
                  const rowClasses = [item.isActive ? "" : "is-inactive", isSelected ? "is-selected" : ""].filter(Boolean).join(" ");
                  return `
                  <tr
                    class="${rowClasses}"
                    data-staff-email="${escapeHtml(email)}"
                    data-staff-name="${escapeHtml(item.fullName || "")}"
                    data-staff-display-name="${escapeHtml(item.displayName || item.fullName || "")}"
                    data-staff-birth-date="${escapeHtml(item.birthDate || "")}"
                    data-staff-gender="${escapeHtml(genderFormValue(item.gender))}"
                    data-staff-role="${escapeHtml(item.adminRole || "board_admin")}"
                    data-staff-active="${escapeHtml(boolFormValue(item.isActive))}"
                  >
                    <td><span class="admin-status-badge ${activeClass(item.isActive)}">${escapeHtml(activeName(item.isActive))}</span></td>
                    <td><span class="admin-status-badge ${roleClass(item.adminRole)}">${escapeHtml(roleName(item.adminRole))}</span></td>
                    <td class="admin-settings-text-strong admin-settings-name-cell">
                      <button type="button" data-staff-edit title="${escapeHtml(item.displayName || item.fullName || "표시명 미입력")}">${escapeHtml(item.displayName || item.fullName || "표시명 미입력")}</button>
                    </td>
                    <td class="admin-settings-name-cell">
                      <button type="button" data-staff-edit title="${escapeHtml(item.fullName || "-")}">${escapeHtml(item.fullName || "-")}</button>
                    </td>
                    <td class="admin-settings-email-cell" title="${escapeHtml(email)}">${escapeHtml(email)}</td>
                    <td>${escapeHtml(item.birthDate || "-")}</td>
                    <td>${escapeHtml(genderName(item.gender))}</td>
                  </tr>
                `;
                },
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const init = async () => {
    if (!client || !form || !list) {
      setStatus("Supabase 연결 정보가 필요합니다.", true);
      return;
    }

    const { data } = await client.auth.getSession();
    const session = data?.session;
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, admin_role, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    const isSuperAdmin = profile?.role === "admin" && profile?.admin_role === "super_admin";
    if (roleLabel) roleLabel.textContent = isSuperAdmin ? "관리자" : "권한 없음";

    if (!isSuperAdmin) {
      form.hidden = true;
      list.innerHTML = '<article class="empty-state"><strong>관리자만 관리자·스텝 설정을 사용할 수 있습니다.</strong><p>스텝은 소식마당 게시판 관리만 가능합니다.</p></article>';
      return;
    }

    const loadStaff = async () => {
      const result = await callStaffAction(session, "staff-list");
      staffItems = result.items || [];
      renderList(staffItems);
    };

    await loadStaff();

    list.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const item = target.closest("[data-staff-email]");
      if (!(item instanceof HTMLElement)) return;
      const email = item.dataset.staffEmail;
      if (!email) return;

      if (!target.closest("[data-staff-edit]")) return;

      selectedStaffEmail = email;
      renderList(staffItems);
      form.elements.fullName.value = item.dataset.staffName || "";
      form.elements.displayName.value = item.dataset.staffDisplayName || "";
      form.elements.birthDate.value = item.dataset.staffBirthDate || "";
      form.elements.gender.value = genderFormValue(item.dataset.staffGender);
      form.elements.email.value = email;
      form.elements.adminRole.value = item.dataset.staffRole || "board_admin";
      if (form.elements.isActive) form.elements.isActive.value = boolFormValue(item.dataset.staffActive);
      setStatus(`수정 중: ${email}`);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.elements.fullName.focus();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      const payload = {
        fullName: form.elements.fullName.value.trim(),
        displayName: form.elements.displayName.value.trim(),
        birthDate: form.elements.birthDate.value,
        gender: form.elements.gender.value,
        email: form.elements.email.value.trim(),
        adminRole: form.elements.adminRole.value,
        isActive: form.elements.isActive ? form.elements.isActive.value === "true" : true,
      };

      if (!payload.fullName || !payload.displayName || !payload.birthDate || !payload.gender || !payload.email) {
        setStatus("이름, 표시명, 생년월일, 성별, 이메일을 모두 입력해주세요.", true);
        return;
      }

      submitButton.disabled = true;
      setStatus("관리자·스텝 정보를 저장하고 있습니다.");
      try {
        const result = await callStaffAction(session, "staff-save", payload);
        setStatus(result.warning ? `저장은 완료되었지만 초대 메일 발송 확인이 필요합니다: ${result.warning}` : "관리자·스텝 정보가 저장되었습니다.");
        selectedStaffEmail = "";
        form.reset();
        if (form.elements.isActive) form.elements.isActive.value = "true";
        await loadStaff();
      } catch (error) {
        setStatus(error.message || "관리자·스텝 저장 중 문제가 발생했습니다.", true);
      } finally {
        submitButton.disabled = false;
      }
    });
  };

  init().catch((error) => {
    setStatus(error.message || "관리자·스텝 설정을 불러오지 못했습니다.", true);
    if (list) {
      list.innerHTML = '<article class="empty-state"><strong>관리자·스텝 설정을 불러오지 못했습니다.</strong></article>';
    }
  });
})();

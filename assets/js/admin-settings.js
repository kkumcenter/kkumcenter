(() => {
  const config = window.KKOOM_SUPABASE || {};
  const form = document.querySelector("[data-admin-register-form]");
  const list = document.querySelector("[data-admin-allowlist]");
  const roleLabel = document.querySelector("[data-admin-settings-role]");

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

  const activeName = (value) => (value ? "활성" : "제외");
  const activeClass = (value) => (value ? "admin-staff-active" : "admin-staff-inactive");
  const roleClass = (value) => (value === "super_admin" ? "admin-staff-role-admin" : "admin-staff-role-staff");

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
            <col class="admin-settings-col-actions">
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
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
                  <tr
                    class="${item.isActive ? "" : "is-inactive"}"
                    data-staff-email="${escapeHtml(item.email)}"
                    data-staff-name="${escapeHtml(item.fullName || "")}"
                    data-staff-display-name="${escapeHtml(item.displayName || item.fullName || "")}"
                    data-staff-birth-date="${escapeHtml(item.birthDate || "")}"
                    data-staff-gender="${escapeHtml(genderFormValue(item.gender))}"
                    data-staff-role="${escapeHtml(item.adminRole || "board_admin")}"
                  >
                    <td><span class="admin-status-badge ${activeClass(item.isActive)}">${escapeHtml(activeName(item.isActive))}</span></td>
                    <td><span class="admin-status-badge ${roleClass(item.adminRole)}">${escapeHtml(roleName(item.adminRole))}</span></td>
                    <td class="admin-settings-text-strong">${escapeHtml(item.displayName || item.fullName || "표시명 미입력")}</td>
                    <td>${escapeHtml(item.fullName || "-")}</td>
                    <td class="admin-settings-email-cell" title="${escapeHtml(item.email)}">${escapeHtml(item.email)}</td>
                    <td>${escapeHtml(item.birthDate || "-")}</td>
                    <td>${escapeHtml(genderName(item.gender))}</td>
                    <td class="admin-settings-actions-cell">
                      <div class="admin-settings-actions">
                        <button type="button" data-staff-edit>정보 수정</button>
                        <select aria-label="${escapeHtml(item.email)} 권한 변경" data-staff-role-select>
                          <option value="super_admin"${item.adminRole === "super_admin" ? " selected" : ""}>관리자</option>
                          <option value="board_admin"${item.adminRole === "board_admin" ? " selected" : ""}>스텝</option>
                        </select>
                        <button type="button" data-staff-role-update>권한 변경</button>
                        ${
                          item.isActive
                            ? `<button type="button" data-staff-deactivate>제외</button>`
                            : `<button type="button" data-staff-reactivate>복구</button>`
                        }
                      </div>
                    </td>
                  </tr>
                `,
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
      renderList(result.items || []);
    };

    await loadStaff();

    list.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const item = target.closest("[data-staff-email]");
      if (!(item instanceof HTMLElement)) return;
      const email = item.dataset.staffEmail;
      if (!email) return;

      const roleSelect = item.querySelector("[data-staff-role-select]");
      const selectedRole = roleSelect instanceof HTMLSelectElement ? roleSelect.value : "";
      const actionButton = target.closest("button");
      if (!(actionButton instanceof HTMLButtonElement)) return;

      if (actionButton.matches("[data-staff-edit]")) {
        form.elements.fullName.value = item.dataset.staffName || "";
        form.elements.displayName.value = item.dataset.staffDisplayName || "";
        form.elements.birthDate.value = item.dataset.staffBirthDate || "";
        form.elements.gender.value = genderFormValue(item.dataset.staffGender);
        form.elements.email.value = email;
        form.elements.adminRole.value = item.dataset.staffRole || selectedRole || "board_admin";
        setStatus("수정할 내용을 확인한 뒤 등록 / 수정을 눌러주세요.");
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        form.elements.fullName.focus();
        return;
      }

      actionButton.disabled = true;
      try {
        if (actionButton.matches("[data-staff-role-update]")) {
          await callStaffAction(session, "staff-role-update", { email, adminRole: selectedRole });
          setStatus("권한이 변경되었습니다.");
        } else if (actionButton.matches("[data-staff-deactivate]")) {
          if (!window.confirm(`${email} 계정을 제외할까요?`)) return;
          await callStaffAction(session, "staff-deactivate", { email });
          setStatus("관리자·스텝이 제외되었습니다.");
        } else if (actionButton.matches("[data-staff-reactivate]")) {
          await callStaffAction(session, "staff-reactivate", { email });
          setStatus("관리자·스텝이 복구되었습니다.");
        } else {
          return;
        }
        await loadStaff();
      } catch (error) {
        setStatus(error.message || "관리자·스텝 처리 중 문제가 발생했습니다.", true);
      } finally {
        actionButton.disabled = false;
      }
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
        form.reset();
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

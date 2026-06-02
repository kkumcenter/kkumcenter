(() => {
  const config = window.KKOOM_SUPABASE || {};
  const form = document.querySelector("[data-auth-form]");
  const title = document.querySelector("[data-auth-title]");
  const submitButton = document.querySelector("[data-auth-submit]");
  const emailInput = document.querySelector("[data-auth-email]");
  const passwordInput = document.querySelector("[data-auth-password]");
  const statusBox = document.querySelector("[data-auth-status]");
  const userPanel = document.querySelector("[data-auth-user]");
  const userEmail = document.querySelector("[data-auth-user-email]");
  const logoutButton = document.querySelector("[data-auth-logout]");

  if (!form || !title || !submitButton || !emailInput || !passwordInput || !statusBox) return;

  const hasConfig = Boolean(config.url && config.anonKey && window.supabase);
  const client = hasConfig
    ? window.KKOOM_SUPABASE_CLIENT || window.supabase.createClient(config.url, config.anonKey)
    : null;

  if (client && !window.KKOOM_SUPABASE_CLIENT) {
    window.KKOOM_SUPABASE_CLIENT = client;
  }

  const setStatus = (message, type = "info") => {
    if (!message) {
      statusBox.textContent = "";
      statusBox.removeAttribute("data-status");
      statusBox.hidden = true;
      return;
    }
    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.dataset.status = type;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const requireConfig = () => {
    if (hasConfig) return true;
    setStatus("로그인 설정을 확인해주세요.", "warning");
    return false;
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await client
      .from("profiles")
      .select("id, email, role, admin_role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const isAdminProfile = (profile) =>
    profile?.role === "admin" && ["super_admin", "board_admin"].includes(profile.admin_role);

  const ensureAdminSession = async (session) => {
    if (!session?.user?.id) return null;
    const profile = await fetchProfile(session.user.id);
    if (!isAdminProfile(profile)) {
      await client.auth.signOut();
      throw new Error("등록된 관리자 또는 스텝만 이용할 수 있습니다.");
    }
    return profile;
  };

  const renderUser = async () => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    const session = data?.session;
    userPanel.hidden = true;

    if (!session) return;

    try {
      const profile = await ensureAdminSession(session);
      if (userEmail) {
        const roleName = profile.admin_role === "super_admin" ? "관리자" : "스텝";
        const email = session.user.email || "로그인 계정";
        userEmail.innerHTML = `<span class="auth-login-text">현재 ${escapeHtml(email)} 계정으로 로그인되어 있습니다.</span><span class="auth-role-badge">${escapeHtml(roleName)}</span>`;
      }
      userPanel.hidden = false;
      setStatus("");
    } catch (error) {
      setStatus(error.message || "권한 확인 중 문제가 발생했습니다.", "error");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireConfig()) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setStatus("이메일과 비밀번호를 입력해주세요.", "warning");
      return;
    }

    submitButton.disabled = true;
    setStatus("로그인 정보를 확인하고 있습니다.", "info");

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await ensureAdminSession(data.session);
      setStatus("로그인되었습니다. 관리 화면으로 이동합니다.", "success");
      window.setTimeout(() => {
        window.location.href = profile.admin_role === "super_admin" ? "admin.html" : "news.html";
      }, 350);
    } catch (error) {
      setStatus(error.message || "로그인 중 문제가 발생했습니다.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton?.addEventListener("click", async () => {
    if (!requireConfig()) return;
    const { error } = await client.auth.signOut();
    if (error) {
      setStatus(error.message || "로그아웃 중 문제가 발생했습니다.", "error");
      return;
    }
    userPanel.hidden = true;
    setStatus("로그아웃되었습니다.", "success");
  });

  if (!hasConfig) {
    setStatus("");
  } else {
    renderUser();
  }
})();

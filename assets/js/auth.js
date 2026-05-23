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
  const loginModeButton = document.querySelector('[data-auth-mode="login"]');
  const signupModeButton = document.querySelector('[data-auth-mode="signup"]');
  const providerButtons = Array.from(document.querySelectorAll("[data-auth-provider]"));
  const placeholderLinks = Array.from(document.querySelectorAll("[data-auth-placeholder]"));

  if (!form || !title || !submitButton || !emailInput || !passwordInput || !statusBox) {
    return;
  }

  const hasConfig = Boolean(config.url && config.anonKey && window.supabase);
  const redirectTo = config.redirectTo || `${window.location.origin}${window.location.pathname}`;
  const client = hasConfig ? window.supabase.createClient(config.url, config.anonKey) : null;
  let mode = "login";

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

  const requireConfig = () => {
    if (hasConfig) return true;
    setStatus("Supabase 연결 정보가 아직 입력되지 않았습니다. assets/js/supabase-config.js에 프로젝트 URL과 anon public key를 넣으면 실제 로그인이 작동합니다.", "warning");
    return false;
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    const isSignup = mode === "signup";
    title.textContent = isSignup ? "회원가입" : "로그인";
    submitButton.textContent = isSignup ? "회원가입하기" : "로그인";
    passwordInput.setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
    loginModeButton.hidden = !isSignup;
    setStatus(isSignup ? "이메일 형식의 아이디와 비밀번호를 입력하고 회원가입하기를 눌러주세요." : "");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const renderUser = async () => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    const session = data?.session;
    userPanel.hidden = !session;
    if (session && userEmail) {
      userEmail.textContent = `${session.user.email || "회원"}님이 로그인되어 있습니다.`;
      setStatus("로그인 상태입니다.", "success");
    }
  };

  signupModeButton?.addEventListener("click", () => setMode("signup"));
  loginModeButton?.addEventListener("click", () => setMode("login"));

  placeholderLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setStatus("해당 기능은 추후 연결 예정입니다.", "info");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireConfig()) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setStatus("이메일과 비밀번호를 모두 입력해주세요.", "warning");
      return;
    }

    submitButton.disabled = true;
    setStatus(mode === "signup" ? "회원가입을 진행하고 있습니다." : "로그인하고 있습니다.", "info");

    try {
      const result = mode === "signup"
        ? await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo }
          })
        : await client.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (mode === "signup") {
        setStatus("회원가입 요청이 완료되었습니다. Supabase 이메일 인증 설정에 따라 확인 메일이 발송될 수 있습니다.", "success");
      } else {
        setStatus("로그인되었습니다.", "success");
      }

      await renderUser();
    } catch (error) {
      setStatus(error.message || "인증 처리 중 문제가 발생했습니다.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  providerButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!requireConfig()) return;

      const provider = button.dataset.authProvider;

      if (provider === "naver") {
        setStatus("네이버 로그인은 Supabase 기본 소셜 로그인 목록에 없어 별도 OAuth 구성이 필요합니다. 먼저 이메일, 구글, 카카오 로그인을 연결한 뒤 추가 검토가 필요합니다.", "warning");
        return;
      }

      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });

      if (error) {
        setStatus(error.message || "간편 로그인 연결 중 문제가 발생했습니다.", "error");
      }
    });
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

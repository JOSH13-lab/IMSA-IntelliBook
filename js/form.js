/* IMSA IntelliBook - Authentification */
(function () {
  const API = "http://localhost:5000/api";

  function getEl(id) {
    return document.getElementById(id);
  }

  function showToast(message, type = "success") {
    if (window.imsaToast) {
      window.imsaToast(message, type === "danger" ? "error" : type);
      return;
    }
    alert(message);
  }

  function saveSession(data) {
    localStorage.setItem("imsa_user", JSON.stringify(data.user));
    localStorage.setItem("imsa_access_token", data.accessToken);
    localStorage.setItem("imsa_refresh_token", data.refreshToken);
  }

  function redirectAfterAuth(user) {
    if (user?.user_type === "administrateur") {
      window.location.href = "utilisateurs.html";
      return;
    }
    window.location.href = "profil.html";
  }

  function switchMode(mode) {
    const loginForm = getEl("loginForm");
    const registerForm = getEl("registerForm");
    const title = document.querySelector(".form-panel h1");
    const subtitle = document.querySelector(".form-panel .text-muted.mb-0");
    const loginBtn = getEl("showLoginMode");
    const registerBtn = getEl("showRegisterMode");
    if (!loginForm || !registerForm) return;

    const isLogin = mode === "login";
    loginForm.classList.toggle("d-none", !isLogin);
    registerForm.classList.toggle("d-none", isLogin);

    if (title) title.textContent = isLogin ? "Connexion" : "Créer un compte";
    if (subtitle) {
      subtitle.textContent = isLogin
        ? "Connectez-vous pour accéder à votre compte IMSA IntelliBook."
        : "Inscrivez-vous gratuitement et accédez au catalogue IMSA IntelliBook.";
    }

    if (loginBtn) {
      loginBtn.className = `btn ${isLogin ? "btn-blue-dark" : "btn-orange-outline"} rounded-pill px-4 fw-bold`;
    }
    if (registerBtn) {
      registerBtn.className = `btn ${isLogin ? "btn-orange-outline" : "btn-blue-dark"} rounded-pill px-4 fw-bold`;
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Connexion impossible.");
    }
    return data.data;
  }

  async function register(formData) {
    const payload = {
      fullname: formData.get("fullname"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      city: formData.get("city"),
      usertype: formData.get("usertype"),
      institution: formData.get("institution"),
      password: formData.get("password")
    };

    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Inscription impossible.");
    }
    return data.data;
  }

  function wireLogin() {
    const form = getEl("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = getEl("loginEmail")?.value?.trim();
      const password = getEl("loginPassword")?.value || "";
      if (!email || !password) {
        showToast("Veuillez renseigner votre email et votre mot de passe.", "warning");
        return;
      }

      try {
        const data = await login(email, password);
        saveSession(data);
        showToast("Connexion réussie.", "success");
        redirectAfterAuth(data.user);
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  function wireRegister() {
    const form = getEl("registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = getEl("password")?.value || "";
      const confirm = getEl("confirm_password")?.value || "";
      if (password !== confirm) {
        showToast("Les mots de passe ne correspondent pas.", "warning");
        return;
      }
      if (!getEl("cgu")?.checked) {
        showToast("Vous devez accepter les conditions d’utilisation.", "warning");
        return;
      }

      try {
        const data = await register(new FormData(form));
        saveSession(data);
        showToast("Compte créé avec succès.", "success");
        redirectAfterAuth(data.user);
      } catch (err) {
        showToast(err.message, "danger");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    getEl("showLoginMode")?.addEventListener("click", () => switchMode("login"));
    getEl("showRegisterMode")?.addEventListener("click", () => switchMode("register"));
    wireLogin();
    wireRegister();
    switchMode("login");
  });
})();

/* IMSA IntelliBook - Validation inscription */
(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function setFieldValidity(inputEl, feedbackEl, valid, message) {
    if (!inputEl || !feedbackEl) return;
    inputEl.classList.toggle("is-valid", !!valid);
    inputEl.classList.toggle("is-invalid", !valid);
    feedbackEl.textContent = message || "";
    feedbackEl.style.display = valid ? "none" : "block";
  }

  function passwordStrength(value) {
    const v = value || "";
    let score = 0;
    if (v.length >= 8) score += 1;
    if (/[A-Z]/.test(v)) score += 1;
    if (/[0-9]/.test(v)) score += 1;
    if (/[^A-Za-z0-9]/.test(v)) score += 1;
    if (score <= 1) return { label: "Faible", percent: 25, kind: "weak" };
    if (score === 2) return { label: "Moyen", percent: 50, kind: "medium" };
    if (score === 3) return { label: "Fort", percent: 75, kind: "strong" };
    return { label: "Fort", percent: 100, kind: "strong" };
  }

  function validateField(fieldId, fieldName, value) {
    const v = (value || "").toString().trim();
    switch (fieldName) {
      case "fullname": {
        if (v.length < 3) return { valid: false, message: "Veuillez saisir un nom complet valide." };
        return { valid: true, message: "" };
      }
      case "email": {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (!ok) return { valid: false, message: "Adresse e-mail invalide." };
        return { valid: true, message: "" };
      }
      case "phone": {
        const ok = /^\+241\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/.test(v) || /^\+241\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/.test(v.replace(/\./g, ""));
        if (!ok) return { valid: false, message: "Format de téléphone invalide (ex : +241 01 23 45 67)." };
        return { valid: true, message: "" };
      }
      case "city": {
        if (!v) return { valid: false, message: "Veuillez sélectionner une ville." };
        return { valid: true, message: "" };
      }
      case "usertype": {
        if (!v) return { valid: false, message: "Veuillez sélectionner le type de compte." };
        return { valid: true, message: "" };
      }
      case "institution": {
        if (v.length < 2) return { valid: false, message: "Veuillez renseigner votre institution." };
        return { valid: true, message: "" };
      }
      case "password": {
        if (v.length < 8) return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
        return { valid: true, message: "" };
      }
      case "confirm_password": {
        const pass = getEl("password")?.value || "";
        if (v !== pass) return { valid: false, message: "Les mots de passe ne correspondent pas." };
        return { valid: true, message: "" };
      }
      case "cgu": {
        if (!document.getElementById("cgu")?.checked) return { valid: false, message: "Vous devez accepter les conditions d’utilisation." };
        return { valid: true, message: "" };
      }
      default:
        return { valid: true, message: "" };
    }
  }

  function validateRegisterForm() {
    const errors = {};
    const fields = [
      { id: "fullname", name: "fullname" },
      { id: "email", name: "email" },
      { id: "phone", name: "phone" },
      { id: "city", name: "city" },
      { id: "usertype", name: "usertype" },
      { id: "institution", name: "institution" },
      { id: "password", name: "password" },
      { id: "confirm_password", name: "confirm_password" }
    ];

    fields.forEach((f) => {
      const el = getEl(f.id);
      const res = validateField(f.id, f.name, el ? el.value : "");
      if (!res.valid) errors[f.name] = res.message;
    });

    const cguRes = validateField("cgu", "cgu", getEl("cgu")?.checked ? "1" : "0");
    if (!cguRes.valid) errors["cgu"] = cguRes.message;

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  function updatePasswordStrengthUI() {
    const input = getEl("password");
    const strengthFill = getEl("passwordStrengthFill");
    const strengthLabel = getEl("passwordStrengthLabel");
    if (!input || !strengthFill || !strengthLabel) return;
    const s = passwordStrength(input.value);
    strengthFill.style.width = `${s.percent}%`;
    strengthLabel.textContent = s.label;
    strengthFill.style.background = s.kind === "weak" ? "rgba(232,115,42,0.55)" : "var(--orange)";
  }

  function wireUpValidation() {
    const map = [
      { id: "fullname", feedbackId: "fullnameError", field: "fullname" },
      { id: "email", feedbackId: "emailError", field: "email" },
      { id: "phone", feedbackId: "phoneError", field: "phone" },
      { id: "city", feedbackId: "cityError", field: "city" },
      { id: "usertype", feedbackId: "usertypeError", field: "usertype" },
      { id: "institution", feedbackId: "institutionError", field: "institution" },
      { id: "password", feedbackId: "passwordError", field: "password" },
      { id: "confirm_password", feedbackId: "confirmPasswordError", field: "confirm_password" }
    ];

    map.forEach((m) => {
      const input = getEl(m.id);
      const feedback = getEl(m.feedbackId);
      if (!input || !feedback) return;

      const onBlur = () => {
        const res = validateField(m.id, m.field, input.value);
        setFieldValidity(input, feedback, res.valid, res.message);
      };
      input.addEventListener("blur", onBlur);
      input.addEventListener("input", () => {
        if (input.classList.contains("is-invalid")) {
          const res = validateField(m.id, m.field, input.value);
          setFieldValidity(input, feedback, res.valid, res.message);
        }
      });
    });

    const cgu = getEl("cgu");
    const cguErr = getEl("cguError");
    if (cgu && cguErr) {
      const validate = () => {
        const res = validateField("cgu", "cgu", cgu.checked ? "1" : "0");
        setFieldValidity(cgu, cguErr, res.valid, res.message);
      };
      cgu.addEventListener("change", validate);
    }

    const toggle = document.getElementById("togglePassword");
    if (toggle) {
      const pwd = getEl("password");
      const update = () => {
        const isPwd = pwd && pwd.type === "password";
        toggle.innerHTML = `<i class="fa-solid ${isPwd ? "fa-eye" : "fa-eye-slash"}"></i>`;
      };
      toggle.addEventListener("click", () => {
        if (!pwd) return;
        pwd.type = pwd.type === "password" ? "text" : "password";
        update();
      });
      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") toggle.click();
      });
      update();
    }

    const pwd = getEl("password");
    if (pwd) pwd.addEventListener("input", updatePasswordStrengthUI);
  }

  async function registerUser(formData) {
    try {
      // BACKEND: POST /api/auth/register
      // await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: err };
    }
  }

  function showSuccessToast(message) {
    if (window.imsaToast) {
      window.imsaToast(message, "success");
      return;
    }
    // fallback: Bootstrap Toast sans dépendre d’une fonction globale
    const container = document.getElementById("registerToastContainer") || document.body;
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center text-bg-success border-0";
    toastEl.setAttribute("role", "alert");
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white ms-auto me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
      </div>`;
    container.appendChild(toastEl);
    new bootstrap.Toast(toastEl, { delay: 3200 }).show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireUpValidation();

    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { isValid, errors } = validateRegisterForm();

      // Marque tous les champs en échec si besoin.
      const all = [
        { id: "fullname", feedbackId: "fullnameError", field: "fullname" },
        { id: "email", feedbackId: "emailError", field: "email" },
        { id: "phone", feedbackId: "phoneError", field: "phone" },
        { id: "city", feedbackId: "cityError", field: "city" },
        { id: "usertype", feedbackId: "usertypeError", field: "usertype" },
        { id: "institution", feedbackId: "institutionError", field: "institution" },
        { id: "password", feedbackId: "passwordError", field: "password" },
        { id: "confirm_password", feedbackId: "confirmPasswordError", field: "confirm_password" }
      ];

      if (!isValid) {
        all.forEach((f) => {
          const input = getEl(f.id);
          const feedback = getEl(f.feedbackId);
          if (!input || !feedback) return;
          const msg = errors[f.field];
          if (msg) setFieldValidity(input, feedback, false, msg);
          else setFieldValidity(input, feedback, true, "");
        });

        const cgu = getEl("cgu");
        const cguErr = getEl("cguError");
        if (cgu && cguErr) {
          const msg = errors.cgu;
          if (msg) setFieldValidity(cgu, cguErr, false, msg);
          else setFieldValidity(cgu, cguErr, true, "");
        }
        window.imsaToast && window.imsaToast("Veuillez corriger les champs indiqués.", "error");
        return;
      }

      // Collecte
      const formData = Object.fromEntries(new FormData(form).entries());

      const res = await registerUser(formData);
      if (res && res.ok) {
        showSuccessToast("Compte créé avec succès !");
        // Démo: on simule une session.
        localStorage.setItem("imsa_user", JSON.stringify({ fullname: formData.fullname, email: formData.email, city: formData.city, usertype: formData.usertype }));
        window.setTimeout(() => {
          window.location.href = "profil.html";
        }, 900);
      } else {
        window.imsaToast && window.imsaToast("Erreur lors de la création du compte. Réessayez.", "error");
      }
    });

    // Initial UI force mot de passe
    updatePasswordStrengthUI();
  });

  // Expose pour d’éventuels tests
  window.validateRegisterForm = validateRegisterForm;
})();


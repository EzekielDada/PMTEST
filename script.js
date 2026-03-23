const toast = document.getElementById("toast");
const contactSalesForm = document.getElementById("contactSalesForm");
const loginForm = document.getElementById("loginForm");
const buildForm = document.getElementById("buildForm");
const modalBackdrop = document.getElementById("modalBackdrop");
const sessionId = crypto.randomUUID();
let formStarted = false;
let activeModal = null;
let lastFocusedElement = null;

const eventAliases = {
  homepage_viewed: ["landing_page_viewed"],
  start_building_clicked: ["cta_clicked"],
  contact_sales_cta_clicked: ["cta_clicked"]
};

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

function hasAmplitude() {
  return typeof window.amplitude !== "undefined" && typeof window.amplitude.track === "function";
}

function flushAmplitude() {
  if (typeof window.amplitude?.flush === "function") {
    window.amplitude.flush();
  }
}

function trackEvent(eventName, properties = {}) {
  const payload = {
    ...properties,
    page_name: "ledgerlink-homepage",
    session_id: sessionId,
    tracked_at: new Date().toISOString()
  };

  if (hasAmplitude()) {
    window.amplitude.track(eventName, payload);
    const aliases = eventAliases[eventName] || [];

    aliases.forEach((alias) => {
      window.amplitude.track(alias, {
        ...payload,
        original_event_name: eventName,
        cta_name: payload.label || payload.source || "unknown"
      });
    });

    flushAmplitude();
  } else {
    console.info("[demo analytics fallback]", eventName, payload);
  }
}

function waitForAmplitude() {
  return new Promise((resolve) => {
    if (hasAmplitude()) {
      resolve();
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      if (hasAmplitude() || Date.now() - startedAt > 5000) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, 100);
  });
}

function getEmailDomain(email) {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "unknown";
}

function scrollToTarget(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeActiveModal(reason = "dismissed") {
  if (!activeModal) return;

  const modalId = activeModal.id;
  activeModal.hidden = true;
  modalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");

  trackEvent("modal_closed", {
    modal_id: modalId,
    close_reason: reason
  });

  const elementToRestore = lastFocusedElement;
  activeModal = null;
  lastFocusedElement = null;

  if (elementToRestore instanceof HTMLElement) {
    elementToRestore.focus();
  }
}

function openModal(modalId, trigger) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (activeModal && activeModal !== modal) {
    closeActiveModal("switch");
  }

  lastFocusedElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
  activeModal = modal;
  modal.hidden = false;
  modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");

  trackEvent("modal_opened", {
    modal_id: modalId,
    trigger_label: trigger?.getAttribute?.("data-event-label") || trigger?.textContent?.trim() || "unknown"
  });

  const firstInput = modal.querySelector("input, select, textarea, button");
  if (firstInput instanceof HTMLElement) {
    firstInput.focus();
  }
}

function bindTrackedClicks() {
  const buttons = document.querySelectorAll("[data-event-name]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const eventName = button.getAttribute("data-event-name") || "button_clicked";
      const eventLabel = button.getAttribute("data-event-label") || button.textContent.trim();
      const eventSource = button.getAttribute("data-event-source") || "unknown";
      const scrollTarget = button.getAttribute("data-scroll-target");

      trackEvent(eventName, {
        source: eventSource,
        label: eventLabel
      });

      if (scrollTarget) {
        scrollToTarget(scrollTarget);
      }

      const modalTarget = button.getAttribute("data-modal-target");
      if (modalTarget) {
        openModal(modalTarget, button);
      }
    });
  });
}

function trackLandingView() {
  trackEvent("homepage_viewed", {
    referrer: document.referrer || "direct"
  });
}

function bindContactSalesForm() {
  if (!contactSalesForm) return;

  contactSalesForm.addEventListener(
    "focusin",
    () => {
      if (formStarted) return;

      formStarted = true;
      trackEvent("contact_sales_form_started", {
        form_id: "contact_sales",
        source: "sales_section"
      });
    },
    { once: true }
  );

  contactSalesForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactSalesForm.reportValidity()) {
      return;
    }

    const formData = new FormData(contactSalesForm);
    const workEmail = String(formData.get("work_email") || "");

    trackEvent("contact_sales_form_submitted", {
      form_id: "contact_sales",
      company_name: String(formData.get("company_name") || "").trim(),
      team_size: String(formData.get("team_size") || ""),
      use_case: String(formData.get("use_case") || ""),
      email_domain: getEmailDomain(workEmail),
      message_length: String(formData.get("message") || "").trim().length
    });

    showToast("Thanks. Our sales team will reach out shortly.");
    contactSalesForm.reset();
    formStarted = false;
  });
}

function bindModalControls() {
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", () => closeActiveModal("backdrop"));
  }

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => closeActiveModal("button"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeActiveModal("escape");
    }
  });
}

function bindModalForms() {
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!loginForm.reportValidity()) {
        return;
      }

      const formData = new FormData(loginForm);
      const workEmail = String(formData.get("work_email") || "");

      trackEvent("login_form_submitted", {
        form_id: "login",
        email_domain: getEmailDomain(workEmail)
      });

      showToast("Login request captured. Redirecting to your workspace soon.");
      loginForm.reset();
      closeActiveModal("submitted");
    });
  }

  if (buildForm) {
    buildForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!buildForm.reportValidity()) {
        return;
      }

      const formData = new FormData(buildForm);
      const workEmail = String(formData.get("work_email") || "");
      const workflow = String(formData.get("workflow") || "");
      const companyName = String(formData.get("company_name") || "").trim();
      const launchGoal = String(formData.get("launch_goal") || "").trim();

      trackEvent("start_building_form_submitted", {
        form_id: "start_building",
        email_domain: getEmailDomain(workEmail),
        workflow,
        company_name: companyName,
        launch_goal_length: launchGoal.length
      });

      showToast("Sandbox request captured. We will follow up with setup details.");
      buildForm.reset();
      closeActiveModal("submitted");
    });
  }
}

waitForAmplitude().finally(() => {
  trackLandingView();
  bindTrackedClicks();
  bindContactSalesForm();
  bindModalControls();
  bindModalForms();
});

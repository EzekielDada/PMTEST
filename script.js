const toast = document.getElementById("toast");
const contactSalesForm = document.getElementById("contactSalesForm");
const sessionId = crypto.randomUUID();
let formStarted = false;

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

function trackEvent(eventName, properties = {}) {
  const payload = {
    ...properties,
    page_name: "ledgerlink-homepage",
    session_id: sessionId,
    tracked_at: new Date().toISOString()
  };

  if (hasAmplitude()) {
    window.amplitude.track(eventName, payload);
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

      if (eventName === "login_clicked") {
        showToast("Login flow coming soon.");
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

waitForAmplitude().finally(() => {
  trackLandingView();
  bindTrackedClicks();
  bindContactSalesForm();
});

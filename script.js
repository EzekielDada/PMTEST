const toast = document.getElementById("toast");
const debugAmplitude = document.getElementById("debugAmplitude");
const debugEvent = document.getElementById("debugEvent");
const contactSalesForm = document.getElementById("contactSalesForm");
const TRACKING_ENDPOINT = "/api/amplitude";
const STORAGE_KEYS = {
  deviceId: "ledgerlink_device_id"
};
const deviceId = getOrCreateDeviceId();
const sessionId = Date.now();

function getOrCreateDeviceId() {
  try {
    const existingDeviceId = window.localStorage.getItem(STORAGE_KEYS.deviceId);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    const newDeviceId = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEYS.deviceId, newDeviceId);
    return newDeviceId;
  } catch (error) {
    console.warn("[device id unavailable]", error);
    return crypto.randomUUID();
  }
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

function buildPayload(properties = {}) {
  return {
    ...properties,
    page_name: "ledgerlink-homepage",
    device_id: deviceId,
    session_id: sessionId,
    tracked_at: new Date().toISOString()
  };
}

function updateDebugStatus(trackingReady, lastEvent = null) {
  if (debugAmplitude) {
    debugAmplitude.textContent = `Tracking: ${trackingReady ? "ready" : "not ready"}`;
  }

  if (debugEvent && lastEvent) {
    debugEvent.textContent = `Last click: ${lastEvent}`;
  }
}

function sendTrackingEvent(eventName, payload) {
  const requestBody = JSON.stringify({ eventName, payload });

  if (navigator.sendBeacon) {
    const beaconQueued = navigator.sendBeacon(
      TRACKING_ENDPOINT,
      new Blob([requestBody], { type: "application/json" })
    );

    if (beaconQueued) {
      updateDebugStatus(true, eventName);
      return Promise.resolve();
    }
  }

  return fetch(TRACKING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: requestBody,
    keepalive: true
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Tracking proxy returned ${response.status}`);
      }

      updateDebugStatus(true, eventName);
    })
    .catch((error) => {
      console.warn("[tracking proxy failed]", eventName, error);
      console.info("[basic analytics fallback]", eventName, payload);
      updateDebugStatus(false, eventName);
    });
}

function trackEvent(eventName, properties = {}) {
  const payload = buildPayload(properties);
  sendTrackingEvent(eventName, payload).catch(() => {
    updateDebugStatus(false, eventName);
  });
  console.info("[event logged]", eventName, payload);
}

function scrollToTarget(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindTrackedClicks() {
  const buttons = document.querySelectorAll("[data-track-click=\"true\"]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const eventName = button.getAttribute("data-event-name") || "cta_clicked";
      const eventLabel = button.getAttribute("data-event-label") || button.textContent.trim() || "Unlabeled button";
      const eventSource =
        button.getAttribute("data-event-source") ||
        button.closest("form")?.id ||
        button.className ||
        "unknown";
      const scrollTarget = button.getAttribute("data-scroll-target");

      trackEvent(eventName, {
        source: eventSource,
        label: eventLabel,
        button_type: button.type || "button"
      });

      if (scrollTarget) {
        scrollToTarget(scrollTarget);
      }

      if (eventName === "header_login_button_clicked") {
        showToast("Login flow removed. Reach out through Contact Sales if you need access.");
      } else if (eventName === "hero_start_building_button_clicked") {
        showToast("Start building interest captured. Reach out through Contact Sales to continue.");
      }
    });
  });
}

function trackLandingView() {
  trackEvent("landing_page_viewed", {
    referrer: document.referrer || "direct"
  });
}

function getFormDataSnapshot(form) {
  const formData = new FormData(form);

  return {
    full_name: String(formData.get("full_name") || "").trim(),
    work_email: String(formData.get("work_email") || "").trim(),
    company_name: String(formData.get("company_name") || "").trim(),
    team_size: String(formData.get("team_size") || "").trim(),
    use_case: String(formData.get("use_case") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };
}

function getEmailDomain(email) {
  return email.includes("@") ? email.split("@").pop().toLowerCase() : "unknown";
}

function validateContactSalesForm(values) {
  const missingFields = [];

  if (!values.full_name) missingFields.push("full_name");
  if (!values.work_email) missingFields.push("work_email");
  if (!values.company_name) missingFields.push("company_name");
  if (!values.team_size) missingFields.push("team_size");
  if (!values.use_case) missingFields.push("use_case");
  if (!values.message) missingFields.push("message");

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.work_email);

  if (values.work_email && !emailLooksValid) {
    missingFields.push("work_email_invalid");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

function bindRequestDemoJourney() {
  if (!contactSalesForm) return;

  let hasStartedFormJourney = false;

  contactSalesForm.addEventListener("focusin", (event) => {
    const field = event.target;

    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!hasStartedFormJourney) {
      hasStartedFormJourney = true;
      trackEvent("request_demo_form_started", {
        source: "contact_form",
        first_field: field.name || "unknown"
      });
    }
  });

  contactSalesForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = getFormDataSnapshot(contactSalesForm);
    const validation = validateContactSalesForm(values);

    if (!validation.isValid) {
      trackEvent("request_demo_form_validation_failed", {
        source: "contact_form",
        invalid_fields: validation.missingFields,
        invalid_field_count: validation.missingFields.length
      });
      showToast("Please complete all fields with a valid work email.");
      return;
    }

    trackEvent("request_demo_form_submitted", {
      source: "contact_form",
      team_size: values.team_size,
      use_case: values.use_case,
      email_domain: getEmailDomain(values.work_email),
      message_length_bucket: values.message.length > 120 ? "long" : "short"
    });

    showToast("Request received. Our team will follow up soon.");
    contactSalesForm.reset();
    hasStartedFormJourney = false;
  });
}

bindTrackedClicks();
bindRequestDemoJourney();
trackLandingView();
updateDebugStatus(true);

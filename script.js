const toast = document.getElementById("toast");
const debugAmplitude = document.getElementById("debugAmplitude");
const debugEvent = document.getElementById("debugEvent");
const TRACKING_ENDPOINT = "/api/amplitude";
const sessionId = crypto.randomUUID();

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

bindTrackedClicks();
trackLandingView();
updateDebugStatus(true);

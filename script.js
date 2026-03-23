const toast = document.getElementById("toast");
const debugAmplitude = document.getElementById("debugAmplitude");
const debugEvent = document.getElementById("debugEvent");
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

function hasAmplitude() {
  return (
    typeof window.amplitude !== "undefined" &&
    (typeof window.amplitude.logEvent === "function" || typeof window.amplitude.track === "function")
  );
}

function updateDebugStatus(amplitudeReady, lastEvent = null) {
  if (debugAmplitude) {
    debugAmplitude.textContent = `Amplitude: ${amplitudeReady ? "ready" : "not ready"}`;
  }

  if (debugEvent && lastEvent) {
    debugEvent.textContent = `Last click: ${lastEvent}`;
  }
}

function sendToAmplitude(eventName, payload) {
  if (!hasAmplitude()) {
    console.info("[basic analytics fallback]", eventName, payload);
    updateDebugStatus(false, eventName);
    return;
  }

  try {
    if (typeof window.amplitude.logEvent === "function") {
      window.amplitude.logEvent(eventName, payload);
    } else {
      window.amplitude.track(eventName, payload);
    }

    if (typeof window.amplitude.flush === "function") {
      window.amplitude.flush();
    }

    updateDebugStatus(true, eventName);
  } catch (error) {
    console.warn("[amplitude track failed]", eventName, error);
    updateDebugStatus(false, eventName);
  }
}

function trackEvent(eventName, properties = {}) {
  const payload = buildPayload(properties);
  sendToAmplitude(eventName, payload);
  console.info("[event logged]", eventName, payload);
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

waitForAmplitude().finally(() => {
  updateDebugStatus(hasAmplitude());
  console.info("[amplitude ready]", hasAmplitude());
});

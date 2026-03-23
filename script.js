const toast = document.getElementById("toast");
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

function hasAmplitude() {
  return typeof window.amplitude !== "undefined" && typeof window.amplitude.track === "function";
}

function trackEvent(eventName, properties = {}) {
  const payload = {
    ...properties,
    page_name: "signalstack-demo",
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

function bindCtas() {
  const buttons = document.querySelectorAll("[data-cta-name]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const ctaName = button.getAttribute("data-cta-name") || "unknown_cta";
      const ctaLabel = button.getAttribute("data-cta-label") || button.textContent.trim();

      trackEvent("cta_clicked", {
        cta_name: ctaName,
        cta_label: ctaLabel
      });

      showToast(`${ctaLabel} click tracked`);
    });
  });
}

function trackLandingView() {
  trackEvent("landing_page_viewed", {
    referrer: document.referrer || "direct"
  });
}

waitForAmplitude().finally(() => {
  trackLandingView();
  bindCtas();
});

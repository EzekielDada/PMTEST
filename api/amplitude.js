const AMPLITUDE_API_KEY = "799ef184626df359bb25f889e76e4515";
const AMPLITUDE_ENDPOINT = "https://api2.amplitude.com/2/httpapi";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const eventName = body.eventName;
  const payload = body.payload || {};
  const eventTime = payload.tracked_at ? Date.parse(payload.tracked_at) : Date.now();

  if (!eventName) {
    return res.status(400).json({ error: "Missing eventName" });
  }

  try {
    const amplitudeResponse = await fetch(AMPLITUDE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: AMPLITUDE_API_KEY,
        events: [
          {
            event_type: eventName,
            time: Number.isFinite(eventTime) ? eventTime : Date.now(),
            session_id: payload.session_id || Date.now(),
            device_id: payload.device_id || "ledgerlink-anonymous-device",
            user_id: payload.user_id || undefined,
            insert_id: payload.insert_id || `${payload.device_id || "ledgerlink-anonymous-device"}-${eventName}-${eventTime}`,
            event_properties: payload
          }
        ]
      })
    });

    if (!amplitudeResponse.ok) {
      const errorText = await amplitudeResponse.text();
      return res.status(502).json({ error: "Amplitude proxy failed", details: errorText });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected proxy error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

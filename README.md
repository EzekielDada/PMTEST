# Amplitude Assessment Demo

This workspace contains a newly created static landing page for the assessment.

## Files

- `index.html`: the landing page markup with two CTA buttons.
- `styles.css`: the page styling.
- `script.js`: CTA click tracking and a lightweight Amplitude integration placeholder.

## What is already implemented

- Fresh demo landing page
- Two CTA buttons: `Sign Up` and `Request Demo`
- Amplitude-ready tracking is wired into the page
- Event names prepared for Amplitude:
  - `landing_page_viewed`
  - `cta_clicked`

## What still needs the official onboarding link

You are supposed to add Amplitude to the code so the page sends events directly to Amplitude.

What that means in practice:

1. Initialize the Amplitude Browser SDK on the landing page.
2. Send events from the page with `amplitude.track(...)`.
3. Open the page and click the CTA buttons so Amplitude receives test data.
4. Build the funnel and cohort inside Amplitude using the events that arrive there.

The code in this folder already does steps 1 and 2 using the project snippet you supplied.

Once you have the link:

1. Open the onboarding flow and complete the project setup there.
2. Open the page and click both CTAs to send test events.
3. In Amplitude, build:
   - Funnel: `landing_page_viewed` -> `cta_clicked`
   - Behavioral cohort: users who triggered `cta_clicked`
4. Record a short Loom covering:
   - the page
   - the event instrumentation
   - the funnel
   - the cohort
   - key observations from test activity

## Local preview

Open `index.html` in a browser, or serve the folder with any static file server.

## Official references

- Amplitude Javascript tracking guide: https://www.amplitude.com/track/javascript
- Amplitude Browser SDK integration overview: https://amplitude.com/integrations/type-browser-sdk

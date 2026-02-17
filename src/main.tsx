import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initAnalytics } from "@/lib/analytics";

// Cleanup legacy service workers/caches once to avoid stale production bundles.
import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when an error occurs.
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void (async () => {
      const cleanupKey = "dartstreak_sw_cleanup_v1";
      if (localStorage.getItem(cleanupKey) === "1") return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith("dartstreak-"))
              .map((key) => caches.delete(key))
          );
        }
      } finally {
        localStorage.setItem(cleanupKey, "1");
      }
    })();
  });
}

initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Cleanup legacy service workers/caches once to avoid stale production bundles.
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

createRoot(document.getElementById("root")!).render(<App />);

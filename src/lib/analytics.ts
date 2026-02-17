declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

let isInitialized = false;

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const loadGoogleTagScript = (measurementId: string) => {
  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;

  if (document.querySelector(`script[src="${scriptSrc}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptSrc;
  document.head.appendChild(script);
};

export const initAnalytics = () => {
  if (!isBrowser() || !GA_MEASUREMENT_ID || isInitialized) {
    return;
  }

  loadGoogleTagScript(GA_MEASUREMENT_ID);

  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  isInitialized = true;
};

export const trackPageView = (path: string) => {
  if (!isBrowser() || !GA_MEASUREMENT_ID || !window.gtag) {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
};

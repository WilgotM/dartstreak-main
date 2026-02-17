import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsConsent,
  initAnalytics,
  setAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/analytics";

export default function CookieConsent() {
  const { t } = useTranslation();
  const location = useLocation();

  const [isMounted, setIsMounted] = useState(false);
  const [consent, setConsent] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent());
  const [isOpen, setIsOpen] = useState(consent === null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const openSettings = () => setIsOpen(true);
    window.addEventListener("open-cookie-settings", openSettings);
    return () => {
      window.removeEventListener("open-cookie-settings", openSettings);
    };
  }, []);

  const currentPath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search]
  );

  const handleChoice = (nextConsent: AnalyticsConsent) => {
    setAnalyticsConsent(nextConsent);
    setConsent(nextConsent);
    setIsOpen(false);

    if (nextConsent === "accepted") {
      initAnalytics();
      trackPageView(currentPath);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <>
      {isOpen ? (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[70] mx-auto w-auto max-w-xl rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-2xl backdrop-blur-md md:inset-x-0">
          <div className="mb-3 flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/15 p-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t("cookie.title")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("cookie.description")}{" "}
                <Link to="/privacy" className="font-medium text-primary hover:underline">
                  {t("cookie.privacyLink")}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="sm:min-w-[170px]" onClick={() => handleChoice("rejected")}>
              {t("cookie.rejectButton")}
            </Button>
            <Button className="sm:min-w-[170px]" onClick={() => handleChoice("accepted")}>
              {t("cookie.acceptButton")}
            </Button>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}

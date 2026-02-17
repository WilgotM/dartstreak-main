import { useMemo, useState } from "react";
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

  const [consent, setConsent] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent());
  const [isOpen, setIsOpen] = useState(consent === null);

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

  return (
    <>
      {consent !== null && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-md transition hover:text-foreground hover:border-primary/40"
          aria-label={t("cookie.settingsButton")}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("cookie.settingsButton")}
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto w-auto max-w-xl rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-2xl backdrop-blur-md md:inset-x-0">
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
    </>
  );
}

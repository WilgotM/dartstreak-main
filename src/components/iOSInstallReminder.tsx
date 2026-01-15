import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REMINDER_KEY = "ios-install-reminder-last";
const REMINDER_INTERVAL = 14 * 24 * 60 * 60 * 1000;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
}

export function IOSInstallReminder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone()) {
      return;
    }

    const lastShown = localStorage.getItem(REMINDER_KEY);
    if (lastShown) {
      const lastShownAt = parseInt(lastShown, 10);
      if (Date.now() - lastShownAt < REMINDER_INTERVAL) {
        return;
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      localStorage.setItem(REMINDER_KEY, Date.now().toString());
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleShowGuide = () => {
    handleClose();
    navigate("/install-guide");
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-4 left-4 right-4 z-50 mx-auto max-w-md",
        "transform transition-all duration-300 ease-out",
        isClosing ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-4 shadow-xl backdrop-blur-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <Smartphone className="h-6 w-6 text-accent" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("pwa.iosReminder")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("pwa.iosReminderDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleShowGuide} size="sm" variant="default" className="flex-1">
                {t("pwa.showMe")}
              </Button>
              <Button onClick={handleClose} variant="ghost" size="sm">
                {t("pwa.notNow")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

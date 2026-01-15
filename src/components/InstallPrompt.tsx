import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }, 300);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md",
        "transform transition-all duration-300 ease-out",
        isClosing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-4 shadow-xl backdrop-blur-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("pwa.installTitle")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("pwa.installDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1">
                {t("pwa.installButton")}
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

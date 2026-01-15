import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share, MoreVertical, Plus, Check, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android" | "unknown";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "unknown";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
}

interface StepProps {
  number: number;
  text: string;
  icon: React.ReactNode;
  isActive: boolean;
  isComplete: boolean;
}

function Step({ number, text, icon, isActive, isComplete }: StepProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-all duration-500",
        isActive && "border-primary bg-primary/5 shadow-lg",
        isComplete && "border-green-500/50 bg-green-500/5",
        !isActive && !isComplete && "border-border/50 opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          isActive && "bg-primary text-primary-foreground scale-110",
          isComplete && "bg-green-500 text-white",
          !isActive && !isComplete && "bg-muted text-muted-foreground"
        )}
      >
        {isComplete ? <Check className="h-6 w-6" /> : icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {number}
        </p>
        <p className={cn(
          "font-medium transition-colors",
          isActive && "text-foreground",
          !isActive && "text-muted-foreground"
        )}>
          {text}
        </p>
      </div>
    </div>
  );
}

export default function InstallGuide() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [activeStep, setActiveStep] = useState(0);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPlatform(detectPlatform());
      setIsDetecting(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isDetecting) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [isDetecting]);

  const iosSteps = [
    { text: t("pwa.step1Ios"), icon: <Share className="h-5 w-5" /> },
    { text: t("pwa.step2Ios"), icon: <Plus className="h-5 w-5" /> },
    { text: t("pwa.step3Ios"), icon: <Check className="h-5 w-5" /> },
  ];

  const androidSteps = [
    { text: t("pwa.step1Android"), icon: <MoreVertical className="h-5 w-5" /> },
    { text: t("pwa.step2Android"), icon: <Download className="h-5 w-5" /> },
    { text: t("pwa.step3Android"), icon: <Check className="h-5 w-5" /> },
  ];

  const steps = platform === "ios" ? iosSteps : androidSteps;

  if (isStandalone()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-md px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))]">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("pwa.back")}
          </Button>

          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{t("pwa.alreadyInstalled")}</h1>
              <p className="mt-2 text-muted-foreground">{t("pwa.openFromHomeScreen")}</p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full">
              {t("pwa.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <div className="container mx-auto max-w-md px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))]">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("pwa.back")}
        </Button>

        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <img 
              src="/logo.png" 
              alt="DartStreak" 
              className="h-full w-full object-contain"
            />
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg">
              <Download className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">{t("pwa.installGuide")}</h1>
        </div>

        {isDetecting ? (
          <Card className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">{t("pwa.detectingDevice")}</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 rounded-xl bg-muted/50 p-4">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                {platform === "ios" ? t("pwa.iosTitle") : t("pwa.androidTitle")}
              </span>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <Step
                  key={index}
                  number={index + 1}
                  text={step.text}
                  icon={step.icon}
                  isActive={activeStep === index}
                  isComplete={activeStep > index}
                />
              ))}
            </div>

            <div
              className={cn(
                "flex flex-col items-center gap-4 rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center transition-all duration-500",
                activeStep === 3 ? "opacity-100 scale-100" : "opacity-50 scale-95"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-green-500">{t("pwa.done")}</p>
                <p className="text-sm text-muted-foreground">{t("pwa.enjoyApp")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

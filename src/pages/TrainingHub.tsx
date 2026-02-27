import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Flame, Grid3X3 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const trainingCards = [
  {
    key: "ticTacToe",
    to: "/training/tic-tac-toe",
    icon: Grid3X3,
    accent: "from-cyan-400/30 via-blue-500/10 to-transparent",
  },
  {
    key: "redZone",
    to: "/training/red-zone",
    icon: Flame,
    accent: "from-red-500/35 via-orange-400/15 to-transparent",
  },
] as const;

export default function TrainingHub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-10 pb-24 md:pb-10 space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#12121A]/88 p-6 md:p-8 shadow-[0_20px_50px_-26px_rgba(0,0,0,0.75)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),transparent_35%),radial-gradient(circle_at_30%_90%,rgba(34,197,94,0.2),transparent_42%)]" />
          <div className="relative space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300/90">
              {t("trainingHub.kicker")}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {t("trainingHub.title")}
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              {t("trainingHub.subtitle")}
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {trainingCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => navigate(card.to)}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#13131C]/88 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_20px_44px_-28px_rgba(34,197,94,0.65)]"
              >
                <div className={cn("absolute inset-0 opacity-80 bg-gradient-to-br", card.accent)} />
                <div className="relative flex h-full flex-col gap-4">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-foreground/80">
                    <Icon className="w-4 h-4" />
                    {t(`trainingHub.cards.${card.key}.badge`)}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      {t(`trainingHub.cards.${card.key}.title`)}
                    </h2>
                    <p className="text-sm text-foreground/75">
                      {t(`trainingHub.cards.${card.key}.description`)}
                    </p>
                  </div>

                  <div className="pt-3 mt-auto">
                    <Button variant="secondary" className="bg-secondary text-foreground hover:bg-white/20">
                      {t("trainingHub.open")}
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </AppLayout>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { ArrowRight, Target, Trophy, User } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useHaptics } from "@/hooks/useHaptics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PlayerNameWithCountry from "@/components/PlayerNameWithCountry";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { medium } = useHaptics();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse-soft">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Player";
  const actionCards = [
    {
      key: "leagues",
      title: t("nav.leagues"),
      description: t("dashboard.competeDaily"),
      icon: Trophy,
      to: "/leagues",
      accent: "from-emerald-500/22 via-emerald-400/8 to-transparent",
      iconStyle: "text-[#22C55E]",
    },
    {
      key: "profile",
      title: t("nav.profile"),
      description: t("dashboard.viewStats"),
      icon: User,
      to: "/profile",
      accent: "from-cyan-400/20 via-blue-500/8 to-transparent",
      iconStyle: "text-cyan-300",
    },
    {
      key: "training",
      title: t("nav.training"),
      description: t("trainingHub.subtitle"),
      icon: Target,
      to: "/training",
      accent: "from-amber-300/24 via-orange-400/12 to-transparent",
      iconStyle: "text-amber-300",
    },
  ];

  return (
    <AppLayout>
      <div className="relative min-h-full overflow-x-hidden">
        <main className="container mx-auto flex min-h-full max-w-5xl flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-16">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111119]/86 p-6 shadow-[0_20px_52px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(34,197,94,0.26),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.08),transparent_34%)]" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full border border-white/15 bg-[#0D0D12]/90 p-1 shadow-[0_8px_26px_rgba(0,0,0,0.45)]">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-[#22C55E]/20 text-2xl font-bold text-[#22C55E]">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#22C55E]/90">
                    DartStreak
                  </p>
                  <h1 className="text-2xl font-bold leading-tight text-[#FAF8F5] md:text-4xl">
                    {t("dashboard.welcomeBack", { name: displayName })}
                  </h1>
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-[#16161C]/85 px-4 py-2 text-sm text-[#FAF8F5]/85">
                <PlayerNameWithCountry
                  displayName={displayName}
                  countryCode={profile?.country_code}
                  flagSize="md"
                  textClassName="text-[#FAF8F5]"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:mt-6 md:grid-cols-3">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    medium();
                    navigate(card.to);
                  }}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#13131C]/88 p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#22C55E]/35"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`}
                  />
                  <div className="relative flex h-full flex-col">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0D0D12]/78">
                      <Icon className={`h-5 w-5 ${card.iconStyle}`} />
                    </div>
                    <h2 className="text-xl font-bold text-[#FAF8F5]">{card.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#FAF8F5]/70">
                      {card.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#22C55E]">
                      <span>{card.title}</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        </main>
      </div>
    </AppLayout>
  );
}

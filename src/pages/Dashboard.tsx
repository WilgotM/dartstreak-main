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
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D12]">
          <div className="animate-pulse">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
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
      accent: "from-[#22C55E]/15 via-[#22C55E]/5 to-transparent",
      iconStyle: "text-[#22C55E]",
      borderHover: "hover:border-[#22C55E]/40",
    },
    {
      key: "profile",
      title: t("nav.profile"),
      description: t("dashboard.viewStats"),
      icon: User,
      to: "/profile",
      accent: "from-cyan-400/15 via-blue-500/5 to-transparent",
      iconStyle: "text-cyan-400",
      borderHover: "hover:border-cyan-400/40",
    },
    {
      key: "training",
      title: t("nav.training"),
      description: t("trainingHub.subtitle"),
      icon: Target,
      to: "/training",
      accent: "from-amber-400/15 via-orange-400/5 to-transparent",
      iconStyle: "text-amber-400",
      borderHover: "hover:border-amber-400/40",
    },
  ];

  return (
    <AppLayout>
      <div className="relative min-h-full overflow-x-hidden bg-[#0D0D12]">
        <main className="container mx-auto flex min-h-full max-w-5xl flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-16">
          <section
            className="group relative overflow-hidden rounded-[2.5rem] border border-[#FAF8F5]/5 bg-[#16161C]/60 p-8 shadow-[0_20px_52px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:p-10 transition-all duration-500 hover:border-[#FAF8F5]/10"
          >
            {/* Background Effects */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,197,94,0.15),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.03),transparent_40%)]" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5 md:gap-6">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#22C55E]/40 to-transparent blur-[10px] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative rounded-full border border-[#FAF8F5]/15 bg-[#0D0D12] p-1 shadow-2xl">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border border-transparent">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-[#16161C] text-3xl md:text-4xl font-black tracking-tight text-[#22C55E]">
                        {displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="space-y-1 md:space-y-2 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <p className="text-xs md:text-sm font-black uppercase tracking-[0.25em] text-[#22C55E]">
                      DartStreak
                    </p>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-[#FAF8F5] md:text-5xl drop-shadow-lg">
                    {t("dashboard.welcomeBack", { name: displayName })}
                  </h1>
                </div>
              </div>
              <div className="rounded-full border border-[#FAF8F5]/15 bg-[#0D0D12]/80 px-5 py-2.5 text-sm font-semibold text-[#FAF8F5] shadow-[0_0_24px_rgba(10,10,14,0.6)] backdrop-blur-md transition-transform duration-300 hover:scale-[1.03] hover:border-[#22C55E]/40">
                <PlayerNameWithCountry
                  displayName={displayName}
                  countryCode={profile?.country_code}
                  flagSize="md"
                  textClassName="text-[#FAF8F5]"
                />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 md:mt-8 md:grid-cols-3">
            {actionCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    medium();
                    navigate(card.to);
                  }}
                  className={`group relative overflow-hidden rounded-[2rem] border border-[#FAF8F5]/10 bg-[#16161C]/50 p-6 text-left shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:bg-[#16161C]/80 hover:shadow-[0_25px_50px_rgba(0,0,0,0.6)] ${card.borderHover}`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-100 ${card.accent}`}
                  />
                  <div className="relative flex h-full flex-col">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[#FAF8F5]/15 bg-[#0D0D12]/70 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[#0D0D12] group-hover:border-[#FAF8F5]/30">
                      <Icon className={`h-6 w-6 ${card.iconStyle}`} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#FAF8F5]">{card.title}</h2>
                    <p className="mt-2.5 text-sm font-medium leading-relaxed text-[#FAF8F5]/60 transition-colors duration-300 group-hover:text-[#FAF8F5]/85">
                      {card.description}
                    </p>
                    <div className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-bold text-[#FAF8F5]/80 transition-colors duration-300 group-hover:text-[#FAF8F5]">
                      <span className="transition-colors duration-300 group-hover:text-[#FAF8F5]">Execute</span>
                      <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#22C55E]" />
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

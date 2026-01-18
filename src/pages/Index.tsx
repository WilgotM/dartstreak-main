import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Target, Users, Trophy, Video, ArrowRight, Zap, Gamepad2, Play } from "lucide-react";
import { LanguageSwitch } from "@/components/LanguageSwitch";

import { HeroBackground } from "@/components/HeroBackground";

export default function Index() {
  const { user, loading, isGuest, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && (user || isGuest)) {
      navigate("/dashboard");
    }
  }, [user, isGuest, loading, navigate]);

  const scrollToLeagues = () => {
    document.getElementById('leagues')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <HeroBackground />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="DartStreak Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl hidden sm:inline-block">DartStreak</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <Button
              variant="secondary"
              onClick={scrollToLeagues}
              className="hidden sm:inline-flex font-semibold shadow-sm hover:shadow-md transition-all"
            >
              {t("landing.howLeaguesWorkTitle")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              {t("auth.login")}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-0 relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-24 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-8 border border-primary/20 hover:bg-primary/20 transition-colors cursor-default">
              <Zap className="w-4 h-4" />
              {t("landing.tagline")}
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 text-balance leading-[1.1] text-white">
              {t("landing.heroTitle")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                {t("landing.heroHighlight")}
              </span>
              {" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 px-3 py-1 text-white">
                  {t("landing.heroHighlight2")}
                </span>
                <span className="absolute inset-0 bg-primary/20 rounded-2xl -rotate-1 border border-primary/30" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
              {t("landing.heroDescription")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Button
                size="xl"
                className="w-full sm:w-auto text-lg h-14 px-8 shadow-lg shadow-primary/20"
                onClick={() => navigate("/auth", { state: { mode: "signup" } })}
              >
                <Video className="w-5 h-5 mr-2" />
                {t("landing.playOnline")}
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto text-lg h-14 px-8 border-2"
                onClick={() => navigate("/auth", { state: { mode: "signup" } })}
              >
                <Trophy className="w-5 h-5 mr-2" />
                {t("landing.playTournament")}
              </Button>
            </div>

            {/* Quick Play - Guest Mode Button */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl" />
                <Button
                  variant="secondary"
                  size="xl"
                  className="relative w-full sm:w-auto text-lg h-14 px-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
                  onClick={async () => {
                    const { error } = await continueAsGuest();
                    if (!error) {
                      navigate("/dashboard");
                    }
                  }}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t("landing.playFreeNoAccount")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("landing.noSignupRequired")}
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={scrollToLeagues}
                className="w-full sm:w-auto h-auto py-3 px-6 text-sm whitespace-normal leading-tight font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                {t("landing.leaguesTeaser")}
              </Button>
            </div>
          </div>
        </section>

        {/* Why Us / USP Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 border-t border-border/50 bg-secondary/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-16">
              {t("landing.whyUsTitle")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Video className="w-7 h-7" />}
                title={t("landing.whyUs1Title")}
                description={t("landing.whyUs1Desc")}
                color="bg-blue-500/10 text-blue-500"
                delay={0}
              />
              <FeatureCard
                icon={<Gamepad2 className="w-7 h-7" />}
                title={t("landing.whyUs2Title")}
                description={t("landing.whyUs2Desc")}
                color="bg-green-500/10 text-green-500"
                delay={100}
              />
              <FeatureCard
                icon={<Trophy className="w-7 h-7" />}
                title={t("landing.whyUs3Title")}
                description={t("landing.whyUs3Desc")}
                color="bg-yellow-500/10 text-yellow-500"
                delay={200}
              />
            </div>
          </div>
        </section>

        {/* League Explanation Section */}
        <section id="leagues" className="py-24 relative overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          <div className="absolute -left-20 top-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute -right-20 bottom-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-30" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-6xl mx-auto rounded-[2.5rem] border border-primary/20 bg-card/30 backdrop-blur-sm p-8 md:p-16 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

              <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Trophy className="w-3 h-3" />
                  {t("landing.leaguesTitle")}
                </div>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight">
                  {t("landing.howLeaguesWorkTitle")}
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {t("landing.leaguesSubtitle")}
                </p>
              </div>

              <div className="relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute top-[3rem] left-[15%] right-[15%] h-px border-t-2 border-dashed border-primary/30 z-0" />

                <div className="grid md:grid-cols-3 gap-12 relative z-10">
                  <StepCard
                    number={1}
                    title={t("landing.howLeaguesStep1")}
                    description={t("landing.howLeaguesStep1Desc")}
                    icon={<Users className="w-8 h-8" />}
                  />
                  <StepCard
                    number={2}
                    title={t("landing.howLeaguesStep2")}
                    description={t("landing.howLeaguesStep2Desc")}
                    icon={<Target className="w-8 h-8" />}
                  />
                  <StepCard
                    number={3}
                    title={t("landing.howLeaguesStep3")}
                    description={t("landing.howLeaguesStep3Desc")}
                    icon={<Trophy className="w-8 h-8" />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 shadow-2xl">
              <h2 className="text-3xl font-display font-bold mb-6">
                {t("landing.readyToCompete")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                {t("landing.createAccountCta")}
              </p>
              <Button
                variant="default"
                size="xl"
                className="w-full sm:w-auto text-lg h-14 px-10"
                onClick={() => navigate("/auth")}
              >
                {t("landing.createFreeAccount")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
          <p>DartStreak 2026. Made with fair play.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="font-display font-bold text-xl mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  icon
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center relative bg-background md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none border md:border-none border-border">
      <div className="w-20 h-20 rounded-full bg-secondary border-4 border-background flex items-center justify-center text-primary mb-6 shadow-lg z-10 relative">
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        {icon}
      </div>
      <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Target, Users, Trophy, Calendar, ArrowRight, Zap } from "lucide-react";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DartStreak Logo" className="w-12 h-12 object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitch />
            <Button variant="outline" onClick={() => navigate("/auth")}>
              {t("auth.login")}
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              {t("landing.tagline")}
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6 text-balance">
              {t("landing.heroTitle")}{" "}
              <span className="text-primary">{t("landing.heroHighlight")}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              {t("landing.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate("/auth")}
              >
                {t("landing.getStarted")}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="border-2"
                onClick={() => navigate("/auth")}
              >
                {t("auth.continueAsGuest")}
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">
              {t("landing.howItWorks")}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title={t("landing.createLeague")}
                description={t("landing.createLeagueDesc")}
                delay={0}
              />
              <FeatureCard
                icon={<Calendar className="w-6 h-6" />}
                title={t("landing.throwDaily")}
                description={t("landing.throwDailyDesc")}
                delay={100}
              />
              <FeatureCard
                icon={<Trophy className="w-6 h-6" />}
                title={t("landing.followTable")}
                description={t("landing.followTableDesc")}
                delay={200}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-8 rounded-2xl bg-card border-2 border-border shadow-card">
              <h2 className="text-2xl font-display font-bold mb-4">
                {t("landing.readyToCompete")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("landing.createAccountCta")}
              </p>
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/auth")}
              >
                {t("landing.createFreeAccount")}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("landing.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="p-6 rounded-xl bg-card border-2 border-border hover:border-primary/30 hover:shadow-card transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

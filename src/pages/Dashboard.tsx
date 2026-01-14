import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Target, Trophy, Swords, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useMatch } from "@/hooks/useMatch";
import { useFriends } from "@/hooks/useFriends";
import { FriendsSheet } from "@/components/FriendsSheet";

export default function Dashboard() {
  const { user, profile, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pendingMatches } = useMatch();
  const { totalNotifications } = useFriends();

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, isGuest, loading, navigate]);

  if (loading || (!user && !isGuest)) {
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DartStreak Logo" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-display font-bold text-xl">DartStreak</span>
              {profile && (
                <p className="text-sm text-muted-foreground">{t("dashboard.welcomeBack", { name: profile.display_name })}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Guest Warning */}
        {isGuest && (
          <Card className="border-2 border-accent/50 bg-accent/5 overflow-hidden">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-accent/20 p-2 rounded-lg">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-medium">{t("dashboard.isGuestWarning")}</p>
              </div>
              <Button
                variant="hero"
                size="sm"
                className="shrink-0"
                onClick={() => navigate("/auth")}
              >
                {t("dashboard.convertToAccount")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Card
            className={`cursor-pointer hover:shadow-glow transition-all border-2 hover:border-primary/50 ${isGuest ? "opacity-60 cursor-not-allowed" : ""}`}
            onClick={() => !isGuest && navigate("/leagues")}
          >
            <CardContent className="py-6 text-center">
              <Trophy className="w-10 h-10 mx-auto text-primary mb-2" />
              <h3 className="font-display font-semibold">{t("nav.leagues")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("dashboard.competeDaily")}</p>
              {isGuest && <p className="text-[10px] text-accent mt-2 font-medium">ONLINE ONLY</p>}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-glow transition-all border-2 hover:border-primary/50 relative"
            onClick={() => navigate("/matches")}
          >
            <CardContent className="py-6 text-center">
              <Swords className="w-10 h-10 mx-auto text-primary mb-2" />
              <h3 className="font-display font-semibold">{t("nav.matches")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("match.oneVsOne")}</p>
              {pendingMatches.length > 0 && (
                <span className="absolute top-2 right-2 w-6 h-6 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {pendingMatches.length}
                </span>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Pending Challenges */}
        {pendingMatches.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <Swords className="w-5 h-5 text-accent" />
              {t("match.challenges")}
            </h2>
            <div className="space-y-3">
              {pendingMatches.slice(0, 3).map((match) => (
                <Card
                  key={match.id}
                  className="cursor-pointer hover:shadow-glow transition-all border-2 border-accent/30 bg-accent/5"
                  onClick={() => navigate(`/match/${match.id}`)}
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{match.player1_name} {t("match.challengesYou")}</p>
                      <p className="text-sm text-muted-foreground">
                        {match.starting_score} • {match.checkout_type === "double_out" ? t("match.doubleOut") : t("match.straightOut")}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-accent" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Notifications hint */}
        {totalNotifications > 0 && (
          <FriendsSheet>
            <Card className="cursor-pointer hover:shadow-soft transition-all">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t("dashboard.youHaveNotifications", { count: totalNotifications })}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.checkProfile")}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </FriendsSheet>
        )}
      </main>
    </AppLayout>
  );
}

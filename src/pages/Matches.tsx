import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Swords, Trophy, Clock, Bot, ChevronRight, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CreateOfflineMatchDialog } from "@/components/CreateOfflineMatchDialog";
import { CreateOnlineMatchDialog } from "@/components/CreateOnlineMatchDialog";
import { CreateOfflineTournamentDialog } from "@/components/CreateOfflineTournamentDialog";
import { useMatch } from "@/hooks/useMatch";
import { useOfflineTournaments, OfflineTournament } from "@/hooks/useOfflineTournaments";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";

interface MatchHistory {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_name: string;
  player2_name: string;
  starting_score: number;
  checkout_type: string;
  status: string;
  winner_id: string | null;
  player1_score: number;
  player2_score: number | null;
  completed_at: string | null;
  created_at: string;
}

export default function Matches() {
  const { user, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { pendingMatches, refetchPending } = useMatch();
  const { getAllOfflineTournaments, deleteOfflineTournament } = useOfflineTournaments();
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [activeMatches, setActiveMatches] = useState<MatchHistory[]>([]);
  const [offlineTournaments, setOfflineTournaments] = useState<OfflineTournament[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, isGuest, loading, navigate]);

  useEffect(() => {
    if (user || isGuest) {
      fetchMatches();
      fetchOfflineTournaments();
      if (!isGuest) {
        setupRealtimeSubscription();
      }
    }
  }, [user, isGuest]);

  // Polling for offline tournaments (since they're in localStorage)
  useEffect(() => {
    const interval = setInterval(fetchOfflineTournaments, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchOfflineTournaments = () => {
    const tournaments = getAllOfflineTournaments();
    setOfflineTournaments(tournaments);
  };

  const fetchMatches = async () => {
    if (isGuest) {
      const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
      setActiveMatches(localMatches.filter((m: any) => m.status === "active"));
      setMatchHistory(localMatches.filter((m: any) => m.status === "completed"));
      setLoadingMatches(false);
      return;
    }

    if (!user) return;
    // ... rest of fetchMatches ...

    // Fetch all matches where user is involved
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      setLoadingMatches(false);
      return;
    }

    // Get player names
    const playerIds = new Set<string>();
    data?.forEach((m) => {
      playerIds.add(m.player1_id);
      if (m.player2_id) playerIds.add(m.player2_id);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(playerIds));

    const matchesWithNames: MatchHistory[] = (data || []).map((m) => ({
      ...m,
      player1_name: profiles?.find((p) => p.id === m.player1_id)?.display_name || "Unknown",
      player2_name: m.player2_id
        ? profiles?.find((p) => p.id === m.player2_id)?.display_name || "Unknown"
        : "Unknown",
    }));

    setActiveMatches(matchesWithNames.filter((m) => m.status === "active"));
    setMatchHistory(matchesWithNames.filter((m) => m.status === "completed"));
    setLoadingMatches(false);
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const match = payload.new as { player1_id: string; player2_id: string | null };
          // Only refetch if this match involves the current user
          if (match.player1_id === user.id || match.player2_id === user.id) {
            fetchMatches();
            refetchPending();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
      <header className="border-b border-border bg-card/80 backdrop-blur-md fixed top-[calc(56px+env(safe-area-inset-top))] md:top-16 left-0 right-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-display font-bold">{t("nav.matches")}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pt-24">
        {/* New Match Creation Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CreateOfflineMatchDialog>
            <Card className="cursor-pointer hover:shadow-glow transition-all border-dashed border-2 hover:border-primary/50 group bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{t("match.offlineMode")}</h3>
                  <p className="text-sm text-muted-foreground">{t("match.offlineModeDesc")}</p>
                </div>
                <Button variant="ghost" className="group-hover:text-primary">
                  {t("match.startMatch")}
                </Button>
              </CardContent>
            </Card>
          </CreateOfflineMatchDialog>

          {/* Online matches - now available for guests too */}
          <CreateOnlineMatchDialog>
            <Card className="cursor-pointer hover:shadow-glow transition-all border-dashed border-2 hover:border-accent/50 group bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Swords className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{t("match.onlineMode")}</h3>
                  <p className="text-sm text-muted-foreground">{t("match.onlineModeDesc")}</p>
                </div>
                <Button variant="ghost" className="group-hover:text-accent">
                  {t("match.sendChallenge")}
                </Button>
              </CardContent>
            </Card>
          </CreateOnlineMatchDialog>

          {/* Offline Tournament */}
          <CreateOfflineTournamentDialog>
            <Card className="cursor-pointer hover:shadow-glow transition-all border-dashed border-2 hover:border-amber-500/50 group bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Bot className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{t("offlineTournament.title") || "Offline Tournament"}</h3>
                  <p className="text-sm text-muted-foreground">{t("offlineTournament.description") || "Play against bots"}</p>
                </div>
                <Button variant="ghost" className="group-hover:text-amber-500">
                  {t("offlineTournament.create") || "Create Tournament"}
                </Button>
              </CardContent>
            </Card>
          </CreateOfflineTournamentDialog>
        </section>



        {/* Pending Challenges */}
        {pendingMatches.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <Swords className="w-5 h-5 text-accent" />
              {t("match.challenges")}
            </h2>
            <div className="space-y-3">
              {pendingMatches.map((match) => (
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
                    <Button variant="hero" size="sm">
                      {t("match.respond")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Active Offline Tournaments */}
        {offlineTournaments.filter(t => t.status !== "completed").length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-500" />
              {t("offlineTournament.activeTournaments") || "Active Tournaments"}
            </h2>
            <div className="space-y-3">
              {offlineTournaments
                .filter(t => t.status !== "completed")
                .map((tournament) => (
                  <Card
                    key={tournament.id}
                    className="cursor-pointer hover:shadow-glow transition-all border-2 border-amber-500/30 bg-amber-500/5"
                    onClick={() => navigate(`/offline-tournament/${tournament.id}`)}
                  >
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Bot className="w-4 h-4 text-amber-500" />
                          {tournament.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tournament.max_players} {t("tournament.players") || "players"} •
                          {t("tournament.round", { number: tournament.current_round })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOfflineTournament(tournament.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* Active Matches */}
        {activeMatches.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t("match.activeMatches")}
            </h2>
            <div className="space-y-3">
              {activeMatches.map((match) => (
                <Card
                  key={match.id}
                  className="cursor-pointer hover:shadow-glow transition-all border-2 border-primary/30"
                  onClick={() => navigate(`/match/${match.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{match.player1_name}</span>
                      <span className="text-xl font-display font-bold text-primary">{match.player1_score}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{match.player2_name}</span>
                      <span className="text-xl font-display font-bold text-primary">{match.player2_score}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {match.starting_score} • {match.checkout_type === "double_out" ? t("match.doubleOut") : t("match.straightOut")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Match History */}
        <section>
          <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-dart-gold" />
            {t("match.history")}
          </h2>
          {loadingMatches ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="py-4">
                    <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : matchHistory.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Swords className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t("match.noMatches")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {matchHistory.map((match) => {
                const isWinner = match.winner_id === user?.id;
                return (
                  <Card
                    key={match.id}
                    className={`cursor-pointer hover:shadow-soft transition-all ${isWinner ? "border-l-4 border-l-primary" : "border-l-4 border-l-accent"}`}
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${match.winner_id === match.player1_id ? "text-primary" : ""}`}>
                            {match.player1_name}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={`font-semibold ${match.winner_id === match.player2_id ? "text-primary" : ""}`}>
                            {match.player2_name}
                          </span>
                        </div>
                        {isWinner ? (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{t("match.won")}</span>
                        ) : (
                          <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">{t("match.lost")}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {match.player1_score} - {match.player2_score} • {match.completed_at && format(new Date(match.completed_at), "d MMM", { locale: dateLocale })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

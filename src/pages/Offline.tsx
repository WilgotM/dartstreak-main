import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Bot, ChevronRight, Trash2, Trophy, Clock, Wifi, WifiOff } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CreateOfflineMatchDialog } from "@/components/CreateOfflineMatchDialog";
import { CreateOfflineTournamentDialog } from "@/components/CreateOfflineTournamentDialog";
import { useOfflineTournaments, OfflineTournament } from "@/hooks/useOfflineTournaments";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";

interface OfflineMatchHistory {
    id: string;
    player1_name: string;
    player2_name: string;
    starting_score: number;
    checkout_type: string;
    status: string;
    winner_name: string | null;
    completed_at: string | null;
    created_at: string;
}

export default function Offline() {
    const { user, loading, isGuest } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { getAllOfflineTournaments, deleteOfflineTournament } = useOfflineTournaments();
    const [offlineTournaments, setOfflineTournaments] = useState<OfflineTournament[]>([]);
    const [offlineMatches, setOfflineMatches] = useState<OfflineMatchHistory[]>([]);
    const [activeOfflineMatches, setActiveOfflineMatches] = useState<OfflineMatchHistory[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const dateLocale = i18n.language === "sv" ? sv : enUS;

    useEffect(() => {
        if (!loading && !user && !isGuest) {
            navigate("/auth");
        }
    }, [user, isGuest, loading, navigate]);

    useEffect(() => {
        if (user || isGuest) {
            fetchOfflineData();
        }
    }, [user, isGuest]);

    // Polling for offline data (since they're in localStorage)
    useEffect(() => {
        const interval = setInterval(fetchOfflineData, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchOfflineData = () => {
        // Fetch offline tournaments
        const tournaments = getAllOfflineTournaments();
        setOfflineTournaments(tournaments);

        // Fetch offline matches from localStorage
        const guestMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
        const offlineMatchesRaw = JSON.parse(localStorage.getItem("dartstreak_offline_matches") || "[]");
        const allOfflineMatches = [...guestMatches, ...offlineMatchesRaw];

        setActiveOfflineMatches(allOfflineMatches.filter((m: any) => m.status === "active"));
        setOfflineMatches(allOfflineMatches.filter((m: any) => m.status === "completed"));
        setLoadingData(false);
    };

    const deleteOfflineMatch = (matchId: string) => {
        const guestMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
        const offlineMatchesRaw = JSON.parse(localStorage.getItem("dartstreak_offline_matches") || "[]");

        const updatedGuestMatches = guestMatches.filter((m: any) => m.id !== matchId);
        const updatedOfflineMatches = offlineMatchesRaw.filter((m: any) => m.id !== matchId);

        localStorage.setItem("dartstreak_guest_matches", JSON.stringify(updatedGuestMatches));
        localStorage.setItem("dartstreak_offline_matches", JSON.stringify(updatedOfflineMatches));

        fetchOfflineData();
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

    const activeTournaments = offlineTournaments.filter(t => t.status !== "completed");
    const completedTournaments = offlineTournaments.filter(t => t.status === "completed");

    return (
        <AppLayout>
            <header className="border-b border-border bg-card/80 backdrop-blur-md fixed top-[calc(56px+env(safe-area-inset-top))] md:top-16 left-0 right-0 z-40">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-2">
                        <WifiOff className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-display font-bold">{t("nav.offline")}</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t("offline.subtitle")}</p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6 pt-24">
                {/* Create New Section */}
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

                    <CreateOfflineTournamentDialog>
                        <Card className="cursor-pointer hover:shadow-glow transition-all border-dashed border-2 hover:border-amber-500/50 group bg-card/50">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                    <Bot className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-lg">{t("offlineTournament.title")}</h3>
                                    <p className="text-sm text-muted-foreground">{t("offlineTournament.description")}</p>
                                </div>
                                <Button variant="ghost" className="group-hover:text-amber-500">
                                    {t("offlineTournament.create")}
                                </Button>
                            </CardContent>
                        </Card>
                    </CreateOfflineTournamentDialog>
                </section>

                {/* Active Offline Matches */}
                {activeOfflineMatches.length > 0 && (
                    <section>
                        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            {t("offline.activeMatches")}
                        </h2>
                        <div className="space-y-3">
                            {activeOfflineMatches.map((match) => (
                                <Card
                                    key={match.id}
                                    className="cursor-pointer hover:shadow-glow transition-all border-2 border-primary/30"
                                    onClick={() => navigate(`/offline-match/${match.id}`)}
                                >
                                    <CardContent className="py-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {match.player1_name} vs {match.player2_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {match.starting_score} • {match.checkout_type === "double_out" ? t("match.doubleOut") : t("match.straightOut")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteOfflineMatch(match.id);
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

                {/* Active Offline Tournaments */}
                {activeTournaments.length > 0 && (
                    <section>
                        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                            <Bot className="w-5 h-5 text-amber-500" />
                            {t("offlineTournament.activeTournaments")}
                        </h2>
                        <div className="space-y-3">
                            {activeTournaments.map((tournament) => (
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
                                                {tournament.max_players} {t("tournament.players")} •
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

                {/* Completed Tournaments */}
                {completedTournaments.length > 0 && (
                    <section>
                        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-dart-gold" />
                            {t("offline.completedTournaments")}
                        </h2>
                        <div className="space-y-3">
                            {completedTournaments.map((tournament) => (
                                <Card
                                    key={tournament.id}
                                    className="cursor-pointer hover:shadow-soft transition-all border-l-4 border-l-dart-gold"
                                    onClick={() => navigate(`/offline-tournament/${tournament.id}`)}
                                >
                                    <CardContent className="py-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-semibold">{tournament.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {tournament.max_players} {t("tournament.players")} • {t("tournament.completed")}
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

                {/* Offline Match History */}
                <section>
                    <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-dart-gold" />
                        {t("offline.matchHistory")}
                    </h2>
                    {loadingData ? (
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
                    ) : offlineMatches.length === 0 ? (
                        <Card className="text-center py-8">
                            <CardContent>
                                <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">{t("offline.noMatches")}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {offlineMatches.map((match) => (
                                <Card
                                    key={match.id}
                                    className="cursor-pointer hover:shadow-soft transition-all border-l-4 border-l-primary"
                                    onClick={() => navigate(`/offline-match/${match.id}`)}
                                >
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${match.winner_name === match.player1_name ? "text-primary" : ""}`}>
                                                    {match.player1_name}
                                                </span>
                                                <span className="text-muted-foreground">vs</span>
                                                <span className={`font-semibold ${match.winner_name === match.player2_name ? "text-primary" : ""}`}>
                                                    {match.player2_name}
                                                </span>
                                            </div>
                                            {match.winner_name && (
                                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                                    {match.winner_name} {t("match.won")}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {match.starting_score} • {match.completed_at && format(new Date(match.completed_at), "d MMM", { locale: dateLocale })}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* Empty state if nothing exists */}
                {activeTournaments.length === 0 && activeOfflineMatches.length === 0 && offlineMatches.length === 0 && completedTournaments.length === 0 && (
                    <Card className="text-center py-12 mt-4">
                        <CardContent>
                            <WifiOff className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="font-display font-bold text-lg mb-2">{t("offline.emptyTitle")}</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">{t("offline.emptyDesc")}</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </AppLayout>
    );
}

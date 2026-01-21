import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOfflineTournaments } from "@/hooks/useOfflineTournaments";
import { useAuth } from "@/hooks/useAuth";
import { OfflineTournamentBracket } from "@/components/OfflineTournamentBracket";
import {
    Users,
    Target,
    Layers,
    Trophy,
    ArrowLeft,
    Play,
    Bot,
    Loader2,
    PartyPopper,
    Frown,
    Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OfflineTournament() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const {
        getOfflineTournament,
        getUserParticipant,
        getUserNextMatch,
        getBotVsBotMatches,
        simulateBotVsBotMatch,
        setMatchOfflineMatchId,
        deleteOfflineTournament,
    } = useOfflineTournaments();

    const [tournament, setTournament] = useState(getOfflineTournament(id || ""));
    const [loading, setLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);

    // Refresh tournament data
    const refreshTournament = useCallback(() => {
        if (!id) return;
        const data = getOfflineTournament(id);
        setTournament(data);
    }, [id, getOfflineTournament]);

    useEffect(() => {
        refreshTournament();
        setLoading(false);
    }, [id, refreshTournament]);

    // Poll for updates (in case another tab modifies data)
    useEffect(() => {
        const interval = setInterval(refreshTournament, 1000);
        return () => clearInterval(interval);
    }, [refreshTournament]);

    // Simulate bot vs bot matches when in progress
    useEffect(() => {
        if (!tournament || tournament.status !== "in_progress" || isSimulating) return;

        const botMatches = getBotVsBotMatches(tournament);

        if (botMatches.length > 0) {
            setIsSimulating(true);

            // Simulate one bot match at a time with delay
            const simulateNext = async () => {
                for (const match of botMatches) {
                    // Small delay between simulations for visual effect
                    await new Promise(r => setTimeout(r, 500));
                    simulateBotVsBotMatch(tournament.id, match.id);
                    refreshTournament();
                }
                setIsSimulating(false);
            };

            simulateNext();
        }
    }, [tournament?.status, tournament?.current_round, isSimulating, getBotVsBotMatches, simulateBotVsBotMatch, refreshTournament, tournament?.id]);

    // Handle starting user's match
    const handlePlayMatch = async () => {
        if (!tournament || !id) return;

        const userParticipant = getUserParticipant(tournament);
        const match = getUserNextMatch(tournament);

        if (!match || !userParticipant) {
            toast.error("No match found");
            return;
        }

        // Get opponent
        const opponentId = match.player1_participant_id === userParticipant.id
            ? match.player2_participant_id
            : match.player1_participant_id;

        const opponent = tournament.participants.find(p => p.id === opponentId);
        if (!opponent) {
            toast.error("Opponent not found");
            return;
        }

        // Create offline match directly in localStorage with all necessary data
        const playerName = profile?.display_name || userParticipant.display_name;
        const matchId = `offline-match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const playerId = `player-${Date.now()}`;

        const matchData = {
            id: matchId,
            player1_id: playerId,
            player2_id: null,
            starting_score: tournament.starting_score,
            checkout_type: tournament.checkout_type,
            player1_score: tournament.starting_score,
            player2_score: tournament.starting_score,
            current_turn: playerId,
            is_offline: true,
            legs_to_win: tournament.legs_to_win,
            sets_to_win: tournament.sets_to_win,
            player1_legs: 0,
            player2_legs: 0,
            player1_sets: 0,
            player2_sets: 0,
            status: "active",
            winner_id: null,
            started_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            signaling_data: {
                player1_name: playerName,
                player2_name: opponent.bot_name || "Bot",
                bot: {
                    bot_name: opponent.bot_name,
                    bot_average: opponent.bot_average,
                },
                offlineTournament: {
                    tournamentId: tournament.id,
                    matchId: match.id,
                    userParticipantId: userParticipant.id,
                    opponentParticipantId: opponent.id,
                }
            }
        };

        // Save to localStorage
        const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
        localStorage.setItem("dartstreak_guest_matches", JSON.stringify([...localMatches, matchData]));

        // Update tournament match with offline match reference
        setMatchOfflineMatchId(tournament.id, match.id, matchId);

        // Navigate to match
        navigate(`/offline-match/${matchId}`);
    };


    const handleDelete = () => {
        if (!id) return;
        deleteOfflineTournament(id);
        navigate("/matches");
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!tournament) {
        return (
            <AppLayout>
                <div className="container mx-auto px-4 py-6 max-w-4xl">
                    <p className="text-center text-muted-foreground">
                        {t("tournament.notFound")}
                    </p>
                    <Button onClick={() => navigate("/matches")} className="mt-4 mx-auto block">
                        {t("common.back")}
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const userParticipant = getUserParticipant(tournament);
    const userNextMatch = getUserNextMatch(tournament);
    const isUserEliminated = userParticipant?.eliminated_at_round !== null;
    const isUserWinner = tournament.winner_id === userParticipant?.id;
    const canPlayMatch = userNextMatch &&
        userNextMatch.player1_participant_id &&
        userNextMatch.player2_participant_id &&
        userNextMatch.status !== "completed";

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <Link
                    to="/matches"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t("common.back")}
                </Link>

                {/* Tournament Header */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-5 h-5 text-muted-foreground" />
                                    <CardTitle>{tournament.name}</CardTitle>
                                    <Badge variant={tournament.status === "completed" ? "outline" : "default"}>
                                        {tournament.status === "completed"
                                            ? t("tournament.statusCompleted")
                                            : t("tournament.statusInProgress")}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {tournament.max_players} {t("tournament.players") || "players"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Target className="w-4 h-4" />
                                        {tournament.starting_score}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Layers className="w-4 h-4" />
                                        {t("tournament.format", {
                                            legs: tournament.legs_to_win,
                                            sets: tournament.sets_to_win,
                                        })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Trophy className="w-4 h-4" />
                                        {tournament.checkout_type === "double_out"
                                            ? t("match.doubleOut")
                                            : t("match.straightOut")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Bot className="w-4 h-4" />
                                        {tournament.bot_average} avg
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDelete}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Tournament Completed - Winner Banner */}
                {tournament.status === "completed" && isUserWinner && (
                    <Card className="mb-6 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/40">
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <PartyPopper className="w-16 h-16 text-amber-500" />
                                <h2 className="text-2xl font-bold text-amber-600">
                                    {t("offlineTournament.tournamentWon") || "Congratulations! You won the tournament!"}
                                </h2>
                                <p className="text-muted-foreground">
                                    {t("offlineTournament.tournamentWonDesc") || "You defeated all the bots and claimed victory!"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tournament Completed - User Eliminated */}
                {tournament.status === "completed" && !isUserWinner && (
                    <Card className="mb-6 bg-muted/50">
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <Frown className="w-12 h-12 text-muted-foreground" />
                                <h2 className="text-xl font-semibold text-muted-foreground">
                                    {t("offlineTournament.tournamentLost") || "Tournament Over - You were eliminated"}
                                </h2>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* User Eliminated but tournament continues */}
                {tournament.status === "in_progress" && isUserEliminated && (
                    <Card className="mb-6 bg-muted/50">
                        <CardContent className="py-6">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <Frown className="w-10 h-10 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                    {t("offlineTournament.eliminated") || "You were eliminated from the tournament"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Play Match Button */}
                {tournament.status === "in_progress" && canPlayMatch && !isUserEliminated && (
                    <Card className="mb-6 bg-primary/5 border-primary/20">
                        <CardContent className="py-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold mb-1">
                                        {t("offlineTournament.yourMatch") || "Your Match"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {t("tournament.round", { number: userNextMatch.round })}
                                    </p>
                                </div>

                                <Button
                                    onClick={handlePlayMatch}
                                    size="lg"
                                    variant="hero"
                                    className="px-8"
                                >
                                    <Play className="w-5 h-5 mr-2 fill-current" />
                                    {t("offlineTournament.playNow") || "Play Now"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Waiting for bots indicator */}
                {tournament.status === "in_progress" && !canPlayMatch && !isUserEliminated && (
                    <Card className="mb-6 bg-amber-500/10 border-amber-500/20">
                        <CardContent className="py-6">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                <p className="text-sm text-amber-600 font-medium">
                                    {t("offlineTournament.waitingForBots") || "Simulating bot matches..."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bracket */}
                {userParticipant && (
                    <OfflineTournamentBracket
                        matches={tournament.matches}
                        participants={tournament.participants}
                        userParticipantId={userParticipant.id}
                    />
                )}
            </div>
        </AppLayout>
    );
}

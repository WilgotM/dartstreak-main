import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Bot, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { OfflineTournamentParticipant, OfflineTournamentMatch } from "@/hooks/useOfflineTournaments";

interface OfflineTournamentBracketProps {
    matches: OfflineTournamentMatch[];
    participants: OfflineTournamentParticipant[];
    userParticipantId: string;
}

export function OfflineTournamentBracket({
    matches,
    participants,
    userParticipantId,
}: OfflineTournamentBracketProps) {
    const { t } = useTranslation();

    const getParticipant = (participantId: string | null) => {
        if (!participantId) return null;
        return participants.find((p) => p.id === participantId);
    };

    const getParticipantName = (participant: OfflineTournamentParticipant | null) => {
        if (!participant) return t("tournament.tbd");
        if (participant.is_bot) return participant.bot_name || "Bot";
        return participant.display_name || t("match.player1");
    };

    // Group matches by round
    const rounds = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {} as Record<number, OfflineTournamentMatch[]>);

    const numRounds = Object.keys(rounds).length;

    const getRoundName = (round: number) => {
        if (round === numRounds) return t("tournament.final");
        if (round === numRounds - 1) return t("tournament.semiFinal");
        if (round === numRounds - 2) return t("tournament.quarterFinal");
        return t("tournament.round", { number: round });
    };

    const isUserMatch = (match: OfflineTournamentMatch) => {
        return (
            match.player1_participant_id === userParticipantId ||
            match.player2_participant_id === userParticipantId
        );
    };

    const getStatusBadge = (match: OfflineTournamentMatch) => {
        const isMyMatch = isUserMatch(match);

        switch (match.status) {
            case "pending":
                return (
                    <Badge variant="outline" className="text-xs">
                        {t("tournament.pending")}
                    </Badge>
                );
            case "scheduled":
                return (
                    <Badge variant="secondary" className="text-xs">
                        {isMyMatch ? t("offlineTournament.yourMatch") || "Your Match" : t("tournament.scheduled")}
                    </Badge>
                );
            case "in_progress":
                return (
                    <Badge className="text-xs bg-amber-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isMyMatch ? t("offlineTournament.yourMatch") || "Your Match" : t("tournament.inProgress")}
                    </Badge>
                );
            case "completed":
                return (
                    <Badge className="text-xs bg-muted text-muted-foreground">
                        {t("tournament.completed")}
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {t("tournament.bracket")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="flex gap-8 min-w-max pb-4">
                        {Object.entries(rounds)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([round, roundMatches]) => (
                                <div key={round} className="flex flex-col gap-4 min-w-[200px]">
                                    <h3 className="font-semibold text-center text-sm text-muted-foreground">
                                        {getRoundName(Number(round))}
                                    </h3>
                                    <div
                                        className="flex flex-col justify-around flex-1"
                                        style={{ gap: `${Math.pow(2, Number(round)) * 0.5}rem` }}
                                    >
                                        {roundMatches
                                            .sort((a, b) => a.match_number - b.match_number)
                                            .map((match) => {
                                                const p1 = getParticipant(match.player1_participant_id);
                                                const p2 = getParticipant(match.player2_participant_id);
                                                const isMyMatch = isUserMatch(match);

                                                return (
                                                    <div
                                                        key={match.id}
                                                        className={cn(
                                                            "rounded-lg border bg-card p-3",
                                                            isMyMatch && match.status !== "completed" && "border-primary ring-1 ring-primary/20",
                                                            match.status === "completed" && "opacity-75"
                                                        )}
                                                    >
                                                        {/* Player 1 */}
                                                        <div
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded",
                                                                match.winner_participant_id ===
                                                                match.player1_participant_id &&
                                                                "bg-primary/10"
                                                            )}
                                                        >
                                                            {p1?.is_bot ? (
                                                                <Bot className="w-3 h-3 text-muted-foreground" />
                                                            ) : p1 ? (
                                                                <User className="w-3 h-3 text-primary" />
                                                            ) : null}
                                                            <span className="text-sm truncate flex-1">
                                                                {getParticipantName(p1)}
                                                            </span>
                                                            {match.winner_participant_id ===
                                                                match.player1_participant_id && (
                                                                    <Trophy className="w-3 h-3 text-primary" />
                                                                )}
                                                        </div>

                                                        <div className="border-t border-border my-1" />

                                                        {/* Player 2 */}
                                                        <div
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded",
                                                                match.winner_participant_id ===
                                                                match.player2_participant_id &&
                                                                "bg-primary/10"
                                                            )}
                                                        >
                                                            {p2?.is_bot ? (
                                                                <Bot className="w-3 h-3 text-muted-foreground" />
                                                            ) : p2 ? (
                                                                <User className="w-3 h-3 text-primary" />
                                                            ) : null}
                                                            <span className="text-sm truncate flex-1">
                                                                {getParticipantName(p2)}
                                                            </span>
                                                            {match.winner_participant_id ===
                                                                match.player2_participant_id && (
                                                                    <Trophy className="w-3 h-3 text-primary" />
                                                                )}
                                                        </div>

                                                        {/* Status */}
                                                        <div className="mt-2 flex justify-center">
                                                            {getStatusBadge(match)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

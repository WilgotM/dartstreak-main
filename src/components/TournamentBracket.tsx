import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Bot, Clock, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  user_id: string | null;
  is_bot: boolean;
  bot_name: string | null;
  profile?: {
    display_name: string;
  };
}

interface Match {
  id: string;
  round: number;
  match_number: number;
  player1_participant_id: string | null;
  player2_participant_id: string | null;
  winner_participant_id: string | null;
  walkover_loser_id: string | null;
  match_id: string | null;
  status: string;
  scheduled_start_at: string | null;
}

interface TournamentBracketProps {
  matches: Match[];
  participants: Participant[];
  currentUserId: string;
  tournamentId: string;
}

export function TournamentBracket({
  matches,
  participants,
  currentUserId,
  tournamentId,
}: TournamentBracketProps) {
  const { t } = useTranslation();

  const getParticipant = (participantId: string | null) => {
    if (!participantId) return null;
    return participants.find((p) => p.id === participantId);
  };

  const getParticipantName = (participant: Participant | null) => {
    if (!participant) return t("tournament.tbd");
    if (participant.is_bot) return participant.bot_name || "Bot";
    return participant.profile?.display_name || t("common.unknown");
  };

  // Group matches by round
  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const numRounds = Object.keys(rounds).length;

  const getRoundName = (round: number) => {
    if (round === numRounds) return t("tournament.final");
    if (round === numRounds - 1) return t("tournament.semiFinal");
    if (round === numRounds - 2) return t("tournament.quarterFinal");
    return t("tournament.round", { number: round });
  };

  const isUserMatch = (match: Match) => {
    const p1 = getParticipant(match.player1_participant_id);
    const p2 = getParticipant(match.player2_participant_id);
    return (
      (p1 && !p1.is_bot && p1.user_id === currentUserId) ||
      (p2 && !p2.is_bot && p2.user_id === currentUserId)
    );
  };

  // Check if a participant has had a walkover loss in any previous match
  const hasWalkoverHistory = (participantId: string | null, beforeRound: number) => {
    if (!participantId) return false;
    return matches.some(
      (m) => m.round < beforeRound && m.walkover_loser_id === participantId
    );
  };

  // Check if match was a walkover
  const isWalkoverMatch = (match: Match) => {
    return match.walkover_loser_id !== null;
  };

  const getStatusBadge = (match: Match) => {
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
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t("tournament.scheduled")}
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="text-xs bg-amber-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {isMyMatch ? t("tournament.yourMatch") : t("tournament.inProgress")}
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
                                "bg-primary/10",
                                match.walkover_loser_id === match.player1_participant_id &&
                                "bg-destructive/10"
                              )}
                            >
                              {p1?.is_bot && (
                                <Bot className="w-3 h-3 text-muted-foreground" />
                              )}
                              {/* Warning if player has walkover history */}
                              {hasWalkoverHistory(match.player1_participant_id, match.round) && (
                                <AlertTriangle className="w-3 h-3 text-amber-500" title={t("tournament.noShowWarning")} />
                              )}
                              <span className={cn(
                                "text-sm truncate flex-1",
                                match.walkover_loser_id === match.player1_participant_id && "text-destructive line-through"
                              )}>
                                {getParticipantName(p1)}
                              </span>
                              {match.winner_participant_id ===
                                match.player1_participant_id && (
                                  <Trophy className="w-3 h-3 text-primary" />
                                )}
                              {match.walkover_loser_id === match.player1_participant_id && (
                                <span className="text-xs text-destructive">WO</span>
                              )}
                            </div>

                            <div className="border-t border-border my-1" />

                            {/* Player 2 */}
                            <div
                              className={cn(
                                "flex items-center gap-2 p-2 rounded",
                                match.winner_participant_id ===
                                match.player2_participant_id &&
                                "bg-primary/10",
                                match.walkover_loser_id === match.player2_participant_id &&
                                "bg-destructive/10"
                              )}
                            >
                              {p2?.is_bot && (
                                <Bot className="w-3 h-3 text-muted-foreground" />
                              )}
                              {/* Warning if player has walkover history */}
                              {hasWalkoverHistory(match.player2_participant_id, match.round) && (
                                <AlertTriangle className="w-3 h-3 text-amber-500" title={t("tournament.noShowWarning")} />
                              )}
                              <span className={cn(
                                "text-sm truncate flex-1",
                                match.walkover_loser_id === match.player2_participant_id && "text-destructive line-through"
                              )}>
                                {getParticipantName(p2)}
                              </span>
                              {match.winner_participant_id ===
                                match.player2_participant_id && (
                                  <Trophy className="w-3 h-3 text-primary" />
                                )}
                              {match.walkover_loser_id === match.player2_participant_id && (
                                <span className="text-xs text-destructive">WO</span>
                              )}
                            </div>

                            {/* Status */}
                            <div className="mt-2 flex justify-center gap-1">
                              {getStatusBadge(match)}
                              {isWalkoverMatch(match) && (
                                <Badge variant="destructive" className="text-xs">
                                  {t("tournament.walkover")}
                                </Badge>
                              )}
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

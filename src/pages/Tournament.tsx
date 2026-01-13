import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTournaments } from "@/hooks/useTournaments";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
import { TournamentBracket } from "@/components/TournamentBracket";
import { InviteToTournamentDialog } from "@/components/InviteToTournamentDialog";
import {
  Users,
  Target,
  Layers,
  Trophy,
  Globe,
  Lock,
  UserPlus,
  ArrowLeft,
  Clock,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

interface TournamentDetails {
  tournament: any;
  participants: any[];
  matches: any[];
}

export default function Tournament() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    getTournamentDetails,
    inviteToTournament,
    checkAndStartScheduledMatches,
    getActiveMatchForUser,
    startTournamentMatch,
  } = useTournaments();
  const { friends } = useFriends();
  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownType, setCountdownType] = useState<"start" | "round">("start");

  const loadDetails = useCallback(async (isInitial = false) => {
    if (!id) return;
    if (isInitial) setLoading(true);
    const data = await getTournamentDetails(id);
    setDetails(data);
    if (isInitial) setLoading(false);
  }, [id, getTournamentDetails]);

  // Check for scheduled matches and redirect user to their match
  const checkMatchesAndRedirect = useCallback(async () => {
    if (!id || !user || !details?.tournament) return;

    // Check and start any scheduled matches
    await checkAndStartScheduledMatches(id);

    // Reload details after potential changes
    const updatedData = await getTournamentDetails(id);
    setDetails(updatedData);

    // Check if user has an active match they should be in
    const activeMatch = await getActiveMatchForUser(id, user.id) as any;

    if (activeMatch) {
      // Check if match should have started
      const scheduledStart = activeMatch?.scheduled_start_at
        ? new Date(activeMatch.scheduled_start_at)
        : null;
      const now = new Date();

      if (scheduledStart && now >= scheduledStart) {
        // Match should be active - check if we need to create it
        if (!activeMatch.match_id && activeMatch.status === "scheduled") {
          const matchId = await startTournamentMatch(activeMatch.id);
          if (matchId) {
            // Determine if it's a bot match
            const p1 = updatedData.participants.find(
              (p: any) => p.id === activeMatch.player1_participant_id
            );
            const p2 = updatedData.participants.find(
              (p: any) => p.id === activeMatch.player2_participant_id
            );
            const isBotMatch = p1?.is_bot || p2?.is_bot;
            navigate(isBotMatch ? `/offline-match/${matchId}` : `/match/${matchId}`);
          }
        } else if (activeMatch.match_id) {
          // Match exists - redirect to it
          const p1 = updatedData.participants.find(
            (p: any) => p.id === activeMatch.player1_participant_id
          );
          const p2 = updatedData.participants.find(
            (p: any) => p.id === activeMatch.player2_participant_id
          );
          const isBotMatch = p1?.is_bot || p2?.is_bot;
          navigate(
            isBotMatch
              ? `/offline-match/${activeMatch.match_id}`
              : `/match/${activeMatch.match_id}`
          );
        }
      }
    }
  }, [id, user, details, checkAndStartScheduledMatches, getActiveMatchForUser, startTournamentMatch, navigate, getTournamentDetails]);

  useEffect(() => {
    loadDetails(true);
  }, [id]);

  // Poll for updates and check for match redirects
  useEffect(() => {
    if (!id || !details?.tournament) return;

    const interval = setInterval(async () => {
      await loadDetails(false);
      await checkMatchesAndRedirect();
    }, 2000);

    return () => clearInterval(interval);
  }, [id, details?.tournament?.status, loadDetails, checkMatchesAndRedirect]);

  // Countdown timer
  useEffect(() => {
    if (!details?.tournament) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const tournament = details.tournament;
      let targetTime: Date | null = null;

      if (tournament.status === "scheduled" && tournament.scheduled_start_at) {
        // Countdown to tournament start
        targetTime = new Date(tournament.scheduled_start_at);
        setCountdownType("start");
      } else if (tournament.status === "in_progress" && tournament.round_started_at) {
        // Countdown to next round
        targetTime = new Date(tournament.round_started_at);
        setCountdownType("round");
      }

      if (targetTime) {
        const now = new Date();
        const diff = Math.max(0, Math.floor((targetTime.getTime() - now.getTime()) / 1000));
        setCountdown(diff);
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [details?.tournament?.scheduled_start_at, details?.tournament?.round_started_at, details?.tournament?.status]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!details?.tournament) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <p className="text-center text-muted-foreground">
            {t("tournament.notFound")}
          </p>
        </div>
      </AppLayout>
    );
  }

  const { tournament, participants, matches } = details;
  const isOwner = tournament.created_by === user.id;
  const isParticipant = participants.some((p: any) => p.user_id === user.id);

  const handleInvite = async (userId: string) => {
    await inviteToTournament(tournament.id, userId);
  };

  // Filter friends who aren't already participants
  const participantUserIds = participants
    .filter((p: any) => !p.is_bot)
    .map((p: any) => p.user_id);
  const invitableFriends = friends.filter(
    (f) => !participantUserIds.includes(f.id)
  );

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${secs}s`;
  };

  const getStatusBadge = () => {
    switch (tournament.status) {
      case "scheduled":
        return <Badge variant="secondary">{t("tournament.statusScheduled")}</Badge>;
      case "in_progress":
        return <Badge variant="default">{t("tournament.statusInProgress")}</Badge>;
      case "completed":
        return <Badge variant="outline">{t("tournament.statusCompleted")}</Badge>;
      default:
        return <Badge variant="secondary">{t("tournament.statusOpen")}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link
          to="/tournaments"
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
                  {tournament.is_public ? (
                    <Globe className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                  <CardTitle>{tournament.name}</CardTitle>
                  {getStatusBadge()}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {participants.filter((p: any) => !p.is_bot).length}/{tournament.max_players}
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
                </div>
              </div>

              <div className="flex gap-2">
                {isOwner && !tournament.is_public && tournament.status === "scheduled" && (
                  <InviteToTournamentDialog
                    friends={invitableFriends}
                    onInvite={handleInvite}
                  >
                    <Button variant="outline" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t("tournament.invite")}
                    </Button>
                  </InviteToTournamentDialog>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Countdown timer - for scheduled tournament */}
        {tournament.status === "scheduled" && countdown !== null && countdown > 0 && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("tournament.startsIn")}
                  </span>
                </div>
                <span className="text-4xl font-display font-bold text-primary">
                  {formatCountdown(countdown)}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("tournament.playersCanJoin")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Countdown timer - for next round */}
        {tournament.status === "in_progress" && countdown !== null && countdown > 0 && countdownType === "round" && (
          <Card className="mb-6 bg-amber-500/10 border-amber-500/20">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("tournament.nextRoundIn")}
                  </span>
                </div>
                <span className="text-4xl font-display font-bold text-amber-600">
                  {formatCountdown(countdown)}
                </span>
                <p className="text-sm text-muted-foreground">
                  {t("tournament.waitingForRound", { round: tournament.current_round })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting indicator */}
        {tournament.status === "in_progress" && countdown === 0 && isParticipant && (
          <Card className="mb-6 bg-amber-500/10 border-amber-500/20">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-sm font-medium text-amber-600">
                  {t("tournament.matchStarting")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants - show when scheduled */}
        {tournament.status === "scheduled" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("tournament.participants")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {participants.filter((p: any) => !p.is_bot).map((p: any, i: number) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <span className="truncate text-sm">
                      {p.profile?.display_name || p.bot_name}
                    </span>
                  </div>
                ))}
                {Array.from({
                  length: tournament.max_players - participants.filter((p: any) => !p.is_bot).length,
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                      ?
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t("tournament.waitingForPlayer")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bracket */}
        {(tournament.status === "in_progress" ||
          tournament.status === "completed") &&
          matches.length > 0 && (
            <TournamentBracket
              matches={matches}
              participants={participants}
              currentUserId={user.id}
              tournamentId={tournament.id}
            />
          )}
      </div>
    </AppLayout>
  );
}

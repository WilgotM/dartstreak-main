import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";

// Walkover timeout: 20 seconds after match scheduled start
const WALKOVER_TIMEOUT_SECONDS = 20;

interface ActiveTournamentInfo {
  id: string;
  name: string;
  status: string;
  scheduled_start_at: string | null;
}

interface ParticipantCheck {
  is_bot: boolean;
}

interface ActiveMatchInfo {
  id: string;
  tournament_id: string;
  scheduled_start_at: string | null;
  status: string;
  match_id: string | null;
  player1_participant_id: string | null;
  player2_participant_id: string | null;
}

interface TournamentGuardProps {
  children: React.ReactNode;
}

export function TournamentGuard({ children }: TournamentGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [activeTournament, setActiveTournament] = useState<ActiveTournamentInfo | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchInfo | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walkoverCountdown, setWalkoverCountdown] = useState<number | null>(null);

  // Check if user is locked to a tournament
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setActiveTournament(null);
      setActiveMatch(null);
      setIsLocked(false);
      setLoading(false);
      return;
    }

    const checkTournamentLock = async () => {
      try {
        // Find tournaments user is participating in
        const { data: participations } = await supabase
          .from("tournament_participants")
          .select("tournament_id, id")
          .eq("user_id", user.id);

        if (!participations || participations.length === 0) {
          setActiveTournament(null);
          setActiveMatch(null);
          setIsLocked(false);
          setLoading(false);
          return;
        }

        const tournamentIds = participations.map((p) => p.tournament_id);
        const now = new Date();

        // Check for in_progress tournaments
        const { data: inProgressTournaments } = await supabase
          .from("tournaments")
          .select("*")
          .in("id", tournamentIds)
          .eq("status", "in_progress");

        // Also check for scheduled tournaments that should have started
        const { data: scheduledTournaments } = await supabase
          .from("tournaments")
          .select("*")
          .in("id", tournamentIds)
          .eq("status", "scheduled")
          .lte("scheduled_start_at", now.toISOString());

        const activeTournaments = [
          ...(inProgressTournaments || []),
          ...(scheduledTournaments || []),
        ];

        if (activeTournaments.length === 0) {
          setActiveTournament(null);
          setActiveMatch(null);
          setIsLocked(false);
          setLoading(false);
          return;
        }

        // Get the first active tournament
        const tournament = activeTournaments[0] as ActiveTournamentInfo;
        setActiveTournament(tournament);
        setIsLocked(true);

        // Find user's participant id for this tournament
        const participation = participations.find((p) => p.tournament_id === tournament.id);
        if (!participation) {
          setActiveMatch(null);
          setLoading(false);
          return;
        }

        // Check if user has an active/scheduled match
        const { data: match } = await supabase
          .from("tournament_matches")
          .select("*")
          .eq("tournament_id", tournament.id)
          .or(`player1_participant_id.eq.${participation.id},player2_participant_id.eq.${participation.id}`)
          .in("status", ["scheduled", "in_progress"])
          .order("round")
          .limit(1)
          .maybeSingle();

        setActiveMatch(match);
      } catch (error) {
        console.error("Error checking tournament lock:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTournamentLock();
    const interval = setInterval(checkTournamentLock, 2000);
    return () => clearInterval(interval);
  }, [user, authLoading]);

  // Calculate walkover countdown when match is scheduled
  useEffect(() => {
    if (!activeMatch?.scheduled_start_at || activeMatch.status !== "scheduled") {
      setWalkoverCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const scheduledStart = new Date(activeMatch.scheduled_start_at!);
      const walkoverTime = new Date(scheduledStart.getTime() + WALKOVER_TIMEOUT_SECONDS * 1000);
      const now = new Date();
      
      // Only show countdown after match should have started
      if (now < scheduledStart) {
        setWalkoverCountdown(null);
        return;
      }
      
      const diff = Math.max(0, Math.floor((walkoverTime.getTime() - now.getTime()) / 1000));
      setWalkoverCountdown(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeMatch]);

  // Redirect logic
  useEffect(() => {
    if (!isLocked || !activeTournament || loading || authLoading) return;

    const currentPath = location.pathname;
    const tournamentPath = `/tournament/${activeTournament.id}`;

    // Allow being on the tournament page or any match page
    const isOnTournamentPage = currentPath === tournamentPath;
    const isOnMatchPage = currentPath.startsWith("/match/") || currentPath.startsWith("/offline-match/");

    // If user has an active match with a match_id, redirect to that match
    if (activeMatch?.match_id && activeMatch.status === "in_progress" && !isOnMatchPage) {
      // Determine if it's a bot match
      Promise.all([
        supabase
          .from("tournament_participants")
          .select("is_bot")
          .eq("id", activeMatch.player1_participant_id)
          .single(),
        supabase
          .from("tournament_participants")
          .select("is_bot")
          .eq("id", activeMatch.player2_participant_id)
          .single(),
      ]).then(([{ data: p1 }, { data: p2 }]: [{ data: ParticipantCheck | null }, { data: ParticipantCheck | null }]) => {
        const isBotMatch = p1?.is_bot || p2?.is_bot;
        navigate(isBotMatch ? `/offline-match/${activeMatch.match_id}` : `/match/${activeMatch.match_id}`);
      });
      return;
    }

    // If not on tournament or match page and locked, redirect to tournament
    if (!isOnTournamentPage && !isOnMatchPage) {
      navigate(tournamentPath);
    }
  }, [isLocked, activeTournament, activeMatch, loading, authLoading, location.pathname, navigate]);

  // Show warning banner if locked and has walkover countdown
  if (isLocked && walkoverCountdown !== null && walkoverCountdown > 0) {
    const currentPath = location.pathname;
    const isOnTournamentPage = activeTournament && currentPath === `/tournament/${activeTournament.id}`;
    
    // Only show walkover warning on tournament page
    if (isOnTournamentPage) {
      return (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-3">
            <div className="container mx-auto flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                {t("tournament.walkoverWarning", { seconds: walkoverCountdown })}
              </span>
              <Clock className="w-4 h-4 ml-2" />
              <span className="font-bold">{walkoverCountdown}s</span>
            </div>
          </div>
          <div className="pt-12">{children}</div>
        </>
      );
    }
  }

  return <>{children}</>;
}

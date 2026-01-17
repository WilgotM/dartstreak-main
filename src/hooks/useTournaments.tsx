import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Tournament {
  id: string;
  name: string;
  created_by: string;
  is_public: boolean;
  max_players: number;
  starting_score: number;
  checkout_type: string;
  legs_to_win: number;
  sets_to_win: number;
  bot_average: number | null;
  status: string;
  current_round: number;
  winner_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  creator_name?: string;
  participant_count?: number;
}

interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string | null;
  is_bot: boolean;
  bot_name: string | null;
  seed: number | null;
  eliminated_at_round: number | null;
  profile?: {
    display_name: string;
  };
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_participant_id: string | null;
  player2_participant_id: string | null;
  winner_participant_id: string | null;
  match_id: string | null;
  status: string;
}

interface TournamentInvite {
  id: string;
  tournament_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  tournament?: Tournament;
  from_profile?: { display_name: string };
}

export function useTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [publicTournaments, setPublicTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [tournamentInvites, setTournamentInvites] = useState<TournamentInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPublicTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("is_public", true)
      .in("status", ["open", "scheduled"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Get participant counts and creator names
      const tournamentsWithDetails = await Promise.all(
        data.map(async (tournament) => {
          const { count } = await supabase
            .from("tournament_participants")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournament.id);

          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", tournament.created_by)
            .single();

          const isParticipant = await isUserParticipant(tournament.id);

          return {
            ...tournament,
            participant_count: count || 0,
            creator_name: creatorProfile?.display_name || t("common.unknown"),
            is_participant: isParticipant,
          };
        })
      );

      // Filter out tournaments where the user is already a participant or it's full
      const joinableTournaments = tournamentsWithDetails.filter(t =>
        !t.is_participant && (t.participant_count || 0) < t.max_players
      );
      setPublicTournaments(joinableTournaments);
    }
  };

  const isUserParticipant = async (tournamentId: string) => {
    if (!user) return false;
    const { data } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  };

  const fetchMyTournaments = async () => {
    if (!user) return;

    // Get tournaments I created
    const { data: createdTournaments } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    // Get tournaments I'm participating in
    const { data: participations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", user.id);

    const participatedIds = participations?.map((p) => p.tournament_id) || [];

    let participatedTournaments: Tournament[] = [];
    if (participatedIds.length > 0) {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .in("id", participatedIds)
        .neq("created_by", user.id);
      participatedTournaments = data || [];
    }

    const allMyTournaments = [
      ...(createdTournaments || []),
      ...participatedTournaments,
    ];

    // Add participant counts
    const tournamentsWithCounts = await Promise.all(
      allMyTournaments.map(async (tournament) => {
        const { count } = await supabase
          .from("tournament_participants")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", tournament.id);
        return { ...tournament, participant_count: count || 0 };
      })
    );

    setMyTournaments(tournamentsWithCounts);
  };

  const fetchTournamentInvites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tournament_invites")
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    if (!error && data) {
      const invitesWithDetails = await Promise.all(
        data.map(async (invite) => {
          const { data: tournament } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", invite.tournament_id)
            .single();

          const { data: fromProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", invite.from_user_id)
            .single();

          return {
            ...invite,
            tournament,
            from_profile: fromProfile,
          };
        })
      );
      setTournamentInvites(invitesWithDetails as TournamentInvite[]);
    }
  };

  const createTournament = async (tournamentData: {
    name: string;
    is_public: boolean;
    max_players: number;
    starting_score: number;
    checkout_type: string;
    legs_to_win: number;
    sets_to_win: number;
    scheduled_start_at: Date;
    bot_average: number;
  }) => {
    if (!user) return null;

    const { scheduled_start_at, bot_average, ...restData } = tournamentData;

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        ...restData,
        created_by: user.id,
        scheduled_start_at: scheduled_start_at.toISOString(),
        bot_average: bot_average,
        status: "scheduled",
      })
      .select()
      .single();

    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    // Creator automatically joins
    const { error: joinError } = await supabase.from("tournament_participants").insert({
      tournament_id: data.id,
      user_id: user.id,
      seed: 1,
    });

    if (joinError) {
      console.error("Error joining creator to tournament:", joinError);
    }

    toast({
      title: t("tournament.scheduled"),
    });

    await fetchMyTournaments();
    return data;
  };

  const getActiveRegistration = async (): Promise<{ tournamentId: string; tournamentName: string } | null> => {
    if (!user) return null;

    const { data: participations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) return null;

    const tournamentIds = participations.map((p) => p.tournament_id);

    const { data: activeTournaments } = await supabase
      .from("tournaments")
      .select("id, name")
      .in("id", tournamentIds)
      .in("status", ["open", "scheduled", "in_progress"]);

    if (activeTournaments && activeTournaments.length > 0) {
      return {
        tournamentId: activeTournaments[0].id,
        tournamentName: activeTournaments[0].name,
      };
    }

    return null;
  };

  const leaveTournament = async (tournamentId: string) => {
    if (!user) return false;

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("status")
      .eq("id", tournamentId)
      .single();

    if (tournament?.status === "in_progress") {
      toast({
        title: t("tournament.cannotLeaveInProgress"),
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    await fetchPublicTournaments();
    await fetchMyTournaments();
    return true;
  };

  const joinTournament = async (tournamentId: string) => {
    if (!user) return false;

    // Check if user is already in the tournament
    const { data: existingParticipant } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipant) {
      toast({
        title: t("tournament.alreadyJoined"),
        variant: "destructive",
      });
      return false;
    }

    // Check current participant count
    const { count } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("max_players")
      .eq("id", tournamentId)
      .single();

    if (count !== null && tournament && count >= tournament.max_players) {
      toast({
        title: t("tournament.full"),
        description: t("tournament.fullDesc"),
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournamentId,
      user_id: user.id,
      seed: (count || 0) + 1,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: t("tournament.alreadyJoined"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    }

    await fetchPublicTournaments();
    await fetchMyTournaments();
    return true;
  };

  const inviteToTournament = async (tournamentId: string, userId: string) => {
    if (!user) return false;

    const { error } = await supabase.from("tournament_invites").insert({
      tournament_id: tournamentId,
      from_user_id: user.id,
      to_user_id: userId,
    });

    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    if (!user) return false;

    const invite = tournamentInvites.find((i) => i.id === inviteId);
    if (!invite) return false;

    if (accept) {
      // Join the tournament
      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", invite.tournament_id);

      await supabase.from("tournament_participants").insert({
        tournament_id: invite.tournament_id,
        user_id: user.id,
        seed: (count || 0) + 1,
      });
    }

    await supabase
      .from("tournament_invites")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", inviteId);

    await fetchTournamentInvites();
    await fetchMyTournaments();
    return true;
  };

  const startTournament = async (tournamentId: string, botAverage: number, scheduledStartAt?: Date) => {
    if (!user) return false;

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (!tournament) return false;

    // Get current participants
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed");

    const currentCount = participants?.length || 0;
    const neededBots = tournament.max_players - currentCount;

    // Add bots if needed
    const botNames = [
      "DartBot Alpha",
      "DartBot Beta",
      "DartBot Gamma",
      "DartBot Delta",
      "DartBot Epsilon",
      "DartBot Zeta",
      "DartBot Eta",
      "DartBot Theta",
    ];

    for (let i = 0; i < neededBots; i++) {
      await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        is_bot: true,
        bot_name: botNames[i] || `DartBot ${i + 1}`,
        seed: currentCount + i + 1,
      });
    }

    // Calculate when first round matches start (30 seconds after scheduled start)
    const scheduledStart = scheduledStartAt || new Date();
    const firstMatchStart = new Date(scheduledStart.getTime() + 30 * 1000);

    // Update tournament with bot average and schedule it
    await supabase
      .from("tournaments")
      .update({
        bot_average: botAverage,
        status: "in_progress",
        started_at: new Date().toISOString(),
        scheduled_start_at: scheduledStart.toISOString(),
        round_started_at: firstMatchStart.toISOString(),
      })
      .eq("id", tournamentId);

    // Generate bracket with scheduled start times
    await generateBracket(tournamentId, firstMatchStart);

    toast({
      title: t("tournament.scheduled"),
    });

    await fetchMyTournaments();
    return true;
  };

  const generateBracket = async (tournamentId: string, firstMatchStart: Date) => {
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed");

    if (!participants) return;

    const numPlayers = participants.length;
    const numRounds = Math.ceil(Math.log2(numPlayers));

    // Shuffle participants for random seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    // Create first round matches with scheduled start time
    const numFirstRoundMatches = numPlayers / 2;
    for (let i = 0; i < numFirstRoundMatches; i++) {
      await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round: 1,
        match_number: i + 1,
        player1_participant_id: shuffled[i * 2]?.id,
        player2_participant_id: shuffled[i * 2 + 1]?.id,
        status: "scheduled",
        scheduled_start_at: firstMatchStart.toISOString(),
      });
    }

    // Create placeholder matches for subsequent rounds (no scheduled time yet)
    let matchesInRound = numFirstRoundMatches / 2;
    for (let round = 2; round <= numRounds; round++) {
      for (let i = 0; i < matchesInRound; i++) {
        await supabase.from("tournament_matches").insert({
          tournament_id: tournamentId,
          round,
          match_number: i + 1,
          status: "pending",
        });
      }
      matchesInRound = matchesInRound / 2;
    }
  };

  const startTournamentMatch = async (tournamentMatchId: string) => {
    if (!user) return null;

    // Get the tournament match details
    const { data: tournamentMatch, error: tmError } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(*)")
      .eq("id", tournamentMatchId)
      .single();

    if (tmError || !tournamentMatch) {
      toast({
        title: t("common.error"),
        description: "Could not find tournament match",
        variant: "destructive",
      });
      return null;
    }

    const tournament = tournamentMatch.tournaments as any;

    // Get participants to determine players
    const { data: p1 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", tournamentMatch.player1_participant_id)
      .single();

    const { data: p2 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", tournamentMatch.player2_participant_id)
      .single();

    if (!p1 || !p2) {
      toast({
        title: t("common.error"),
        description: "Could not find match participants",
        variant: "destructive",
      });
      return null;
    }

    // Determine if this is a bot match
    const isBotMatch = p1.is_bot || p2.is_bot;
    const humanParticipant = p1.is_bot ? p2 : p1;
    const botParticipant = p1.is_bot ? p1 : p2;

    // For bot matches, we need to store bot info in signaling_data since matches table doesn't have bot columns
    const botInfo = isBotMatch ? {
      bot_average: tournament.bot_average,
      bot_name: botParticipant.bot_name,
    } : null;

    // Track who created the match (the player who showed up first)
    // This is crucial for walkover logic
    const createdByUserId = user.id;

    // Create the actual match
    const matchInsert: any = {
      player1_id: humanParticipant.user_id,
      player2_id: isBotMatch ? null : (p1.user_id === humanParticipant.user_id ? p2.user_id : p1.user_id),
      starting_score: tournament.starting_score,
      checkout_type: tournament.checkout_type,
      player1_score: tournament.starting_score,
      player2_score: tournament.starting_score,
      current_turn: humanParticipant.user_id,
      is_offline: isBotMatch,
      legs_to_win: tournament.legs_to_win,
      sets_to_win: tournament.sets_to_win,
      status: "active",
      started_at: new Date().toISOString(),
      signaling_data: botInfo
        ? { bot: botInfo, created_by: createdByUserId }
        : { created_by: createdByUserId },
    };

    const { data: createdMatch, error: matchError } = await supabase
      .from("matches")
      .insert(matchInsert)
      .select()
      .single();

    if (matchError || !createdMatch) {
      toast({
        title: t("common.error"),
        description: matchError?.message || "Could not create match",
        variant: "destructive",
      });
      return null;
    }

    // Link the match to the tournament match
    await supabase
      .from("tournament_matches")
      .update({
        match_id: createdMatch.id,
        status: "in_progress"
      })
      .eq("id", tournamentMatchId);

    return createdMatch.id;
  };

  const completeTournamentMatch = async (matchId: string, winnerId: string) => {
    // Find the tournament match linked to this match
    const { data: tournamentMatch } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(*)")
      .eq("match_id", matchId)
      .single();

    if (!tournamentMatch) return;

    // Find which participant won
    const { data: winnerParticipant } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentMatch.tournament_id)
      .or(`user_id.eq.${winnerId}`)
      .single();

    if (!winnerParticipant) {
      // Could be bot - check if it's a bot match
      const p1Id = tournamentMatch.player1_participant_id;
      const p2Id = tournamentMatch.player2_participant_id;

      // Determine winner based on which player won
      const { data: match } = await supabase
        .from("matches")
        .select("player1_id")
        .eq("id", matchId)
        .single();

      if (match) {
        // If winner is player1, then p1 wins, else p2 wins
        const winnerParticipantId = match.player1_id === winnerId ? p1Id : p2Id;

        await supabase
          .from("tournament_matches")
          .update({
            winner_participant_id: winnerParticipantId,
            status: "completed",
          })
          .eq("id", tournamentMatch.id);

        // Advance winner to next round
        await advanceWinnerToNextRound(tournamentMatch, winnerParticipantId);
      }
      return;
    }

    // Update tournament match with winner
    await supabase
      .from("tournament_matches")
      .update({
        winner_participant_id: winnerParticipant.id,
        status: "completed",
      })
      .eq("id", tournamentMatch.id);

    // Advance winner to next round
    await advanceWinnerToNextRound(tournamentMatch, winnerParticipant.id);
  };

  const advanceWinnerToNextRound = async (
    currentMatch: any,
    winnerParticipantId: string
  ) => {
    const tournament = currentMatch.tournaments;
    const currentRound = currentMatch.round;
    const currentMatchNumber = currentMatch.match_number;

    // Find the next round match
    const nextRound = currentRound + 1;
    const nextMatchNumber = Math.ceil(currentMatchNumber / 2);

    const { data: nextMatch } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", currentMatch.tournament_id)
      .eq("round", nextRound)
      .eq("match_number", nextMatchNumber)
      .single();

    if (!nextMatch) {
      // This was the final - tournament is complete
      await supabase
        .from("tournaments")
        .update({
          status: "completed",
          winner_id: winnerParticipantId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentMatch.tournament_id);
      return;
    }

    // Determine if winner goes to player1 or player2 slot
    const isOddMatch = currentMatchNumber % 2 === 1;
    const updateField = isOddMatch
      ? "player1_participant_id"
      : "player2_participant_id";

    await supabase
      .from("tournament_matches")
      .update({ [updateField]: winnerParticipantId })
      .eq("id", nextMatch.id);

    // Check if both players are now set - if so, mark as ready
    const { data: updatedNextMatch } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", nextMatch.id)
      .single();

    if (
      updatedNextMatch?.player1_participant_id &&
      updatedNextMatch?.player2_participant_id
    ) {
      // Check if all matches in current round are completed
      const { data: roundMatches } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", currentMatch.tournament_id)
        .eq("round", currentRound);

      const allCompleted = roundMatches?.every((m) => m.status === "completed");

      if (allCompleted) {
        // Schedule next round to start in 30 seconds
        const nextRoundStart = new Date(Date.now() + 30 * 1000);

        // Update all next round matches with scheduled start time
        await supabase
          .from("tournament_matches")
          .update({
            status: "scheduled",
            scheduled_start_at: nextRoundStart.toISOString(),
          })
          .eq("tournament_id", currentMatch.tournament_id)
          .eq("round", nextRound)
          .not("player1_participant_id", "is", null)
          .not("player2_participant_id", "is", null);

        // Update tournament round_started_at
        await supabase
          .from("tournaments")
          .update({
            current_round: nextRound,
            round_started_at: nextRoundStart.toISOString(),
          })
          .eq("id", currentMatch.tournament_id);
      }
    }
  };

  const simulateBotVsBotMatch = async (tournamentMatchId: string): Promise<string | null> => {
    const { data: tournamentMatch } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(*)")
      .eq("id", tournamentMatchId)
      .single();

    if (!tournamentMatch) return null;

    const tournament = tournamentMatch.tournaments as any;

    const { data: p1 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", tournamentMatch.player1_participant_id)
      .single();

    const { data: p2 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", tournamentMatch.player2_participant_id)
      .single();

    if (!p1 || !p2 || !p1.is_bot || !p2.is_bot) return null;

    // Simulate the match - random winner based on bot average (simplified)
    const winner = Math.random() > 0.5 ? p1 : p2;

    // Update tournament match directly
    await supabase
      .from("tournament_matches")
      .update({
        winner_participant_id: winner.id,
        status: "completed",
      })
      .eq("id", tournamentMatchId);

    // Advance winner
    await advanceWinnerToNextRound(tournamentMatch, winner.id);

    return winner.id;
  };

  const checkAndStartTournament = async (tournamentId: string) => {
    const now = new Date();

    // Get tournament details
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (!tournament) return false;

    const t = tournament as any;
    // Check if tournament should start (scheduled status and time has passed)
    if (t.status === "scheduled" && t.scheduled_start_at) {
      const scheduledTime = new Date(t.scheduled_start_at);
      if (now >= scheduledTime) {
        // Time to start the tournament - fill with bots and generate bracket
        await autoStartTournament(tournamentId);
        return true;
      }
    }

    return false;
  };

  const autoStartTournament = async (tournamentId: string) => {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (!tournament) return;

    // Get current participants
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed");

    const currentCount = participants?.length || 0;
    const neededBots = tournament.max_players - currentCount;

    // Add bots if needed
    const botNames = [
      "DartBot Alpha",
      "DartBot Beta",
      "DartBot Gamma",
      "DartBot Delta",
      "DartBot Epsilon",
      "DartBot Zeta",
      "DartBot Eta",
      "DartBot Theta",
      "DartBot Iota",
      "DartBot Kappa",
      "DartBot Lambda",
      "DartBot Mu",
    ];

    for (let i = 0; i < neededBots; i++) {
      await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        is_bot: true,
        bot_name: botNames[i] || `DartBot ${i + 1}`,
        seed: currentCount + i + 1,
      });
    }

    // First round starts 30 seconds after tournament start
    const firstMatchStart = new Date(Date.now() + 30 * 1000);

    // Update tournament status
    await supabase
      .from("tournaments")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        round_started_at: firstMatchStart.toISOString(),
      })
      .eq("id", tournamentId);

    // Generate bracket
    await generateBracket(tournamentId, firstMatchStart);
  };

  const checkAndStartScheduledMatches = async (tournamentId: string) => {
    const now = new Date();

    // First check if tournament itself needs to start
    await checkAndStartTournament(tournamentId);

    // Process any walkovers first
    await processWalkovers(tournamentId);

    // Get all scheduled matches that should start
    const { data: scheduledMatches } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(*)")
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .lte("scheduled_start_at", now.toISOString());

    if (!scheduledMatches || scheduledMatches.length === 0) return null;

    // Process each match
    for (const match of scheduledMatches) {
      const { data: p1 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("id", match.player1_participant_id)
        .single();

      const { data: p2 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("id", match.player2_participant_id)
        .single();

      if (!p1 || !p2) continue;

      // Bot vs Bot - simulate immediately
      if (p1.is_bot && p2.is_bot) {
        await simulateBotVsBotMatch(match.id);
        continue;
      }

      // Human vs Bot or Human vs Human - create actual match
      if (!match.match_id) {
        await startTournamentMatch(match.id);
      }
    }

    return scheduledMatches;
  };

  // Walkover timeout: 20 seconds after match scheduled start
  const WALKOVER_TIMEOUT_SECONDS = 20;

  const processWalkovers = async (tournamentId: string) => {
    const now = new Date();

    // Get all scheduled matches that might need walkover processing
    const { data: scheduledMatches } = await supabase
      .from("tournament_matches")
      .select("*, tournaments(*)")
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled")
      .not("scheduled_start_at", "is", null);

    if (!scheduledMatches || scheduledMatches.length === 0) return;

    for (const match of scheduledMatches) {
      const scheduledStart = new Date(match.scheduled_start_at!);
      const walkoverTime = new Date(scheduledStart.getTime() + WALKOVER_TIMEOUT_SECONDS * 1000);

      // Not yet past walkover time
      if (now < walkoverTime) continue;

      // If match has a match_id, check if it actually has activity (throws)
      // If no throws after walkover time, one player showed up but the other didn't
      if (match.match_id) {
        // Check if match has any throws (indicating both players are active)
        const { count } = await supabase
          .from("match_throws")
          .select("*", { count: "exact", head: true })
          .eq("match_id", match.match_id);

        // If there are throws, match is progressing normally
        if (count && count > 0) continue;

        // No throws yet - check if match is still active after walkover time
        // This means one player created the match but opponent never showed up
        // We'll handle this below
      }

      // Get both participants
      const { data: p1 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("id", match.player1_participant_id)
        .single();

      const { data: p2 } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("id", match.player2_participant_id)
        .single();

      if (!p1 || !p2) continue;

      // If both are bots, simulate the match instead
      if (p1.is_bot && p2.is_bot) {
        await simulateBotVsBotMatch(match.id);
        continue;
      }

      // Determine walkover winner based on who showed up
      let winnerId: string;

      if (p1.is_bot && !p2.is_bot) {
        // Human p2 didn't show up in time, bot p1 wins by walkover
        winnerId = p1.id;
      } else if (!p1.is_bot && p2.is_bot) {
        // Human p1 didn't show up in time, bot p2 wins by walkover
        winnerId = p2.id;
      } else if (match.match_id) {
        // Match was created - one player showed up but opponent didn't
        // Check who created the match (they showed up) via signaling_data.created_by
        const { data: actualMatch } = await supabase
          .from("matches")
          .select("signaling_data")
          .eq("id", match.match_id)
          .single();

        if (actualMatch?.signaling_data) {
          const signalingData = actualMatch.signaling_data as { created_by?: string };
          const createdByUserId = signalingData.created_by;

          if (createdByUserId) {
            // Give win to whoever created the match (they showed up)
            if (p1.user_id === createdByUserId) {
              winnerId = p1.id; // Player 1 showed up, they win
            } else if (p2.user_id === createdByUserId) {
              winnerId = p2.id; // Player 2 showed up, they win
            } else {
              winnerId = p1.id; // Fallback
            }
          } else {
            winnerId = p1.id; // No created_by info, fallback
          }
        } else {
          winnerId = p1.id; // Fallback
        }
      } else {
        // Both are human and neither showed up within 20 seconds
        // Use match ID to deterministically but fairly pick a winner
        // This ensures consistency (same result if checked multiple times)
        // but fairness (not always the same player)
        const matchIdSum = match.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        winnerId = matchIdSum % 2 === 0 ? p1.id : p2.id;
      }

      console.log(`Walkover: Match ${match.id} - winner: ${winnerId}`);

      // If there was an actual match created, cancel/complete it
      if (match.match_id) {
        // Find the winner's user_id to set as match winner
        const winnerParticipant = winnerId === p1.id ? p1 : p2;

        await supabase
          .from("matches")
          .update({
            status: "completed",
            winner_id: winnerParticipant.user_id,
            completed_at: new Date().toISOString(),
          })
          .eq("id", match.match_id);
      }

      // Determine who didn't show up (the loser)
      const loserId = winnerId === p1.id ? p2.id : p1.id;

      // Award walkover in tournament - mark who didn't show up
      await supabase
        .from("tournament_matches")
        .update({
          winner_participant_id: winnerId,
          status: "completed",
          walkover_loser_id: loserId, // Track who didn't show up
        })
        .eq("id", match.id);

      // Advance winner to next round
      await advanceWinnerToNextRound(match, winnerId);
    }
  };

  const getActiveMatchForUser = async (tournamentId: string, userId: string) => {
    // Find if user has an active match in this tournament
    const { data: participant } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .single();

    if (!participant) return null;

    // Find active match for this participant
    const { data: activeMatch } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .or(`player1_participant_id.eq.${participant.id},player2_participant_id.eq.${participant.id}`)
      .in("status", ["scheduled", "in_progress"])
      .order("round")
      .limit(1)
      .single();

    return activeMatch;
  };

  const getTournamentDetails = async (tournamentId: string) => {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed");

    // Get profile names for non-bot participants
    const participantsWithNames = await Promise.all(
      (participants || []).map(async (p) => {
        if (p.is_bot) {
          return { ...p, profile: { display_name: p.bot_name || "Bot" } };
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", p.user_id)
          .single();
        return { ...p, profile };
      })
    );

    const { data: matches } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round")
      .order("match_number");

    return {
      tournament,
      participants: participantsWithNames as TournamentParticipant[],
      matches: matches as TournamentMatch[],
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPublicTournaments(),
          fetchMyTournaments(),
          fetchTournamentInvites(),
        ]);
      } catch (error) {
        console.error("Error loading tournament data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up realtime subscription
    const channel = supabase
      .channel("tournaments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => {
          fetchPublicTournaments();
          fetchMyTournaments();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_participants" },
        () => {
          fetchPublicTournaments();
          fetchMyTournaments();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_invites" },
        () => {
          fetchTournamentInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    publicTournaments,
    myTournaments,
    tournamentInvites,
    loading,
    createTournament,
    joinTournament,
    leaveTournament,
    getActiveRegistration,
    inviteToTournament,
    respondToInvite,
    startTournament,
    startTournamentMatch,
    completeTournamentMatch,
    checkAndStartScheduledMatches,
    getActiveMatchForUser,
    getTournamentDetails,
    refetch: () => {
      fetchPublicTournaments();
      fetchMyTournaments();
      fetchTournamentInvites();
    },
  };
}

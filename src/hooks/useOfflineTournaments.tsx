import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getRandomBotName } from "@/utils/botNames";

// TypeScript interfaces for offline tournaments
export interface OfflineTournamentParticipant {
  id: string;
  is_bot: boolean;
  bot_name: string | null;
  bot_average: number | null;
  seed: number;
  eliminated_at_round: number | null;
  display_name: string;
}

export interface OfflineTournamentMatch {
  id: string;
  round: number;
  match_number: number;
  player1_participant_id: string | null;
  player2_participant_id: string | null;
  winner_participant_id: string | null;
  status: "pending" | "scheduled" | "in_progress" | "completed";
  offline_match_id: string | null;
}

export interface OfflineTournament {
  id: string;
  name: string;
  max_players: number;
  starting_score: number;
  checkout_type: "straight_out" | "double_out";
  legs_to_win: number;
  sets_to_win: number;
  bot_average: number;
  status: "scheduled" | "in_progress" | "completed";
  current_round: number;
  winner_id: string | null;
  created_at: string;
  participants: OfflineTournamentParticipant[];
  matches: OfflineTournamentMatch[];
}

const STORAGE_KEY = "dartstreak_offline_tournaments";

function generateId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useOfflineTournaments() {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<OfflineTournament[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveTournaments = useCallback((updated: OfflineTournament[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTournaments(updated);
  }, []);

  const createOfflineTournament = useCallback((config: {
    name: string;
    max_players: number;
    starting_score: number;
    checkout_type: "straight_out" | "double_out";
    legs_to_win: number;
    sets_to_win: number;
    bot_average: number;
    player_name: string;
  }): OfflineTournament => {
    const tournamentId = generateId();

    // Create participants
    const participants: OfflineTournamentParticipant[] = [];
    const usedBotNames: string[] = [];

    // Add the human player as participant 1 with seed 1
    const playerId = generateId();
    participants.push({
      id: playerId,
      is_bot: false,
      bot_name: null,
      bot_average: null,
      seed: 1,
      eliminated_at_round: null,
      display_name: config.player_name,
    });

    // Add bots to fill remaining slots
    for (let i = 2; i <= config.max_players; i++) {
      const botName = getRandomBotName(usedBotNames);
      usedBotNames.push(botName);

      participants.push({
        id: generateId(),
        is_bot: true,
        bot_name: botName,
        bot_average: config.bot_average,
        seed: i,
        eliminated_at_round: null,
        display_name: botName,
      });
    }

    // Generate bracket matches
    const matches = generateBracketMatches(participants, config.max_players);

    const tournament: OfflineTournament = {
      id: tournamentId,
      name: config.name,
      max_players: config.max_players,
      starting_score: config.starting_score,
      checkout_type: config.checkout_type,
      legs_to_win: config.legs_to_win,
      sets_to_win: config.sets_to_win,
      bot_average: config.bot_average,
      status: "in_progress", // Start immediately
      current_round: 1,
      winner_id: null,
      created_at: new Date().toISOString(),
      participants,
      matches,
    };

    const updated = [...tournaments, tournament];
    saveTournaments(updated);

    toast.success(t("offlineTournament.created") || "Tournament created!");

    return tournament;
  }, [tournaments, saveTournaments, t]);

  const getOfflineTournament = useCallback((id: string): OfflineTournament | null => {
    // Always fetch fresh from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const all: OfflineTournament[] = stored ? JSON.parse(stored) : [];
      return all.find(t => t.id === id) || null;
    } catch {
      return null;
    }
  }, []);

  const getAllOfflineTournaments = useCallback((): OfflineTournament[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const deleteOfflineTournament = useCallback((id: string) => {
    const updated = tournaments.filter(t => t.id !== id);
    saveTournaments(updated);
    toast.success(t("offlineTournament.deleted") || "Tournament deleted");
  }, [tournaments, saveTournaments, t]);

  const updateTournament = useCallback((id: string, updates: Partial<OfflineTournament>) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all: OfflineTournament[] = stored ? JSON.parse(stored) : [];
    const updated = all.map(t => t.id === id ? { ...t, ...updates } : t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTournaments(updated);
  }, []);

  const getParticipant = useCallback((tournament: OfflineTournament, participantId: string | null) => {
    if (!participantId) return null;
    return tournament.participants.find(p => p.id === participantId) || null;
  }, []);

  const getUserParticipant = useCallback((tournament: OfflineTournament) => {
    return tournament.participants.find(p => !p.is_bot) || null;
  }, []);

  const getUserNextMatch = useCallback((tournament: OfflineTournament) => {
    const userParticipant = getUserParticipant(tournament);
    if (!userParticipant) return null;

    // Find user's next match (pending or in_progress in current round)
    return tournament.matches.find(m =>
      (m.status === "pending" || m.status === "scheduled" || m.status === "in_progress") &&
      (m.player1_participant_id === userParticipant.id || m.player2_participant_id === userParticipant.id)
    ) || null;
  }, [getUserParticipant]);

  const getBotVsBotMatches = useCallback((tournament: OfflineTournament) => {
    const userParticipant = getUserParticipant(tournament);
    if (!userParticipant) return [];

    // Find pending bot vs bot matches in current round
    return tournament.matches.filter(m =>
      m.round === tournament.current_round &&
      (m.status === "pending" || m.status === "scheduled") &&
      m.player1_participant_id !== userParticipant.id &&
      m.player2_participant_id !== userParticipant.id &&
      m.player1_participant_id !== null &&
      m.player2_participant_id !== null
    );
  }, [getUserParticipant]);

  const simulateBotVsBotMatch = useCallback((tournamentId: string, matchId: string): string | null => {
    const tournament = getOfflineTournament(tournamentId);
    if (!tournament) return null;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match || !match.player1_participant_id || !match.player2_participant_id) return null;

    const p1 = getParticipant(tournament, match.player1_participant_id);
    const p2 = getParticipant(tournament, match.player2_participant_id);
    if (!p1 || !p2) return null;

    // Simulate winner based on bot averages (with randomness)
    const p1Avg = p1.bot_average || 50;
    const p2Avg = p2.bot_average || 50;

    // Higher average = better chance to win, but add randomness
    const p1Score = p1Avg + (Math.random() * 20 - 10);
    const p2Score = p2Avg + (Math.random() * 20 - 10);

    const winnerId = p1Score >= p2Score ? p1.id : p2.id;
    const loserId = winnerId === p1.id ? p2.id : p1.id;

    // Update match
    const updatedMatches = tournament.matches.map(m =>
      m.id === matchId ? { ...m, status: "completed" as const, winner_participant_id: winnerId } : m
    );

    // Update loser's eliminated_at_round
    const updatedParticipants = tournament.participants.map(p =>
      p.id === loserId ? { ...p, eliminated_at_round: match.round } : p
    );

    updateTournament(tournamentId, { matches: updatedMatches, participants: updatedParticipants });

    // Advance winner to next round
    advanceWinnerToNextRound(tournamentId, match, winnerId);

    return winnerId;
  }, [getOfflineTournament, getParticipant, updateTournament]);

  const advanceWinnerToNextRound = useCallback((tournamentId: string, currentMatch: OfflineTournamentMatch, winnerId: string) => {
    const tournament = getOfflineTournament(tournamentId);
    if (!tournament) return;

    const totalRounds = Math.log2(tournament.max_players);

    // Check if this was the final
    if (currentMatch.round === totalRounds) {
      // Tournament complete!
      updateTournament(tournamentId, {
        status: "completed",
        winner_id: winnerId
      });
      return;
    }

    // Find next round match
    const nextRound = currentMatch.round + 1;
    const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

    const nextMatch = tournament.matches.find(m =>
      m.round === nextRound && m.match_number === nextMatchNumber
    );

    if (!nextMatch) return;

    // Determine if winner goes to player1 or player2 slot
    const isFirstInPair = currentMatch.match_number % 2 === 1;

    const updatedMatches = tournament.matches.map(m => {
      if (m.id === nextMatch.id) {
        return {
          ...m,
          player1_participant_id: isFirstInPair ? winnerId : m.player1_participant_id,
          player2_participant_id: !isFirstInPair ? winnerId : m.player2_participant_id,
        };
      }
      return m;
    });

    // Check if we need to advance to next round
    const currentRoundMatches = updatedMatches.filter(m => m.round === currentMatch.round);
    const allCurrentRoundComplete = currentRoundMatches.every(m => m.status === "completed");

    if (allCurrentRoundComplete) {
      updateTournament(tournamentId, {
        matches: updatedMatches,
        current_round: nextRound
      });
    } else {
      updateTournament(tournamentId, { matches: updatedMatches });
    }
  }, [getOfflineTournament, updateTournament]);

  const completeOfflineMatch = useCallback((tournamentId: string, matchId: string, winnerId: string) => {
    const tournament = getOfflineTournament(tournamentId);
    if (!tournament) return;

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) return;

    // Find loser
    const loserId = winnerId === match.player1_participant_id
      ? match.player2_participant_id
      : match.player1_participant_id;

    // Update match
    const updatedMatches = tournament.matches.map(m =>
      m.id === matchId ? { ...m, status: "completed" as const, winner_participant_id: winnerId } : m
    );

    // Update loser's eliminated_at_round if loser exists
    let updatedParticipants = tournament.participants;
    if (loserId) {
      updatedParticipants = tournament.participants.map(p =>
        p.id === loserId ? { ...p, eliminated_at_round: match.round } : p
      );
    }

    updateTournament(tournamentId, { matches: updatedMatches, participants: updatedParticipants });

    // Advance winner to next round
    advanceWinnerToNextRound(tournamentId, match, winnerId);
  }, [getOfflineTournament, updateTournament, advanceWinnerToNextRound]);

  const setMatchOfflineMatchId = useCallback((tournamentId: string, matchId: string, offlineMatchId: string) => {
    const tournament = getOfflineTournament(tournamentId);
    if (!tournament) return;

    const updatedMatches = tournament.matches.map(m =>
      m.id === matchId ? { ...m, offline_match_id: offlineMatchId, status: "in_progress" as const } : m
    );

    updateTournament(tournamentId, { matches: updatedMatches });
  }, [getOfflineTournament, updateTournament]);

  return {
    tournaments,
    createOfflineTournament,
    getOfflineTournament,
    getAllOfflineTournaments,
    deleteOfflineTournament,
    updateTournament,
    getParticipant,
    getUserParticipant,
    getUserNextMatch,
    getBotVsBotMatches,
    simulateBotVsBotMatch,
    completeOfflineMatch,
    setMatchOfflineMatchId,
  };
}

// Helper function to generate bracket matches
function generateBracketMatches(participants: OfflineTournamentParticipant[], maxPlayers: number): OfflineTournamentMatch[] {
  const matches: OfflineTournamentMatch[] = [];
  const totalRounds = Math.log2(maxPlayers);

  // Sort participants by seed
  const sortedParticipants = [...participants].sort((a, b) => a.seed - b.seed);

  // Standard bracket seeding - pair highest with lowest
  const seededOrder = getBracketSeeding(maxPlayers);
  const orderedParticipants = seededOrder.map(seed =>
    sortedParticipants.find(p => p.seed === seed)!
  );

  // Generate round 1 matches
  const round1MatchCount = maxPlayers / 2;
  for (let i = 0; i < round1MatchCount; i++) {
    const p1 = orderedParticipants[i * 2];
    const p2 = orderedParticipants[i * 2 + 1];

    matches.push({
      id: generateId(),
      round: 1,
      match_number: i + 1,
      player1_participant_id: p1?.id || null,
      player2_participant_id: p2?.id || null,
      winner_participant_id: null,
      status: "pending",
      offline_match_id: null,
    });
  }

  // Generate placeholder matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = maxPlayers / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateId(),
        round,
        match_number: i + 1,
        player1_participant_id: null,
        player2_participant_id: null,
        winner_participant_id: null,
        status: "pending",
        offline_match_id: null,
      });
    }
  }

  return matches;
}

// Standard tournament bracket seeding order
function getBracketSeeding(size: number): number[] {
  if (size === 2) return [1, 2];
  if (size === 4) return [1, 4, 2, 3];
  if (size === 8) return [1, 8, 4, 5, 2, 7, 3, 6];
  if (size === 16) return [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
  if (size === 32) {
    return [
      1, 32, 16, 17, 8, 25, 9, 24,
      4, 29, 13, 20, 5, 28, 12, 21,
      2, 31, 15, 18, 7, 26, 10, 23,
      3, 30, 14, 19, 6, 27, 11, 22
    ];
  }
  // Fallback: sequential order
  return Array.from({ length: size }, (_, i) => i + 1);
}

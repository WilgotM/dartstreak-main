import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCloudflareCalls } from "@/hooks/useCloudflareCalls";
import type { Json } from "@/integrations/supabase/types";

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_name?: string;
  player2_name?: string;
  starting_score: number;
  checkout_type: "straight_out" | "double_out";
  status: "pending" | "active" | "completed" | "cancelled";
  winner_id: string | null;
  player1_score: number;
  player2_score: number | null;
  current_turn: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  signaling_data: Record<string, unknown>;
  is_offline: boolean;
  legs_to_win: number;
  sets_to_win: number;
  player1_legs: number;
  player2_legs: number;
  player1_sets: number;
  player2_sets: number;
  throw_time_limit: number;
  expires_at: string | null;
  last_throw_at: string | null;
}

export interface HeadToHead {
  player1_id: string;
  player2_id: string;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  last_match_at: string;
}

export interface MatchThrow {
  id: string;
  match_id: string;
  player_id: string;
  throw_number: number;
  dart_1: number;
  dart_2: number;
  dart_3: number;
  total: number;
  remaining_score: number;
  is_bust: boolean;
  created_at: string;
}

export function useMatch(matchId?: string) {
  const { user, isGuest } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [throws, setThrows] = useState<MatchThrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [h2h, setH2h] = useState<HeadToHead | null>(null);

  // Determine if current user is player1 (default to true to avoid undefined issues)
  const isPlayer1 = match ? match.player1_id === user?.id : true;

  // Cloudflare Calls for video - only initialize when we have a valid matchId
  const {
    localStream: cfLocalStream,
    remoteStream: cfRemoteStream,
    connectionState: cfConnectionState,
    localVideoReady: cfLocalVideoReady,
    initSession: cfInitSession,
    cleanup: cfCleanup,
    facingMode: cfFacingMode,
    switchCamera: cfSwitchCamera,
    zoomLevel: cfZoomLevel,
    maxZoom: cfMaxZoom,
    applyZoom: cfApplyZoom,
  } = useCloudflareCalls({
    matchId: match?.id || "",
    isPlayer1,
  });

  // Real-time opponent input (what they're currently entering)
  const [opponentCurrentDarts, setOpponentCurrentDarts] = useState<number[]>([]);

  const getOpponentId = useCallback(() => {
    if (!match || !user) return null;
    return user.id === match.player1_id ? match.player2_id : match.player1_id;
  }, [match, user]);

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;

    // BUG FIX: Wrap localStorage parse in try-catch to prevent crashes on corrupt data
    let storedMatches: any[] = [];
    try {
      storedMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
    } catch {
      console.warn("Corrupt localStorage data, clearing guest matches");
      localStorage.removeItem("dartstreak_guest_matches");
    }

    // Cleanup old local matches (older than 1 hour)
    const localMatches = storedMatches.filter((m: any) => {
      if (m.status === 'completed' && m.completed_at) {
        const completedTime = new Date(m.completed_at).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return completedTime > oneHourAgo;
      }
      return true;
    });

    if (localMatches.length !== storedMatches.length) {
      localStorage.setItem("dartstreak_guest_matches", JSON.stringify(localMatches));
    }
    const localMatch = localMatches.find((m: any) => m.id === matchId);

    if (localMatch) {
      setMatch({
        ...localMatch,
        // Ensure properties match interface
        player1_name: localMatch.signaling_data?.player1_name || "Player 1",
        player2_name: localMatch.signaling_data?.player2_name || "Player 2",
        status: localMatch.status as "pending" | "active" | "completed" | "cancelled",
        checkout_type: localMatch.checkout_type as "straight_out" | "double_out",
      });
      setThrows([]); // Local matches might not store throws in this hook's expected format yet? 
      // Or maybe we need to store throws locally too if we want this hook to work fully.
      // But OfflineMatch.tsx seems to handle its own state mostly. 
      // For now, this is enough to let createMatch work and return ID.
      setLoading(false);
      return;
    }

    // BUG FIX: Set loading to false and return if no user (prevents infinite loading)
    if (!user) {
      setLoading(false);
      setMatch(null);
      return;
    }

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (error) {
      console.error("Error fetching match:", error);
      return;
    }

    // Fetch player names
    const playerIds = [data.player1_id, data.player2_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", playerIds);

    const signaling = (data.signaling_data as Record<string, unknown>) || {};
    const dataWithNewFields = data as any;

    const matchWithNames: Match = {
      ...data,
      checkout_type: data.checkout_type as "straight_out" | "double_out",
      status: data.status as "pending" | "active" | "completed" | "cancelled",
      signaling_data: signaling,
      player1_name: (signaling.player1_name as string) || profiles?.find((p) => p.id === data.player1_id)?.display_name || "Unknown",
      player2_name: (signaling.player2_name as string) || (data.player2_id
        ? profiles?.find((p) => p.id === data.player2_id)?.display_name || "Unknown"
        : null),
      is_offline: data.is_offline,
      legs_to_win: data.legs_to_win,
      sets_to_win: data.sets_to_win,
      player1_legs: data.player1_legs,
      player2_legs: data.player2_legs,
      player1_sets: data.player1_sets,
      player2_sets: data.player2_sets,
      throw_time_limit: dataWithNewFields.throw_time_limit ?? 80,
      expires_at: dataWithNewFields.expires_at ?? null,
      last_throw_at: dataWithNewFields.last_throw_at ?? null,
    };

    setMatch(matchWithNames);

    // Fetch throws
    const { data: throwsData } = await supabase
      .from("match_throws")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    setThrows(throwsData || []);

    // Fetch head-to-head
    if (data.player1_id && data.player2_id) {
      const p1 = data.player1_id < data.player2_id ? data.player1_id : data.player2_id;
      const p2 = data.player1_id < data.player2_id ? data.player2_id : data.player1_id;

      const { data: h2hData } = await (supabase
        .from("head_to_head" as any)
        .select("*")
        .eq("player1_id", p1)
        .eq("player2_id", p2)
        .maybeSingle() as any);

      if (h2hData) {
        setH2h(h2hData as HeadToHead);
      }
    }

    setLoading(false);
  }, [matchId, user]);

  const fetchPendingMatches = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("player2_id", user.id)
      .eq("status", "pending");

    if (data) {
      const player1Ids = data.map((m) => m.player1_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", player1Ids);

      const matchesWithNames: Match[] = data.map((m) => {
        const mWithNewFields = m as any;
        return {
          ...m,
          checkout_type: m.checkout_type as "straight_out" | "double_out",
          status: m.status as "pending" | "active" | "completed" | "cancelled",
          signaling_data: (m.signaling_data as Record<string, unknown>) || {},
          player1_name: profiles?.find((p) => p.id === m.player1_id)?.display_name || "Unknown",
          is_offline: m.is_offline,
          legs_to_win: m.legs_to_win,
          sets_to_win: m.sets_to_win,
          player1_legs: m.player1_legs,
          player2_legs: m.player2_legs,
          player1_sets: m.player1_sets,
          player2_sets: m.player2_sets,
          throw_time_limit: mWithNewFields.throw_time_limit ?? 80,
          expires_at: mWithNewFields.expires_at ?? null,
          last_throw_at: mWithNewFields.last_throw_at ?? null,
        };
      });

      setPendingMatches(matchesWithNames);
    }
  }, [user]);

  useEffect(() => {
    // If we have a matchId, try fetching (even if no user, might be local)
    if (matchId) {
      fetchMatch();
    } else if (user) {
      // Only fetch pending if user is logged in
      fetchPendingMatches();
    }
  }, [user, matchId, fetchMatch, fetchPendingMatches]);

  // Realtime subscription for match updates
  useEffect(() => {
    if (!matchId || !user) return; // Only subscribe if logged in and matchId

    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          fetchMatch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_throws",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchMatch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchMatch, user]); // Added user to dep array

  const createMatch = async (
    opponentId: string | null,
    startingScore: number,
    checkoutType: "straight_out" | "double_out",
    isOffline: boolean = false,
    legsToWin: number = 1,
    setsToWin: number = 1,
    playerNames?: { p1?: string; p2?: string },
    forceLocal: boolean = false,
    throwTimeLimit: number = 80,
    botInfo?: { bot_name: string; bot_average: number } | null
  ) => {
    if (!user && !isGuest) return { error: "Not authenticated", matchId: null };

    const matchId = crypto.randomUUID();
    const signalingData = {
      ...(playerNames?.p1 ? { player1_name: playerNames.p1 } : {}),
      ...(playerNames?.p2 ? { player2_name: playerNames.p2 } : {}),
      ...(botInfo ? { bot: botInfo } : {}),
    };

    // Clamp throwTimeLimit to valid range (1-100 seconds)
    const validThrowTimeLimit = Math.min(100, Math.max(1, throwTimeLimit));

    // For online matches, set expiration to 2 minutes from now
    const expiresAt = isOffline ? null : new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const insertData = {
      id: matchId,
      player1_id: user?.id || localStorage.getItem("dartstreak_guest_id") || "guest",
      player2_id: isOffline ? null : opponentId,
      starting_score: startingScore,
      checkout_type: checkoutType,
      player1_score: startingScore,
      player2_score: startingScore,
      current_turn: user?.id || localStorage.getItem("dartstreak_guest_id") || "guest",
      is_offline: isOffline,
      legs_to_win: legsToWin,
      sets_to_win: setsToWin,
      status: isOffline ? "active" : "pending",
      started_at: isOffline ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      signaling_data: signalingData,
      throw_time_limit: validThrowTimeLimit,
      expires_at: expiresAt,
    };

    if (isGuest || forceLocal) {
      const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
      localStorage.setItem("dartstreak_guest_matches", JSON.stringify([...localMatches, insertData]));
      return { error: null, matchId };
    }

    const { data, error } = await supabase
      .from("matches")
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating match:", error);

      // Fallback for missing columns (migration not run)
      if (error.code === '42703') {
        console.warn("Falling back to legacy match creation (missing columns)");
        const legacyData = { ...insertData };
        // Remove new fields that might be missing
        delete (legacyData as any).throw_time_limit;
        delete (legacyData as any).expires_at;

        const { data: retryData, error: retryError } = await supabase
          .from("matches")
          .insert(legacyData as any)
          .select()
          .single();

        if (retryError) {
          console.error("Error regarding legacy match:", retryError);
          return { error: "Could not create match: " + retryError.message, matchId: null };
        }

        return { error: null, matchId: retryData.id };
      }

      return { error: "Could not create match: " + error.message, matchId: null };
    }

    return { error: null, matchId: data.id };
  };

  const acceptMatch = async () => {
    if (!match || !user) return;

    await supabase
      .from("matches")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: null, // Clear expiration when match starts
        last_throw_at: new Date().toISOString(), // Start turn timer
      } as any)
      .eq("id", match.id);

    fetchMatch();
  };

  const declineMatch = async () => {
    if (!match || !user) return;

    await supabase
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", match.id);
  };

  // Cancel a pending match (used when the challenger leaves the waiting room)
  const cancelPendingMatch = async () => {
    if (!match) return;

    // Delete related data first
    await supabase
      .from("match_throws")
      .delete()
      .eq("match_id", match.id);

    await supabase
      .from("match_signals")
      .delete()
      .eq("match_id", match.id);

    await supabase
      .from("matches")
      .delete()
      .eq("id", match.id);
  };

  // Forfeit match - opponent wins (used for timeouts)
  const forfeitMatch = async (winnerId: string) => {
    if (!match) return;

    await supabase
      .from("matches")
      .update({
        status: "completed",
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    fetchMatch();
  };

  // Cancel/abandon match (when opponent disconnects or leaves)
  const abandonMatch = async () => {
    if (!match || !user) return;

    // Delete related data first
    await supabase
      .from("match_throws")
      .delete()
      .eq("match_id", match.id);

    await supabase
      .from("match_signals")
      .delete()
      .eq("match_id", match.id);

    await supabase
      .from("matches")
      .delete()
      .eq("id", match.id);
  };

  const registerThrow = async (dart1: number, dart2: number, dart3: number, dartDetails?: { score: number; multiplier: number }[]) => {
    if (!match || !user) return;

    const isPlayer1 = user.id === match.player1_id;
    const currentScore = isPlayer1 ? match.player1_score : (match.player2_score || 0);

    // Logic to calculate score considering rules
    let newScore = currentScore;
    let isBust = false;
    let isWinner = false;
    let total = 0; // Recalculate total if needed, or use arg total if no details

    if (dartDetails && dartDetails.length > 0) {
      for (const dart of dartDetails) {
        const nextScore = newScore - dart.score;
        total += dart.score;

        if (match.checkout_type === "double_out") {
          if (nextScore === 0) {
            if (dart.multiplier === 2) {
              newScore = 0;
              isWinner = true;
              break;
            } else {
              isBust = true;
              break;
            }
          } else if (nextScore <= 1) {
            isBust = true;
            break;
          } else {
            newScore = nextScore;
          }
        } else {
          if (nextScore === 0) {
            newScore = 0;
            isWinner = true;
            break;
          } else if (nextScore < 0) {
            isBust = true;
            break;
          } else {
            newScore = nextScore;
          }
        }
      }
    } else {
      // Fallback logic
      total = dart1 + dart2 + dart3;
      newScore = (currentScore || 0) - total;

      if (newScore < 0) {
        isBust = true;
        newScore = currentScore || 0;
      } else if (match.checkout_type === "double_out" && newScore === 1) {
        isBust = true;
        newScore = currentScore || 0;
      } else if (newScore === 0) {
        isWinner = true;
      }
    }

    if (isBust) {
      newScore = currentScore || 0;
      isWinner = false;
    }

    const playerThrows = throws.filter((t) => t.player_id === user.id);
    const throwNumber = playerThrows.length + 1;

    await supabase.from("match_throws").insert({
      match_id: match.id,
      player_id: user.id,
      throw_number: throwNumber,
      dart_1: dart1,
      dart_2: dart2,
      dart_3: dart3,
      total,
      remaining_score: newScore,
      is_bust: isBust,
    });

    const updateData: Record<string, unknown> = {
      current_turn: isPlayer1 ? match.player2_id : match.player1_id,
      last_throw_at: new Date().toISOString(), // Reset turn timer for next player
    };

    if (isPlayer1) {
      updateData.player1_score = newScore;
    } else {
      updateData.player2_score = newScore;
    }

    if (isWinner) {
      updateData.status = "completed";
      updateData.winner_id = user.id;
      updateData.completed_at = new Date().toISOString();
    }

    await supabase.from("matches").update(updateData).eq("id", match.id);

    fetchMatch();
  };

  // NOTE: Old P2P WebRTC signaling code removed - now using Cloudflare Calls SFU

  // Broadcast current darts to opponent in real-time
  const broadcastCurrentDarts = useCallback(async (darts: number[]) => {
    if (!matchId || !user) return;

    const channel = supabase.channel(`match-input-${matchId}`);
    await channel.send({
      type: "broadcast",
      event: "darts-input",
      payload: { userId: user.id, darts },
    });
  }, [matchId, user]);

  // Subscribe to opponent's dart input
  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase
      .channel(`match-input-${matchId}`)
      .on("broadcast", { event: "darts-input" }, (payload) => {
        const data = payload.payload as { userId: string; darts: number[] };
        if (data.userId !== user.id) {
          setOpponentCurrentDarts(data.darts);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  return {
    match,
    throws,
    loading,
    pendingMatches,
    h2h,
    createMatch,
    acceptMatch,
    declineMatch,
    abandonMatch,
    cancelPendingMatch,
    forfeitMatch,
    registerThrow,
    refetch: fetchMatch,
    refetchPending: fetchPendingMatches,
    // Cloudflare Calls video
    localStream: cfLocalStream,
    remoteStream: cfRemoteStream,
    localVideoReady: cfLocalVideoReady,
    connectionState: cfConnectionState,
    isGuest,
    initializeWebRTC: cfInitSession,
    createOffer: async () => {}, // No longer needed with SFU
    cleanupWebRTC: cfCleanup,
    // Camera controls
    facingMode: cfFacingMode,
    switchCamera: cfSwitchCamera,
    zoomLevel: cfZoomLevel,
    maxZoom: cfMaxZoom,
    applyZoom: cfApplyZoom,
    // Real-time input
    opponentCurrentDarts,
    broadcastCurrentDarts,
  };
}

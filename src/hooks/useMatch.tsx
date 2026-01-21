import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface SignalPayload {
  type: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export function useMatch(matchId?: string) {
  const { user, isGuest } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [throws, setThrows] = useState<MatchThrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [h2h, setH2h] = useState<HeadToHead | null>(null);

  // WebRTC
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteMediaStream = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("new");
  // Track processed/queued signals to avoid duplicates
  const processedSignals = useRef<Set<string>>(new Set());
  const queuedSignals = useRef<Set<string>>(new Set());
  const pendingSignals = useRef<Array<{ id: string; signalType: string; payload: SignalPayload }>>([]);

  // Camera controls
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  // Real-time opponent input (what they're currently entering)
  const [opponentCurrentDarts, setOpponentCurrentDarts] = useState<number[]>([]);

  // ICE candidates can arrive before remoteDescription; queue them
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

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
    throwTimeLimit: number = 80
  ) => {
    if (!user && !isGuest) return { error: "Not authenticated", matchId: null };

    const matchId = crypto.randomUUID();
    const signalingData = {
      ...(playerNames?.p1 ? { player1_name: playerNames.p1 } : {}),
      ...(playerNames?.p2 ? { player2_name: playerNames.p2 } : {}),
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

  // Send signal via match_signals table
  const sendSignal = useCallback(
    async (signalType: "offer" | "answer" | "candidate", payload: SignalPayload) => {
      if (!match || !user) return;

      const opponentId = getOpponentId();
      if (!opponentId) {
        console.error("No opponent ID found");
        return;
      }

      console.log(`Sending ${signalType} signal to opponent`);

      const signalData = {
        match_id: match.id,
        from_user_id: user.id,
        to_user_id: opponentId,
        signal_type: signalType,
        payload: payload as unknown as Json,
      };

      const { error } = await supabase.from("match_signals").insert(signalData);

      if (error) {
        console.error("Error sending signal:", error, "Signal data:", signalData);
      } else {
        console.log(`Signal ${signalType} sent successfully`);
      }
    },
    [match, user, getOpponentId]
  );

  // Signal queueing: signals can arrive before initializeWebRTC() finishes (camera permission etc.)
  const enqueueSignal = useCallback((signalType: string, payload: SignalPayload, signalId: string) => {
    if (processedSignals.current.has(signalId) || queuedSignals.current.has(signalId)) return;
    queuedSignals.current.add(signalId);
    pendingSignals.current.push({ id: signalId, signalType, payload });
    console.log(`Queued ${signalType} signal (peer not ready yet)`);
  }, []);

  // We need processSignal defined before flushQueuedSignals
  const processSignal = useCallback(
    async (signalType: string, payload: SignalPayload, signalId: string) => {
      if (processedSignals.current.has(signalId)) return;
      if (!peerConnection.current) {
        console.warn("Cannot process signal - peer connection not ready");
        return;
      }

      console.log(`Processing ${signalType} signal`);

      try {
        if (signalType === "offer") {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
          );
          console.log("Remote description set from offer");

          // Process any queued ICE candidates
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift()!;
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added queued ICE candidate");
          }

          // Create and send answer
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          console.log("Answer created and set as local description");

          await sendSignal("answer", { type: "answer", sdp: answer.sdp });
        } else if (signalType === "answer") {
          if (peerConnection.current.signalingState === "have-local-offer") {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
            );
            console.log("Remote description set from answer");

            // Process any queued ICE candidates
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift()!;
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("Added queued ICE candidate");
            }
          } else {
            console.warn(
              "Ignoring answer - not in have-local-offer state:",
              peerConnection.current.signalingState
            );
            return;
          }
        } else if (signalType === "candidate") {
          const candidate: RTCIceCandidateInit = {
            candidate: payload.candidate,
            sdpMid: payload.sdpMid,
            sdpMLineIndex: payload.sdpMLineIndex,
          };

          if (peerConnection.current.remoteDescription) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added ICE candidate");
          } else {
            // Queue candidate until remote description is set
            iceCandidateQueue.current.push(candidate);
            console.log("Queued ICE candidate (no remote description yet)");
          }
        }

        processedSignals.current.add(signalId);
      } catch (error) {
        console.error(`Error processing ${signalType} signal:`, error);
      }
    },
    [sendSignal]
  );

  const flushQueuedSignals = useCallback(async () => {
    if (!peerConnection.current) return;

    // Keep original order
    const queued = [...pendingSignals.current];
    pendingSignals.current = [];

    for (const item of queued) {
      queuedSignals.current.delete(item.id);
      await processSignal(item.signalType, item.payload, item.id);
    }
  }, [processSignal]);

  const processOrQueueSignal = useCallback(async (signalType: string, payload: SignalPayload, signalId: string) => {
    if (processedSignals.current.has(signalId) || queuedSignals.current.has(signalId)) return;

    if (!peerConnection.current) {
      enqueueSignal(signalType, payload, signalId);
      return;
    }

    await processSignal(signalType, payload, signalId);
  }, [enqueueSignal, processSignal]);

  // Fetch and process existing signals
  const fetchExistingSignals = async () => {
    if (!matchId || !user) return;

    const { data: signals, error } = await supabase
      .from("match_signals")
      .select("*")
      .eq("match_id", matchId)
      .eq("to_user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching signals:", error, "matchId:", matchId, "userId:", user.id);
      return;
    }
    console.log(`Fetched ${signals?.length || 0} existing signals`);

    for (const signal of signals || []) {
      await processOrQueueSignal(
        signal.signal_type,
        signal.payload as unknown as SignalPayload,
        signal.id
      );
    }
  };

  // Realtime subscription for signals
  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase
      .channel(`signals-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_signals",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const signal = payload.new as {
            id: string;
            to_user_id: string;
            signal_type: string;
            payload: unknown;
          };

          // Only process signals sent to us
          if (signal.to_user_id === user.id) {
            console.log(`Realtime: received ${signal.signal_type} signal`);
            await processOrQueueSignal(signal.signal_type, signal.payload as unknown as SignalPayload, signal.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id, processOrQueueSignal]);

  // WebRTC functions
  const initializeWebRTC = async (preferredFacingMode: "user" | "environment" = "environment") => {
    try {
      console.log("Initializing WebRTC...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not available");
        return false;
      }

      // Clear previous state
      processedSignals.current.clear();
      queuedSignals.current.clear();
      pendingSignals.current = [];
      iceCandidateQueue.current = [];

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: preferredFacingMode,
          },
          // Audio is disabled to avoid autoplay blocking (white video) on some browsers.
          audio: false,
        });
      } catch (err) {
        console.warn("Failed to get camera with ideal constraints, trying minimal constraints:", err);
        // Fallback: try with minimal constraints (just facing mode)
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: preferredFacingMode,
          },
          audio: false,
        });
      }
      setFacingMode(preferredFacingMode);
      setLocalVideoReady(true);
      console.log("Local stream obtained");

      // Check zoom capabilities
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
        if (capabilities?.zoom) {
          setMaxZoom(capabilities.zoom.max || 1);
          setZoomLevel(1);
        }
      }

      // Reset remote media stream for this session
      remoteMediaStream.current = null;
      setRemoteStream(null);

      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
        ],
      });

      localStream.current.getTracks().forEach((track) => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
          console.log("Added track:", track.kind);
        }
      });

      // Safari/iOS: ensure we have a transceiver configured for receiving video
      // This helps Safari properly negotiate bidirectional video
      const transceivers = peerConnection.current.getTransceivers();
      transceivers.forEach(t => {
        if (t.receiver.track?.kind === "video" || t.sender.track?.kind === "video") {
          t.direction = "sendrecv";
        }
      });

      peerConnection.current.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        const track = event.track;

        if (!remoteMediaStream.current) {
          remoteMediaStream.current = new MediaStream();
        }

        // Avoid duplicate tracks (Safari can fire multiple times)
        const existing = remoteMediaStream.current.getTracks().some(t => t.id === track.id);
        if (!existing) {
          remoteMediaStream.current.addTrack(track);
        }

        // IMPORTANT: Create new MediaStream instance for React state update
        // Safari/iOS won't re-render if we pass the same object reference
        setRemoteStream(new MediaStream(remoteMediaStream.current.getTracks()));

        // iOS Safari often needs play() triggered after track unmutes
        track.onunmute = () => {
          console.log("Remote track unmuted, triggering state update");
          setRemoteStream(new MediaStream(remoteMediaStream.current!.getTracks()));
        };
      };

      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("New ICE candidate");
          await sendSignal("candidate", {
            type: "candidate",
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        }
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState || "unknown";
        console.log("ICE connection state:", state);
        setConnectionState(state);
      };

      peerConnection.current.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.current?.connectionState);
      };

      // Fetch any signals that were sent before we subscribed (or while we were waiting on permissions)
      await fetchExistingSignals();
      await flushQueuedSignals();

      return true;
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      return false;
    }
  };

  const createOffer = async () => {
    if (!peerConnection.current || !match) return;
    console.log("Creating offer...");

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    console.log("Offer created and set as local description");

    await sendSignal("offer", { type: "offer", sdp: offer.sdp });
  };

  const cleanupWebRTC = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    remoteMediaStream.current = null;
    setRemoteStream(null);
    setLocalVideoReady(false);
    setConnectionState("new");
    processedSignals.current.clear();
    queuedSignals.current.clear();
    pendingSignals.current = [];
    iceCandidateQueue.current = [];
    setZoomLevel(1);
    setMaxZoom(1);
  };

  // Switch between front/back camera
  const switchCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Camera API not available");
      return;
    }

    const newFacingMode = facingMode === "user" ? "environment" : "user";

    // Stop current tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          aspectRatio: 1,
          facingMode: newFacingMode,
        },
        audio: false,
      });

      localStream.current = newStream;
      setFacingMode(newFacingMode);

      // Check zoom capabilities for new camera
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
        if (capabilities?.zoom) {
          setMaxZoom(capabilities.zoom.max || 1);
          setZoomLevel(1);
        } else {
          setMaxZoom(1);
          setZoomLevel(1);
        }
      }

      // Replace track in peer connection
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  // Apply zoom to camera
  const applyZoom = async (zoom: number) => {
    if (!localStream.current) return;

    const videoTrack = localStream.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({
          advanced: [{ zoom } as MediaTrackConstraintSet]
        });
        setZoomLevel(zoom);
      } catch (error) {
        console.error("Error applying zoom:", error);
      }
    }
  };

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
    localStream: localStream.current,
    remoteStream,
    localVideoReady,
    connectionState,
    isGuest,
    initializeWebRTC,
    createOffer,
    cleanupWebRTC,
    // Camera controls
    facingMode,
    switchCamera,
    zoomLevel,
    maxZoom,
    applyZoom,
    // Real-time input
    opponentCurrentDarts,
    broadcastCurrentDarts,
  };
}

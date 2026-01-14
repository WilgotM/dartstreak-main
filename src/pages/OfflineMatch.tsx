import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useTournaments } from "@/hooks/useTournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Target, ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { MatchThrowInput } from "@/components/MatchThrowInput";

interface OfflineMatchData {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_name?: string;
  player2_name?: string;
  starting_score: number;
  checkout_type: "straight_out" | "double_out";
  status: string;
  winner_id: string | null;
  player1_score: number;
  player2_score: number | null;
  current_turn: string | null;
  legs_to_win: number;
  sets_to_win: number;
  player1_legs: number;
  player2_legs: number;
  player1_sets: number;
  player2_sets: number;
  signaling_data?: any;
}

export default function OfflineMatch() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, isGuest } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [match, setMatch] = useState<OfflineMatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // 0 = player1, 1 = player2
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botDarts, setBotDarts] = useState<number[]>([]);
  const { completeTournamentMatch } = useTournaments();
  const tournamentMatchHandled = useRef(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  // Check if this match is part of a tournament
  useEffect(() => {
    const checkTournament = async () => {
      if (!id || isGuest) return;
      const { data } = await supabase
        .from("tournament_matches")
        .select("tournament_id")
        .eq("match_id", id)
        .single();
      if (data) {
        setTournamentId(data.tournament_id);
      }
    };
    checkTournament();
  }, [id, isGuest]);

  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, isGuest, authLoading, navigate]);

  useEffect(() => {
    if (id && (user || isGuest)) {
      fetchMatch();
    }
  }, [id, user, isGuest]);

  // Bot Turn Logic
  useEffect(() => {
    const isBotTurn = currentTurnIndex === 1 && match?.signaling_data?.bot;
    if (isBotTurn && match?.status === "active" && !isBotThinking) {
      const triggerBotMove = async () => {
        setIsBotThinking(true);
        setBotDarts([]);

        const botAvg = match.signaling_data.bot.bot_average || 50;

        // Simulate thinking time before first dart
        await new Promise(r => setTimeout(r, 1500));

        const darts: number[] = [];
        let tempScore = match.player2_score || 0;

        for (let i = 0; i < 3; i++) {
          const dart = generateRealisticDart(tempScore, botAvg, match.checkout_type, i);
          darts.push(dart);
          setBotDarts([...darts]);

          tempScore -= dart;
          if (tempScore <= 0 || (match.checkout_type === "double_out" && tempScore === 1)) {
            // Bust or won, stop throwing
            break;
          }

          // Realistic delay between darts
          await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
        }

        // Delay before confirming
        await new Promise(r => setTimeout(r, 1000));

        // Pad with zeros if less than 3 darts were thrown
        while (darts.length < 3) darts.push(0);

        setIsBotThinking(false);
        setBotDarts([]);
        handleThrowComplete(darts[0], darts[1], darts[2]);
      };

      triggerBotMove();
    }
  }, [currentTurnIndex, match?.status, match?.signaling_data?.bot]);

  // Realistic Dart Generation
  const generateRealisticDart = (currentScore: number, avg: number, checkoutType: string, dartIndexOnTurn: number) => {
    // Basic skill level: 0 to 1 scale. 90 avg is ~0.9 skill, 20 avg is ~0.2 skill
    const skill = Math.min(0.95, Math.max(0.1, (avg - 10) / 80));

    // Determine Target
    let targetNum = 20;
    let targetMult = 1;

    if (currentScore > 100) {
      targetNum = 20;
      targetMult = 3; // Aim for T20
    } else if (currentScore <= 50) {
      if (checkoutType === "double_out") {
        if (currentScore % 2 === 0 && currentScore <= 40) {
          targetNum = currentScore / 2;
          targetMult = 2; // Aim for checkout double
        } else if (currentScore === 50) {
          targetNum = 25;
          targetMult = 2; // Bullseye
        } else {
          // Setup for a double
          targetNum = Math.min(20, Math.max(1, currentScore - 2)); // Save room for a double
          targetMult = 1;
        }
      } else {
        // Straight out
        targetNum = Math.min(20, currentScore);
        if (currentScore === 50 || currentScore === 25) targetNum = 25;
        targetMult = 1;
      }
    } else if (currentScore <= 60) {
      targetNum = Math.min(20, currentScore);
      targetMult = 1;
    } else {
      // Middle range, aim for T20 or setup
      targetNum = 20;
      targetMult = 3;
    }

    // Special case for Bull
    if (targetNum === 25) targetNum = 25;

    // Simulation of accuracy
    const hitRand = Math.random();

    // Probability of hitting triple/double/outer segments
    const hitThreshold = 0.1 + (skill * 0.4); // 0.1 to 0.5 chance of perfect hit

    if (hitRand < hitThreshold) {
      // Perfect hit!
      return targetNum * targetMult;
    } else if (hitRand < hitThreshold + 0.3) {
      // Hit the correct number but wrong multiplier (mostly single)
      return targetNum;
    } else {
      // Missed to neighbor or random
      const neighbors: Record<number, number[]> = {
        20: [1, 5], 1: [20, 18], 18: [1, 4], 4: [18, 13], 13: [4, 6],
        6: [13, 10], 10: [6, 15], 15: [10, 2], 2: [15, 17], 17: [2, 3],
        3: [17, 19], 19: [3, 7], 7: [19, 16], 16: [7, 8], 8: [16, 11],
        11: [8, 14], 14: [11, 9], 9: [14, 12], 12: [9, 5], 5: [12, 20],
        25: [1, 5, 20] // simplified
      };

      const numNeighbors = neighbors[targetNum] || [targetNum - 1, targetNum + 1];
      const neighbor = numNeighbors[Math.floor(Math.random() * numNeighbors.length)];

      // Even if missed to neighbor, might hit a double/triple by accident but rare
      const multRand = Math.random();
      if (multRand > 0.95 && skill > 0.7) return neighbor * 3;
      if (multRand > 0.9 && skill > 0.5) return neighbor * 2;
      return neighbor;
    }
  };

  // Handle tournament match completion
  useEffect(() => {
    if (match?.status === "completed" && match.winner_id && id && !tournamentMatchHandled.current && !isGuest) {
      tournamentMatchHandled.current = true;
      completeTournamentMatch(id, match.winner_id);
    }
  }, [match?.status, match?.winner_id, id, isGuest]);

  const fetchMatch = async () => {
    if (!id) return;

    if (isGuest) {
      const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
      const localMatch = localMatches.find((m: any) => m.id === id);

      if (localMatch) {
        const matchData: OfflineMatchData = {
          ...localMatch,
          player1_name: localMatch.player1_name || t("match.player1"),
          player2_name: localMatch.player2_name || t("match.player2"),
        };
        setMatch(matchData);
        setCurrentTurnIndex(localMatch.current_turn === localMatch.player1_id ? 0 : 1);
      }
      setLoading(false);
      return;
    }

    if (!user) return;

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching match:", error);
      setLoading(false);
      return;
    }

    // Fetch player names
    const playerIds = [data.player1_id, data.player2_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", playerIds);

    const matchData: OfflineMatchData = {
      ...data,
      checkout_type: data.checkout_type as "straight_out" | "double_out",
      player1_name: profiles?.find((p) => p.id === data.player1_id)?.display_name || t("match.player1"),
      player2_name: data.player2_id
        ? profiles?.find((p) => p.id === data.player2_id)?.display_name || t("match.player2")
        : (data.signaling_data as any)?.bot?.bot_name || t("match.player2"),
    };

    setMatch(matchData);
    // Determine whose turn based on current_turn
    setCurrentTurnIndex(data.current_turn === data.player1_id ? 0 : 1);
    setLoading(false);
  };

  const handleThrowComplete = async (dart1: number, dart2: number, dart3: number) => {
    if (!match) return;

    const isPlayer1Turn = currentTurnIndex === 0;
    const currentScore = isPlayer1Turn ? match.player1_score : (match.player2_score || 0);
    const total = dart1 + dart2 + dart3;
    let newScore = currentScore - total;
    let isBust = false;

    // Check for bust
    if (newScore < 0) {
      isBust = true;
      newScore = currentScore;
    } else if (match.checkout_type === "double_out" && newScore === 1) {
      isBust = true;
      newScore = currentScore;
    }

    if (isBust && !isBotThinking) {
      toast.error(t("match.bust"));
    }

    // Check if leg won
    if (newScore === 0) {
      await handleLegWon(isPlayer1Turn);
      return;
    }

    // Update scores and switch turn
    const updateData: Record<string, unknown> = {};
    if (isPlayer1Turn) {
      updateData.player1_score = newScore;
      updateData.current_turn = match.player2_id || "player2";
    } else {
      updateData.player2_score = newScore;
      updateData.current_turn = match.player1_id;
    }

    if (isGuest) {
      saveMatchLocally(match.id, updateData);
    } else {
      await supabase.from("matches").update(updateData).eq("id", match.id);
    }

    setMatch((prev) =>
      prev
        ? {
          ...prev,
          player1_score: isPlayer1Turn ? newScore : prev.player1_score,
          player2_score: isPlayer1Turn ? prev.player2_score : newScore,
          current_turn: isPlayer1Turn ? (prev.player2_id || "player2") : prev.player1_id,
        }
        : null
    );
    setCurrentTurnIndex(isPlayer1Turn ? 1 : 0);
  };

  const saveMatchLocally = (matchId: string, updateData: any) => {
    const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
    const updatedMatches = localMatches.map((m: any) =>
      m.id === matchId ? { ...m, ...updateData } : m
    );
    localStorage.setItem("dartstreak_guest_matches", JSON.stringify(updatedMatches));
  };

  const handleLegWon = async (isPlayer1: boolean) => {
    if (!match) return;

    const newP1Legs = isPlayer1 ? match.player1_legs + 1 : match.player1_legs;
    const newP2Legs = isPlayer1 ? match.player2_legs : match.player2_legs + 1;

    const winnerName = isPlayer1 ? match.player1_name : match.player2_name;
    toast.success(t("match.legWon", { name: winnerName }));

    // Check if set won
    if ((isPlayer1 && newP1Legs >= match.legs_to_win) || (!isPlayer1 && newP2Legs >= match.legs_to_win)) {
      await handleSetWon(isPlayer1, newP1Legs, newP2Legs);
      return;
    }

    // Reset scores for new leg
    const updateData = {
      player1_score: match.starting_score,
      player2_score: match.starting_score,
      player1_legs: newP1Legs,
      player2_legs: newP2Legs,
      current_turn: match.player1_id, // Winner starts next leg? Or alternate? Using player1 for simplicity
    };

    if (isGuest) {
      saveMatchLocally(match.id, updateData);
    } else {
      await supabase.from("matches").update(updateData).eq("id", match.id);
    }

    setMatch((prev) =>
      prev
        ? {
          ...prev,
          ...updateData,
        }
        : null
    );
    setCurrentTurnIndex(0);
  };

  const handleSetWon = async (isPlayer1: boolean, newP1Legs: number, newP2Legs: number) => {
    if (!match) return;

    const newP1Sets = isPlayer1 ? match.player1_sets + 1 : match.player1_sets;
    const newP2Sets = isPlayer1 ? match.player2_sets : match.player2_sets + 1;

    const winnerName = isPlayer1 ? match.player1_name : match.player2_name;
    toast.success(t("match.setWon", { name: winnerName }));

    // Check if match won
    if ((isPlayer1 && newP1Sets >= match.sets_to_win) || (!isPlayer1 && newP2Sets >= match.sets_to_win)) {
      const matchCompletionData = {
        status: "completed",
        winner_id: isPlayer1 ? match.player1_id : match.player2_id,
        completed_at: new Date().toISOString(),
        player1_legs: 0,
        player2_legs: 0,
        player1_sets: newP1Sets,
        player2_sets: newP2Sets,
        player1_score: match.starting_score,
        player2_score: match.starting_score,
      };

      if (isGuest) {
        saveMatchLocally(match.id, matchCompletionData);
      } else {
        await supabase.from("matches").update(matchCompletionData).eq("id", match.id);
      }

      setMatch((prev) =>
        prev
          ? {
            ...prev,
            status: "completed",
            winner_id: isPlayer1 ? prev.player1_id : prev.player2_id,
            player1_sets: newP1Sets,
            player2_sets: newP2Sets,
          }
          : null
      );
      return;
    }

    // Reset for new set
    const updateData = {
      player1_score: match.starting_score,
      player2_score: match.starting_score,
      player1_legs: 0,
      player2_legs: 0,
      player1_sets: newP1Sets,
      player2_sets: newP2Sets,
      current_turn: match.player1_id,
    };

    if (isGuest) {
      saveMatchLocally(match.id, updateData);
    } else {
      await supabase.from("matches").update(updateData).eq("id", match.id);
    }

    setMatch((prev) =>
      prev
        ? {
          ...prev,
          ...updateData,
        }
        : null
    );
    setCurrentTurnIndex(0);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">{t("match.notFound")}</p>
            <Button onClick={() => navigate("/matches")} className="mt-4">
              {t("common.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed match
  if (match.status === "completed") {
    const isPlayer1Winner = match.winner_id === match.player1_id;
    const backPath = tournamentId ? `/tournament/${tournamentId}` : "/matches";

    // Auto-redirect to tournament after 3 seconds
    useEffect(() => {
      if (tournamentId) {
        const timer = setTimeout(() => {
          navigate(backPath);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [tournamentId, navigate, backPath]);

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">{t("match.matchComplete")}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="py-8 space-y-4">
              <Trophy className="w-16 h-16 mx-auto text-dart-gold" />
              <h2 className="text-2xl font-display font-bold">
                {isPlayer1Winner ? match.player1_name : match.player2_name} {t("match.wins")}!
              </h2>
              <p className="text-muted-foreground">
                {t("match.sets")}: {match.player1_sets} - {match.player2_sets}
              </p>
              {tournamentId && (
                <p className="text-sm text-muted-foreground">
                  {t("tournament.returningToTournament")}
                </p>
              )}
              <Button onClick={() => navigate(backPath)} variant="hero">
                {tournamentId ? t("tournament.backToTournament") : t("common.back")}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isPlayer1Turn = currentTurnIndex === 0;
  const isBotTurn = currentTurnIndex === 1 && match?.signaling_data?.bot;
  const currentPlayerName = isPlayer1Turn ? match.player1_name : (isBotTurn ? match.signaling_data.bot.bot_name : match.player2_name);
  const currentScore = isPlayer1Turn ? match.player1_score : (match.player2_score || 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with scores */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate("/matches")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Score display */}
            <div className="flex items-center gap-4">
              <div className={`text-center ${isPlayer1Turn ? "ring-2 ring-primary rounded-lg p-2" : "p-2"}`}>
                <p className="text-xs text-muted-foreground">{match.player1_name}</p>
                <p className="text-3xl font-display font-bold">{match.player1_score}</p>
              </div>
              <span className="text-muted-foreground">vs</span>
              <div className={`text-center ${!isPlayer1Turn ? "ring-2 ring-primary rounded-lg p-2" : "p-2"}`}>
                <p className="text-xs text-muted-foreground">{match.player2_name}</p>
                <p className="text-3xl font-display font-bold">{match.player2_score}</p>
              </div>
            </div>

            <div className="w-10" />
          </div>

          {/* Legs/Sets display */}
          {(match.legs_to_win > 1 || match.sets_to_win > 1) && (
            <div className="flex justify-center gap-6 mt-2 text-sm">
              {match.sets_to_win > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("match.sets")}:</span>
                  <span className="font-bold">{match.player1_sets}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-bold">{match.player2_sets}</span>
                </div>
              )}
              {match.legs_to_win > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("match.legs")}:</span>
                  <span className="font-bold">{match.player1_legs}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-bold">{match.player2_legs}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Current player indicator */}
        <div className={`${isBotThinking ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"} text-center py-4 rounded-lg transition-colors`}>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <RotateCcw className={`w-4 h-4 ${isBotThinking ? "animate-spin" : ""}`} />
              <span className="font-medium">
                {isBotThinking ? t("match.opponentTurn", { name: currentPlayerName }) : t("match.playerTurn", { name: currentPlayerName })}
              </span>
            </div>

            {/* Show bot's individually thrown darts */}
            {isBotThinking && botDarts.length > 0 && (
              <div className="flex gap-4 mt-2 animate-in fade-in slide-in-from-bottom-2">
                {botDarts.map((d, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Throw input */}
        <Card className="flex-1">
          <CardContent className="pt-4">
            <MatchThrowInput
              onComplete={handleThrowComplete}
              remainingScore={currentScore}
              disabled={isBotTurn || isBotThinking}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

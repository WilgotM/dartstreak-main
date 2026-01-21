import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useTournaments } from "@/hooks/useTournaments";
import { useOfflineTournaments } from "@/hooks/useOfflineTournaments";
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
  isLocal?: boolean;
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
  const { completeOfflineMatch, getOfflineTournament } = useOfflineTournaments();
  const tournamentMatchHandled = useRef(false);
  const offlineTournamentHandled = useRef(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [offlineTournamentId, setOfflineTournamentId] = useState<string | null>(null);

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

        const darts: { score: number; multiplier: number }[] = [];
        // BUG FIX: Use starting_score as fallback, not 0 (which would make bot think game is over)
        let tempScore = match.player2_score ?? match.starting_score;

        for (let i = 0; i < 3; i++) {
          const dart = generateRealisticDart(tempScore, botAvg, match.checkout_type, i);
          darts.push(dart);
          setBotDarts(prev => [...prev, dart.score]); // Only store scores for display

          tempScore -= dart.score;
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
        while (darts.length < 3) darts.push({ score: 0, multiplier: 0 });

        setIsBotThinking(false);
        setBotDarts([]); // Clear display darts
        handleThrowComplete(darts[0].score, darts[1].score, darts[2].score, darts);
      };

      triggerBotMove();
    }
  }, [currentTurnIndex, match?.status, match?.signaling_data?.bot]);

  // Realistic Dart Generation - DartCounter-style accuracy
  const generateRealisticDart = (currentScore: number, avg: number, checkoutType: string, dartIndexOnTurn: number): { score: number; multiplier: number } => {
    // Dartboard layout (clockwise from top)
    const boardOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

    const getNeighbors = (num: number): number[] => {
      if (num === 25) return [20, 1, 5, 12, 9]; // Bull neighbors (inner ring singles)
      const idx = boardOrder.indexOf(num);
      if (idx === -1) return [num];
      const left = boardOrder[(idx - 1 + 20) % 20];
      const right = boardOrder[(idx + 1) % 20];
      return [left, right];
    };

    // Skill scales with average: 20 avg = 0.1 skill, 120 avg = 1.0 skill
    const skill = Math.min(1.0, Math.max(0.1, (avg - 10) / 110));

    // Hit probabilities based on skill (realistic distribution)
    const tripleHitRate = skill * 0.45; // Max 45% triple hit rate at 120 avg
    const doubleHitRate = skill * 0.38; // Max 38% double hit rate at 120 avg  
    const bullseyeHitRate = skill * 0.12; // D25 is hard, max 12%
    const bull25HitRate = skill * 0.35; // S25 easier, max 35%

    // Determine what the bot is aiming for
    let targetNum = 20;
    let targetMult = 3;

    // Checkout logic (professional checkout paths)
    const checkoutPaths: Record<number, { target: number; mult: number }[]> = {
      170: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 25, mult: 2 }],
      167: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 25, mult: 2 }],
      164: [{ target: 20, mult: 3 }, { target: 18, mult: 3 }, { target: 25, mult: 2 }],
      161: [{ target: 20, mult: 3 }, { target: 17, mult: 3 }, { target: 25, mult: 2 }],
      160: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 20, mult: 2 }],
      158: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 19, mult: 2 }],
      157: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 20, mult: 2 }],
      156: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 18, mult: 2 }],
      155: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 19, mult: 2 }],
      154: [{ target: 20, mult: 3 }, { target: 18, mult: 3 }, { target: 20, mult: 2 }],
      141: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 12, mult: 2 }],
      140: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 10, mult: 2 }],
      139: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 11, mult: 2 }],
      138: [{ target: 20, mult: 3 }, { target: 18, mult: 3 }, { target: 12, mult: 2 }],
      137: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 10, mult: 2 }],
      136: [{ target: 20, mult: 3 }, { target: 20, mult: 3 }, { target: 8, mult: 2 }],
      135: [{ target: 20, mult: 3 }, { target: 17, mult: 3 }, { target: 12, mult: 2 }],
      134: [{ target: 20, mult: 3 }, { target: 14, mult: 3 }, { target: 16, mult: 2 }],
      133: [{ target: 20, mult: 3 }, { target: 19, mult: 3 }, { target: 8, mult: 2 }],
      132: [{ target: 20, mult: 3 }, { target: 16, mult: 3 }, { target: 12, mult: 2 }],
      131: [{ target: 20, mult: 3 }, { target: 13, mult: 3 }, { target: 16, mult: 2 }],
      130: [{ target: 20, mult: 3 }, { target: 18, mult: 3 }, { target: 8, mult: 2 }],
      129: [{ target: 19, mult: 3 }, { target: 16, mult: 3 }, { target: 12, mult: 2 }],
      128: [{ target: 18, mult: 3 }, { target: 14, mult: 3 }, { target: 16, mult: 2 }],
      127: [{ target: 20, mult: 3 }, { target: 17, mult: 3 }, { target: 8, mult: 2 }],
      126: [{ target: 19, mult: 3 }, { target: 19, mult: 3 }, { target: 6, mult: 2 }],
      125: [{ target: 18, mult: 3 }, { target: 19, mult: 3 }, { target: 4, mult: 2 }],
      124: [{ target: 20, mult: 3 }, { target: 14, mult: 3 }, { target: 11, mult: 2 }],
      123: [{ target: 19, mult: 3 }, { target: 16, mult: 3 }, { target: 9, mult: 2 }],
      122: [{ target: 18, mult: 3 }, { target: 18, mult: 3 }, { target: 7, mult: 2 }],
      121: [{ target: 20, mult: 3 }, { target: 11, mult: 3 }, { target: 14, mult: 2 }],
      120: [{ target: 20, mult: 3 }, { target: 20, mult: 1 }, { target: 20, mult: 2 }],
      119: [{ target: 19, mult: 3 }, { target: 12, mult: 3 }, { target: 13, mult: 2 }],
      118: [{ target: 20, mult: 3 }, { target: 18, mult: 1 }, { target: 20, mult: 2 }],
      117: [{ target: 20, mult: 3 }, { target: 17, mult: 1 }, { target: 20, mult: 2 }],
      116: [{ target: 20, mult: 3 }, { target: 16, mult: 1 }, { target: 20, mult: 2 }],
      115: [{ target: 20, mult: 3 }, { target: 15, mult: 1 }, { target: 20, mult: 2 }],
      114: [{ target: 20, mult: 3 }, { target: 14, mult: 1 }, { target: 20, mult: 2 }],
      113: [{ target: 20, mult: 3 }, { target: 13, mult: 1 }, { target: 20, mult: 2 }],
      112: [{ target: 20, mult: 3 }, { target: 12, mult: 1 }, { target: 20, mult: 2 }],
      111: [{ target: 20, mult: 3 }, { target: 19, mult: 1 }, { target: 16, mult: 2 }],
      110: [{ target: 20, mult: 3 }, { target: 18, mult: 1 }, { target: 16, mult: 2 }],
      109: [{ target: 20, mult: 3 }, { target: 17, mult: 1 }, { target: 16, mult: 2 }],
      108: [{ target: 20, mult: 3 }, { target: 16, mult: 1 }, { target: 16, mult: 2 }],
      107: [{ target: 19, mult: 3 }, { target: 18, mult: 1 }, { target: 16, mult: 2 }],
      106: [{ target: 20, mult: 3 }, { target: 14, mult: 1 }, { target: 16, mult: 2 }],
      105: [{ target: 20, mult: 3 }, { target: 13, mult: 1 }, { target: 16, mult: 2 }],
      104: [{ target: 18, mult: 3 }, { target: 18, mult: 1 }, { target: 16, mult: 2 }],
      103: [{ target: 19, mult: 3 }, { target: 14, mult: 1 }, { target: 16, mult: 2 }],
      102: [{ target: 20, mult: 3 }, { target: 10, mult: 1 }, { target: 16, mult: 2 }],
      101: [{ target: 20, mult: 3 }, { target: 9, mult: 1 }, { target: 16, mult: 2 }],
      100: [{ target: 20, mult: 3 }, { target: 20, mult: 2 }],
      99: [{ target: 19, mult: 3 }, { target: 10, mult: 1 }, { target: 16, mult: 2 }],
      98: [{ target: 20, mult: 3 }, { target: 19, mult: 2 }],
      97: [{ target: 19, mult: 3 }, { target: 20, mult: 2 }],
      96: [{ target: 20, mult: 3 }, { target: 18, mult: 2 }],
      95: [{ target: 19, mult: 3 }, { target: 19, mult: 2 }],
      94: [{ target: 18, mult: 3 }, { target: 20, mult: 2 }],
      93: [{ target: 19, mult: 3 }, { target: 18, mult: 2 }],
      92: [{ target: 20, mult: 3 }, { target: 16, mult: 2 }],
      91: [{ target: 17, mult: 3 }, { target: 20, mult: 2 }],
      90: [{ target: 18, mult: 3 }, { target: 18, mult: 2 }],
      89: [{ target: 19, mult: 3 }, { target: 16, mult: 2 }],
      88: [{ target: 16, mult: 3 }, { target: 20, mult: 2 }],
      87: [{ target: 17, mult: 3 }, { target: 18, mult: 2 }],
      86: [{ target: 18, mult: 3 }, { target: 16, mult: 2 }],
      85: [{ target: 15, mult: 3 }, { target: 20, mult: 2 }],
      84: [{ target: 20, mult: 3 }, { target: 12, mult: 2 }],
      83: [{ target: 17, mult: 3 }, { target: 16, mult: 2 }],
      82: [{ target: 14, mult: 3 }, { target: 20, mult: 2 }],
      81: [{ target: 19, mult: 3 }, { target: 12, mult: 2 }],
      80: [{ target: 20, mult: 3 }, { target: 10, mult: 2 }],
      79: [{ target: 13, mult: 3 }, { target: 20, mult: 2 }],
      78: [{ target: 18, mult: 3 }, { target: 12, mult: 2 }],
      77: [{ target: 19, mult: 3 }, { target: 10, mult: 2 }],
      76: [{ target: 20, mult: 3 }, { target: 8, mult: 2 }],
      75: [{ target: 17, mult: 3 }, { target: 12, mult: 2 }],
      74: [{ target: 14, mult: 3 }, { target: 16, mult: 2 }],
      73: [{ target: 19, mult: 3 }, { target: 8, mult: 2 }],
      72: [{ target: 16, mult: 3 }, { target: 12, mult: 2 }],
      71: [{ target: 13, mult: 3 }, { target: 16, mult: 2 }],
      70: [{ target: 18, mult: 3 }, { target: 8, mult: 2 }],
      69: [{ target: 19, mult: 3 }, { target: 6, mult: 2 }],
      68: [{ target: 20, mult: 3 }, { target: 4, mult: 2 }],
      67: [{ target: 17, mult: 3 }, { target: 8, mult: 2 }],
      66: [{ target: 10, mult: 3 }, { target: 18, mult: 2 }],
      65: [{ target: 25, mult: 1 }, { target: 20, mult: 2 }],
      64: [{ target: 16, mult: 3 }, { target: 8, mult: 2 }],
      63: [{ target: 13, mult: 3 }, { target: 12, mult: 2 }],
      62: [{ target: 10, mult: 3 }, { target: 16, mult: 2 }],
      61: [{ target: 15, mult: 3 }, { target: 8, mult: 2 }],
      60: [{ target: 20, mult: 1 }, { target: 20, mult: 2 }],
      59: [{ target: 19, mult: 1 }, { target: 20, mult: 2 }],
      58: [{ target: 18, mult: 1 }, { target: 20, mult: 2 }],
      57: [{ target: 17, mult: 1 }, { target: 20, mult: 2 }],
      56: [{ target: 16, mult: 1 }, { target: 20, mult: 2 }],
      55: [{ target: 15, mult: 1 }, { target: 20, mult: 2 }],
      54: [{ target: 14, mult: 1 }, { target: 20, mult: 2 }],
      53: [{ target: 13, mult: 1 }, { target: 20, mult: 2 }],
      52: [{ target: 12, mult: 1 }, { target: 20, mult: 2 }],
      51: [{ target: 11, mult: 1 }, { target: 20, mult: 2 }],
      50: [{ target: 25, mult: 2 }],
      49: [{ target: 9, mult: 1 }, { target: 20, mult: 2 }],
      48: [{ target: 8, mult: 1 }, { target: 20, mult: 2 }],
      47: [{ target: 7, mult: 1 }, { target: 20, mult: 2 }],
      46: [{ target: 6, mult: 1 }, { target: 20, mult: 2 }],
      45: [{ target: 13, mult: 1 }, { target: 16, mult: 2 }],
      44: [{ target: 4, mult: 1 }, { target: 20, mult: 2 }],
      43: [{ target: 3, mult: 1 }, { target: 20, mult: 2 }],
      42: [{ target: 10, mult: 1 }, { target: 16, mult: 2 }],
      41: [{ target: 9, mult: 1 }, { target: 16, mult: 2 }],
      40: [{ target: 20, mult: 2 }],
      39: [{ target: 7, mult: 1 }, { target: 16, mult: 2 }],
      38: [{ target: 19, mult: 2 }],
      37: [{ target: 5, mult: 1 }, { target: 16, mult: 2 }],
      36: [{ target: 18, mult: 2 }],
      35: [{ target: 3, mult: 1 }, { target: 16, mult: 2 }],
      34: [{ target: 17, mult: 2 }],
      33: [{ target: 1, mult: 1 }, { target: 16, mult: 2 }],
      32: [{ target: 16, mult: 2 }],
      31: [{ target: 7, mult: 1 }, { target: 12, mult: 2 }],
      30: [{ target: 15, mult: 2 }],
      29: [{ target: 5, mult: 1 }, { target: 12, mult: 2 }],
      28: [{ target: 14, mult: 2 }],
      27: [{ target: 3, mult: 1 }, { target: 12, mult: 2 }],
      26: [{ target: 13, mult: 2 }],
      25: [{ target: 1, mult: 1 }, { target: 12, mult: 2 }],
      24: [{ target: 12, mult: 2 }],
      23: [{ target: 3, mult: 1 }, { target: 10, mult: 2 }],
      22: [{ target: 11, mult: 2 }],
      21: [{ target: 1, mult: 1 }, { target: 10, mult: 2 }],
      20: [{ target: 10, mult: 2 }],
      19: [{ target: 3, mult: 1 }, { target: 8, mult: 2 }],
      18: [{ target: 9, mult: 2 }],
      17: [{ target: 1, mult: 1 }, { target: 8, mult: 2 }],
      16: [{ target: 8, mult: 2 }],
      15: [{ target: 1, mult: 1 }, { target: 7, mult: 2 }],
      14: [{ target: 7, mult: 2 }],
      13: [{ target: 1, mult: 1 }, { target: 6, mult: 2 }],
      12: [{ target: 6, mult: 2 }],
      11: [{ target: 3, mult: 1 }, { target: 4, mult: 2 }],
      10: [{ target: 5, mult: 2 }],
      9: [{ target: 1, mult: 1 }, { target: 4, mult: 2 }],
      8: [{ target: 4, mult: 2 }],
      7: [{ target: 3, mult: 1 }, { target: 2, mult: 2 }],
      6: [{ target: 3, mult: 2 }],
      5: [{ target: 1, mult: 1 }, { target: 2, mult: 2 }],
      4: [{ target: 2, mult: 2 }],
      3: [{ target: 1, mult: 1 }, { target: 1, mult: 2 }],
      2: [{ target: 1, mult: 2 }],
    };

    // Determine target based on score and checkout path
    if (checkoutType === "double_out" && currentScore <= 170 && checkoutPaths[currentScore]) {
      const path = checkoutPaths[currentScore];
      const dartInPath = Math.min(dartIndexOnTurn, path.length - 1);
      targetNum = path[dartInPath].target;
      targetMult = path[dartInPath].mult;
    } else if (currentScore > 100) {
      // Scoring phase - aim for T20
      targetNum = 20;
      targetMult = 3;
    } else if (currentScore > 60) {
      // Try to setup for a checkout
      targetNum = 20;
      targetMult = 3;
    } else {
      // Low score - be careful, aim for setup
      if (checkoutType === "double_out") {
        if (currentScore % 2 === 0 && currentScore <= 40) {
          targetNum = currentScore / 2;
          targetMult = 2;
        } else if (currentScore === 50) {
          targetNum = 25;
          targetMult = 2;
        } else {
          // Setup - aim for a single to leave a double
          const setupTarget = currentScore - 32; // Leave D16
          if (setupTarget > 0 && setupTarget <= 20) {
            targetNum = setupTarget;
            targetMult = 1;
          } else {
            targetNum = Math.min(20, currentScore - 2);
            targetMult = 1;
          }
        }
      } else {
        targetNum = Math.min(20, currentScore);
        targetMult = 1;
      }
    }

    // Simulate the throw with realistic variance
    const rand = Math.random();

    // Different hit rates for different targets
    let hitRate: number;
    if (targetNum === 25 && targetMult === 2) {
      hitRate = bullseyeHitRate;
    } else if (targetNum === 25 && targetMult === 1) {
      hitRate = bull25HitRate;
    } else if (targetMult === 3) {
      hitRate = tripleHitRate;
    } else if (targetMult === 2) {
      hitRate = doubleHitRate;
    } else {
      hitRate = 0.65 + (skill * 0.30); // Singles are easier: 65-95%
    }

    // Perfect hit
    if (rand < hitRate) {
      return { score: targetNum * targetMult, multiplier: targetMult };
    }

    // Miss logic - depends on what we were aiming for
    if (targetNum === 25) {
      // Missed bull - hit single 25 or a random single
      if (Math.random() < 0.5) {
        return { score: 25, multiplier: 1 }; // S25
      } else {
        const randomSingle = boardOrder[Math.floor(Math.random() * 20)];
        return { score: randomSingle, multiplier: 1 };
      }
    }

    if (targetMult === 3) {
      // Missed triple - usually hit single of same number or neighbor
      const missRand = Math.random();
      if (missRand < 0.55) {
        // Hit single of same number (most common)
        return { score: targetNum, multiplier: 1 };
      } else if (missRand < 0.75) {
        // Hit single of neighbor
        const neighbors = getNeighbors(targetNum);
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        return { score: neighbor, multiplier: 1 };
      } else if (missRand < 0.88) {
        // Hit triple of neighbor (less common)
        const neighbors = getNeighbors(targetNum);
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Only hit neighbor triple if skilled enough
        if (Math.random() < skill * 0.4) {
          return { score: neighbor * 3, multiplier: 3 };
        }
        return { score: neighbor, multiplier: 1 };
      } else {
        // Wire into big single or double
        if (Math.random() < 0.3) {
          return { score: targetNum * 2, multiplier: 2 }; // Hit the double
        }
        return { score: targetNum, multiplier: 1 };
      }
    }

    if (targetMult === 2) {
      // Missed double - critical for checkouts
      const missRand = Math.random();
      if (missRand < 0.45) {
        // Hit single of same number
        return { score: targetNum, multiplier: 1 };
      } else if (missRand < 0.70) {
        // Miss outside (off the board) - score 0
        return { score: 0, multiplier: 0 };
      } else if (missRand < 0.85) {
        // Hit neighbor single
        const neighbors = getNeighbors(targetNum);
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        return { score: neighbor, multiplier: 1 };
      } else {
        // Hit neighbor double (rare)
        const neighbors = getNeighbors(targetNum);
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        if (Math.random() < skill * 0.3) {
          return { score: neighbor * 2, multiplier: 2 };
        }
        return { score: neighbor, multiplier: 1 };
      }
    }

    // Missed single - usually hit neighbor or same number
    const missRand = Math.random();
    if (missRand < 0.6) {
      return { score: targetNum, multiplier: 1 }; // Still hit the single
    } else {
      const neighbors = getNeighbors(targetNum);
      const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      return { score: neighbor, multiplier: 1 };
    }
  };

  // Handle tournament match completion
  useEffect(() => {
    if (match?.status === "completed" && match.winner_id && id && !tournamentMatchHandled.current && !isGuest && !match.isLocal) {
      tournamentMatchHandled.current = true;
      completeTournamentMatch(id, match.winner_id);
    }
  }, [match?.status, match?.winner_id, id, isGuest, match?.isLocal]);

  // Handle offline tournament match completion
  useEffect(() => {
    if (match?.status === "completed" && id && !offlineTournamentHandled.current && match.isLocal) {
      const offlineTournamentData = match.signaling_data?.offlineTournament;
      if (offlineTournamentData) {
        offlineTournamentHandled.current = true;
        setOfflineTournamentId(offlineTournamentData.tournamentId);

        // Determine winner participant id
        const isPlayer1Winner = match.winner_id === match.player1_id;
        const winnerParticipantId = isPlayer1Winner
          ? offlineTournamentData.userParticipantId
          : offlineTournamentData.opponentParticipantId;

        completeOfflineMatch(
          offlineTournamentData.tournamentId,
          offlineTournamentData.matchId,
          winnerParticipantId
        );
      }
    }
  }, [match?.status, match?.winner_id, id, match?.isLocal, match?.signaling_data, completeOfflineMatch]);

  // Auto-redirect to tournament after match completion
  useEffect(() => {
    if (match?.status === "completed" && tournamentId) {
      const timer = setTimeout(() => {
        navigate(`/tournament/${tournamentId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [match?.status, tournamentId, navigate]);

  // Auto-redirect to offline tournament after match completion
  useEffect(() => {
    if (match?.status === "completed" && offlineTournamentId) {
      const timer = setTimeout(() => {
        navigate(`/offline-tournament/${offlineTournamentId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [match?.status, offlineTournamentId, navigate]);

  const fetchMatch = async () => {
    if (!id) return;

    // 1. Try to find in local storage first (covers guest matches and "forceLocal" matches for logged-in users)
    const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
    const localMatch = localMatches.find((m: any) => m.id === id);

    if (localMatch) {
      const matchData: OfflineMatchData = {
        ...localMatch,
        player1_name: localMatch.signaling_data?.player1_name || localMatch.player1_name || t("match.player1"),
        player2_name: localMatch.signaling_data?.player2_name || localMatch.player2_name || t("match.player2"),
        isLocal: true,
      };
      setMatch(matchData);
      setCurrentTurnIndex(localMatch.current_turn === localMatch.player1_id ? 0 : 1);
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

    const signaling = (data.signaling_data as any) || {};

    const matchData: OfflineMatchData = {
      ...data,
      checkout_type: data.checkout_type as "straight_out" | "double_out",
      player1_name: signaling.player1_name || profiles?.find((p) => p.id === data.player1_id)?.display_name || t("match.player1"),
      player2_name: signaling.player2_name || (data.player2_id
        ? profiles?.find((p) => p.id === data.player2_id)?.display_name || t("match.player2")
        : signaling?.bot?.bot_name || t("match.player2")),
      isLocal: false,
    };

    setMatch(matchData);
    // Determine whose turn based on current_turn
    setCurrentTurnIndex(data.current_turn === data.player1_id ? 0 : 1);
    setLoading(false);
  };

  const handleThrowComplete = async (dart1: number, dart2: number, dart3: number, dartDetails?: { score: number; multiplier: number }[]) => {
    if (!match) return;

    const isPlayer1Turn = currentTurnIndex === 0;
    const currentScore = isPlayer1Turn ? match.player1_score : (match.player2_score || 0);

    // If we have detailed throw data, use it for precise validation
    let newScore = currentScore;
    let isBust = false;
    let total = 0;

    if (dartDetails && dartDetails.length > 0) {
      for (const dart of dartDetails) {
        // Skip empty throws (score 0, mult 0) unless it's a miss (score 0, mult 1/0)
        // Actually even misses count as throws but don't change score.
        // We accumulate total for stats/display but for logic we check score.

        const nextScore = newScore - dart.score;
        total += dart.score;

        if (match.checkout_type === "double_out") {
          if (nextScore === 0) {
            // Check if it was a double
            // Note: Bullseye (50) is usually multiplier 2 in our input logic
            if (dart.multiplier === 2) {
              // Valid checkout
              newScore = 0;
              // Game over for this leg, ignore subsequent darts
              break;
            } else {
              // Hit 0 but not on double -> Bust
              isBust = true;
              break;
            }
          } else if (nextScore <= 1) {
            // 1 left is Bust (cannot double out)
            // < 0 is Bust
            isBust = true;
            break;
          } else {
            newScore = nextScore;
          }
        } else {
          // Straight out
          if (nextScore === 0) {
            newScore = 0;
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
      // Fallback for bots or legacy calls without details
      // Bots generate valid throws so we assume they follow rules if they are well programmed.
      // But passing dartDetails for bots would be better.
      // Currently `generateRealisticDart` returns number.
      // We know bots respect rules in logic, so simple subtraction is okay IF we trust the bot.
      // But `handleThrowComplete` logic we saw earlier was:
      /*
        const total = dart1 + dart2 + dart3;
        let newScore = currentScore - total;
        // bust checks...
      */
      // We'll keep a simplified version for when dartDetails is missing (e.g. bots currently)

      const totalScore = dart1 + dart2 + dart3;
      newScore = currentScore - totalScore;

      if (newScore < 0) {
        isBust = true;
      } else if (match.checkout_type === "double_out" && newScore === 1) {
        isBust = true;
      }

      // We cannot verify "double out" on zero exactly without details, 
      // but bots logic includes `if (match.checkout_type === "double_out" && tempScore === 1) break;`
      // and bots aim for doubles.
      // However, if we simply subtract, we might allow a Straight Out if the input source was untrusted.
      // Since this is OfflineMatch, input is either User (via MatchThrowInput -> sends details) or Bot (trusted internal logic).
    }

    if (isBust) {
      newScore = currentScore;
      if (!isBotThinking) {
        toast.error(t("match.bust"));
      }
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

    if (isGuest || match.isLocal) {
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

    // Check if set won
    if ((isPlayer1 && newP1Legs >= match.legs_to_win) || (!isPlayer1 && newP2Legs >= match.legs_to_win)) {
      await handleSetWon(isPlayer1, newP1Legs, newP2Legs);
      return;
    }

    // Reset scores for new leg
    // BUG FIX: Alternate starting player each leg (dart rules)
    // Previous leg starter was whoever had current_turn at start of that leg
    // We alternate by giving the other player the start
    const nextLegStarter = match.current_turn === match.player1_id
      ? (match.player2_id || "player2")
      : match.player1_id;

    const updateData = {
      player1_score: match.starting_score,
      player2_score: match.starting_score,
      player1_legs: newP1Legs,
      player2_legs: newP2Legs,
      current_turn: nextLegStarter,
    };

    if (isGuest || match.isLocal) {
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
    // BUG FIX: Set correct turn index based on who starts
    setCurrentTurnIndex(nextLegStarter === match.player1_id ? 0 : 1);
  };

  const handleSetWon = async (isPlayer1: boolean, newP1Legs: number, newP2Legs: number) => {
    if (!match) return;
    const newP1Sets = isPlayer1 ? match.player1_sets + 1 : match.player1_sets;
    const newP2Sets = isPlayer1 ? match.player2_sets : match.player2_sets + 1;

    const winnerName = isPlayer1 ? match.player1_name : match.player2_name;

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

      if (isGuest || match.isLocal) {
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
    // BUG FIX: Alternate starting player for new set
    const nextSetStarter = match.current_turn === match.player1_id
      ? (match.player2_id || "player2")
      : match.player1_id;

    const updateData = {
      player1_score: match.starting_score,
      player2_score: match.starting_score,
      player1_legs: 0,
      player2_legs: 0,
      player1_sets: newP1Sets,
      player2_sets: newP2Sets,
      current_turn: nextSetStarter,
    };

    if (isGuest || match.isLocal) {
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
    // BUG FIX: Set correct turn index based on who starts
    setCurrentTurnIndex(nextSetStarter === match.player1_id ? 0 : 1);
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

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
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
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
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

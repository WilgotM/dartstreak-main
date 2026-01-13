import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LeagueStats {
  totalDays: number;
  totalScore: number;
  threeDartAverage: number; // Average per 3 darts (9 darts / 3)
  bestDay: number;
  leaguesPlayed: number;
}

export interface MatchStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  threeDartAverage: number;
  totalDartsThrown: number;
  totalPointsScored: number;
  bestThreeDartAverage: number;
}

export interface UserStats {
  leagues: LeagueStats;
  matches: MatchStats;
}

export function useStats(userId?: string) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchStats();
    }
  }, [targetUserId]);

  const fetchStats = async () => {
    if (!targetUserId) return;
    setLoading(true);

    try {
      // Fetch league stats from daily_throws
      const { data: throws } = await supabase
        .from("daily_throws")
        .select("total_score, league_id, throw_1, throw_2, throw_3, throw_4, throw_5, throw_6, throw_7, throw_8, throw_9")
        .eq("user_id", targetUserId);

      // Calculate league stats
      let leagueStats: LeagueStats = {
        totalDays: 0,
        totalScore: 0,
        threeDartAverage: 0,
        bestDay: 0,
        leaguesPlayed: 0,
      };

      if (throws && throws.length > 0) {
        const uniqueLeagues = new Set(throws.map((t) => t.league_id));
        const scores = throws.map((t) => t.total_score || 0);
        const totalScore = scores.reduce((a, b) => a + b, 0);
        
        // Each day has 9 darts = 3 sets of 3 darts
        // Three dart average = total score / (total days * 3)
        const totalThreeDartSets = throws.length * 3;
        const threeDartAverage = totalThreeDartSets > 0 ? Math.round(totalScore / totalThreeDartSets * 10) / 10 : 0;

        leagueStats = {
          totalDays: throws.length,
          totalScore,
          threeDartAverage,
          bestDay: Math.max(...scores, 0),
          leaguesPlayed: uniqueLeagues.size,
        };
      }

      // Fetch match stats from completed matches
      const { data: matchData } = await supabase
        .from("matches")
        .select("id, player1_id, player2_id, winner_id, player1_score, player2_score")
        .eq("status", "completed")
        .or(`player1_id.eq.${targetUserId},player2_id.eq.${targetUserId}`);

      // Fetch match throws for the user
      const { data: matchThrows } = await supabase
        .from("match_throws")
        .select("dart_1, dart_2, dart_3, total, match_id")
        .eq("player_id", targetUserId);

      // Calculate match stats
      let matchStats: MatchStats = {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        threeDartAverage: 0,
        totalDartsThrown: 0,
        totalPointsScored: 0,
        bestThreeDartAverage: 0,
      };

      if (matchData && matchData.length > 0) {
        const wins = matchData.filter((m) => m.winner_id === targetUserId).length;
        const losses = matchData.length - wins;
        
        // Calculate three dart average from match throws
        let totalPoints = 0;
        let totalThrows = 0;
        const matchAverages: { [matchId: string]: { points: number; throws: number } } = {};

        if (matchThrows && matchThrows.length > 0) {
          matchThrows.forEach((t) => {
            const throwTotal = t.total || (t.dart_1 + t.dart_2 + t.dart_3);
            totalPoints += throwTotal;
            totalThrows += 1;

            if (!matchAverages[t.match_id]) {
              matchAverages[t.match_id] = { points: 0, throws: 0 };
            }
            matchAverages[t.match_id].points += throwTotal;
            matchAverages[t.match_id].throws += 1;
          });
        }

        const threeDartAverage = totalThrows > 0 ? Math.round(totalPoints / totalThrows * 10) / 10 : 0;
        
        // Find best three dart average in a single match
        let bestAvg = 0;
        Object.values(matchAverages).forEach(({ points, throws }) => {
          if (throws > 0) {
            const avg = points / throws;
            if (avg > bestAvg) bestAvg = avg;
          }
        });

        matchStats = {
          totalMatches: matchData.length,
          wins,
          losses,
          winRate: matchData.length > 0 ? Math.round((wins / matchData.length) * 100) : 0,
          threeDartAverage,
          totalDartsThrown: totalThrows * 3,
          totalPointsScored: totalPoints,
          bestThreeDartAverage: Math.round(bestAvg * 10) / 10,
        };
      }

      setStats({
        leagues: leagueStats,
        matches: matchStats,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

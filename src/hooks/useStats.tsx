import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LeagueStats {
  totalDays: number;
  totalScore: number;
  threeDartAverage: number; // Average per 3 darts (9 darts / 3)
  bestDay: number;
  bestThreeDartAverage: number; // Best single-day 3-dart average
  leaguesPlayed: number;
  currentStreak: number; // Consecutive days thrown
  longestStreak: number; // Best ever streak
}

export interface UserStats {
  leagues: LeagueStats;
}

const getStatsCacheKey = (userId: string) => `dartstreak:stats:${userId}`;
const getStatsInvalidateKey = (userId: string) => `dartstreak:stats:invalidate:${userId}`;

interface CachedStatsPayload {
  cachedAt: number;
  stats: UserStats;
}

export function useStats(userId?: string) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const hasWarmDataRef = useRef(false);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    hasWarmDataRef.current = false;

    try {
      const raw = window.sessionStorage.getItem(getStatsCacheKey(targetUserId));
      if (!raw) {
        setStats(null);
        setLoading(true);
        return;
      }

      const cached = JSON.parse(raw) as CachedStatsPayload;
      const invalidatedAt = Number(window.sessionStorage.getItem(getStatsInvalidateKey(targetUserId)) || 0);

      if (!cached?.stats?.leagues || !cached.cachedAt || cached.cachedAt < invalidatedAt) {
        setStats(null);
        setLoading(true);
        return;
      }

      setStats(cached.stats);
      setLoading(false);
      hasWarmDataRef.current = true;
    } catch (error) {
      console.error("Error reading stats cache:", error);
      setStats(null);
      setLoading(true);
    }
  }, [targetUserId]);

  const fetchStats = useCallback(async () => {
    if (!targetUserId) return;
    if (!hasWarmDataRef.current) {
      setLoading(true);
    }

    try {
      // Fetch league stats from daily_throws
      const { data: throws } = await supabase
        .from("daily_throws")
        .select("total_score, league_id, throw_date, throw_1, throw_2, throw_3, throw_4, throw_5, throw_6, throw_7, throw_8, throw_9")
        .eq("user_id", targetUserId)
        .order("throw_date", { ascending: false });

      // Calculate league stats
      let leagueStats: LeagueStats = {
        totalDays: 0,
        totalScore: 0,
        threeDartAverage: 0,
        bestDay: 0,
        bestThreeDartAverage: 0,
        leaguesPlayed: 0,
        currentStreak: 0,
        longestStreak: 0,
      };

      if (throws && throws.length > 0) {
        const uniqueLeagues = new Set(throws.map((t) => t.league_id));
        const scores = throws.map((t) => t.total_score || 0);
        const totalScore = scores.reduce((a, b) => a + b, 0);

        // Each day has 9 darts = 3 sets of 3 darts
        // Three dart average = total score / (total days * 3)
        const totalThreeDartSets = throws.length * 3;
        const threeDartAverage = totalThreeDartSets > 0 ? Math.round(totalScore / totalThreeDartSets * 10) / 10 : 0;

        // Calculate best single-day 3-dart average
        let bestThreeDartAverage = 0;
        throws.forEach((t) => {
          const dayScore = t.total_score || 0;
          // Each day has 3 sets of 3 darts
          const dayAverage = dayScore / 3;
          if (dayAverage > bestThreeDartAverage) {
            bestThreeDartAverage = dayAverage;
          }
        });

        // Calculate streaks based on throw_date
        const sortedDates = throws
          .map((t) => t.throw_date)
          .filter((d): d is string => d !== null)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        // Get unique dates only
        const uniqueDates = [...new Set(sortedDates)];

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // Check current streak (starting from today/yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (uniqueDates.length > 0) {
          const lastThrowDate = new Date(uniqueDates[0]);
          lastThrowDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor((today.getTime() - lastThrowDate.getTime()) / (1000 * 60 * 60 * 24));

          // Only count streak if last throw was today or yesterday
          if (daysDiff <= 1) {
            currentStreak = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
              const prevDate = new Date(uniqueDates[i - 1]);
              const currDate = new Date(uniqueDates[i]);
              prevDate.setHours(0, 0, 0, 0);
              currDate.setHours(0, 0, 0, 0);

              const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diff === 1) {
                currentStreak++;
              } else {
                break;
              }
            }
          }

          // Calculate longest streak ever
          tempStreak = 1;
          longestStreak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            prevDate.setHours(0, 0, 0, 0);
            currDate.setHours(0, 0, 0, 0);

            const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
              tempStreak++;
              if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
              }
            } else {
              tempStreak = 1;
            }
          }
        }

        leagueStats = {
          totalDays: throws.length,
          totalScore,
          threeDartAverage,
          bestDay: Math.max(...scores, 0),
          bestThreeDartAverage: Math.round(bestThreeDartAverage * 10) / 10,
          leaguesPlayed: uniqueLeagues.size,
          currentStreak,
          longestStreak,
        };
      }

      const nextStats = {
        leagues: leagueStats,
      };

      setStats(nextStats);
      hasWarmDataRef.current = true;
      const payload: CachedStatsPayload = {
        cachedAt: Date.now(),
        stats: nextStats,
      };
      window.sessionStorage.setItem(getStatsCacheKey(targetUserId), JSON.stringify(payload));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

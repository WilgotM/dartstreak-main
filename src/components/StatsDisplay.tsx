import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Trophy, TrendingUp, Calendar, Award, Flame } from "lucide-react";
import { useStats } from "@/hooks/useStats";

interface StatsDisplayProps {
  userId?: string;
}

export function StatsDisplay({ userId }: StatsDisplayProps) {
  const { t } = useTranslation();
  const { stats, loading } = useStats(userId);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-none bg-white/5">
              <CardContent className="pt-6 h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { leagues } = stats;

  return (
    <div className="space-y-4 p-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* 3-Dart Average */}
        <Card className="border-none bg-white/5 hover:bg-white/10 transition-colors">
          <CardContent className="pt-5 pb-4 text-center">
            <Target className="w-7 h-7 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold text-foreground">
              {leagues.threeDartAverage}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.threeDartAvg")}</p>
          </CardContent>
        </Card>

        {/* Best Day Score */}
        <Card className="border-none bg-white/5 hover:bg-white/10 transition-colors">
          <CardContent className="pt-5 pb-4 text-center">
            <Trophy className="w-7 h-7 mx-auto text-dart-gold mb-2" />
            <p className="text-2xl font-display font-bold text-foreground">
              {leagues.bestDay}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.bestDay")}</p>
          </CardContent>
        </Card>

        {/* Total Points */}
        <Card className="border-none bg-white/5 hover:bg-white/10 transition-colors">
          <CardContent className="pt-5 pb-4 text-center">
            <TrendingUp className="w-7 h-7 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold text-foreground">
              {leagues.totalScore.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.totalPoints")}</p>
          </CardContent>
        </Card>

        {/* Days Played */}
        <Card className="border-none bg-white/5 hover:bg-white/10 transition-colors">
          <CardContent className="pt-5 pb-4 text-center">
            <Calendar className="w-7 h-7 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold text-foreground">
              {leagues.totalDays}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.daysPlayed")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card className="border-none bg-white/5">
        <CardContent className="pt-4 pb-3 space-y-0">
          {/* Best 3-Dart Average (single day) */}
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-dart-gold" />
              <span className="text-sm text-muted-foreground">{t("stats.bestThreeDartAvg")}</span>
            </div>
            <span className="font-semibold text-foreground">{leagues.bestThreeDartAverage}</span>
          </div>

          {/* Leagues Played */}
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t("stats.leaguesPlayed")}</span>
            </div>
            <span className="font-semibold text-foreground">{leagues.leaguesPlayed}</span>
          </div>

          {/* Avg Per Day */}
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t("stats.avgPerDay")}</span>
            </div>
            <span className="font-semibold text-foreground">
              {leagues.totalDays > 0 ? Math.round(leagues.totalScore / leagues.totalDays) : 0}
            </span>
          </div>

          {/* Current Streak */}
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">{t("stats.currentStreak")}</span>
            </div>
            <span className="font-semibold text-foreground">
              {leagues.currentStreak} {leagues.currentStreak === 1 ? t("stats.day") : t("stats.days")}
            </span>
          </div>

          {/* Longest Streak */}
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">{t("stats.longestStreak")}</span>
            </div>
            <span className="font-semibold text-foreground">
              {leagues.longestStreak} {leagues.longestStreak === 1 ? t("stats.day") : t("stats.days")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy, Swords, TrendingUp, Calendar, Award } from "lucide-react";
import { useStats } from "@/hooks/useStats";

interface StatsDisplayProps {
  userId?: string;
  showTabs?: boolean;
}

export function StatsDisplay({ userId, showTabs = true }: StatsDisplayProps) {
  const { t } = useTranslation();
  const { stats, loading } = useStats(userId);
  const [activeTab, setActiveTab] = useState<"leagues" | "matches">("matches");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const renderLeagueStats = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold">{stats.leagues.threeDartAverage}</p>
            <p className="text-xs text-muted-foreground">{t("stats.threeDartAvg")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold">{stats.leagues.totalScore}</p>
            <p className="text-xs text-muted-foreground">{t("stats.totalPoints")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 mx-auto text-dart-gold mb-2" />
            <p className="text-2xl font-display font-bold">{stats.leagues.bestDay}</p>
            <p className="text-xs text-muted-foreground">{t("stats.bestDay")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold">{stats.leagues.totalDays}</p>
            <p className="text-xs text-muted-foreground">{t("stats.daysPlayed")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">{t("stats.leaguesPlayed")}</span>
            <span className="font-semibold">{stats.leagues.leaguesPlayed}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">{t("stats.avgPerDay")}</span>
            <span className="font-semibold">{stats.leagues.totalDays > 0 ? Math.round(stats.leagues.totalScore / stats.leagues.totalDays) : 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMatchStats = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold">{stats.matches.threeDartAverage}</p>
            <p className="text-xs text-muted-foreground">{t("stats.threeDartAvg")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Award className="w-8 h-8 mx-auto text-dart-gold mb-2" />
            <p className="text-2xl font-display font-bold">{stats.matches.winRate}%</p>
            <p className="text-xs text-muted-foreground">{t("stats.winRate")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-display font-bold">{stats.matches.wins}</p>
            <p className="text-xs text-muted-foreground">{t("stats.wins")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Swords className="w-8 h-8 mx-auto text-accent mb-2" />
            <p className="text-2xl font-display font-bold">{stats.matches.totalMatches}</p>
            <p className="text-xs text-muted-foreground">{t("stats.matchesPlayed")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">{t("stats.bestMatchAvg")}</span>
            <span className="font-semibold">{stats.matches.bestThreeDartAverage}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">{t("stats.totalDarts")}</span>
            <span className="font-semibold">{stats.matches.totalDartsThrown}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">{t("stats.losses")}</span>
            <span className="font-semibold">{stats.matches.losses}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!showTabs) {
    return activeTab === "matches" ? renderMatchStats() : renderLeagueStats();
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "leagues" | "matches")}>
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="matches" className="flex items-center gap-2">
          <Swords className="w-4 h-4" />
          {t("stats.matchStats")}
        </TabsTrigger>
        <TabsTrigger value="leagues" className="flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          {t("stats.leagueStats")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="matches">
        {renderMatchStats()}
      </TabsContent>

      <TabsContent value="leagues">
        {renderLeagueStats()}
      </TabsContent>
    </Tabs>
  );
}

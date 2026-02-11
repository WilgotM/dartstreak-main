import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, ArrowLeft, Trophy, Calendar, TrendingUp, Copy, Check, Trash2, Crown, Award, Video } from "lucide-react";
import { format, addWeeks, isWithinInterval } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import ThrowInput from "@/components/ThrowInput";
import { VideoDialog } from "@/components/VideoDialog";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AppLayout } from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";

interface League {
  id: string;
  name: string;
  invite_code: string;
  total_rounds: number;
  current_round: number;
  created_by: string;
  round_start_day: number;
  started_at: string | null;
  camera_required?: boolean | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  today_score: number;
  week_score: number;
  total_score: number;
  today_video_url: string | null;
  today_throw_date: string | null;
}

interface RoundResult {
  round_number: number;
  winner: string | null;
  winner_score: number;
  start_date: Date;
  end_date: Date;
}

interface DailyThrow {
  throw_1: number;
  throw_2: number;
  throw_3: number;
  throw_4: number;
  throw_5: number;
  throw_6: number;
  throw_7: number;
  throw_8: number;
  throw_9: number;
}

export default function League() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [league, setLeague] = useState<League | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [throws, setThrows] = useState<number[]>(Array(9).fill(0));
  const [hasThrown, setHasThrown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string | null; playerName: string; throwDate: string } | null>(null);
  const [creatorTimezone, setCreatorTimezone] = useState<string>("Europe/Stockholm");
  const [cameraRequired, setCameraRequired] = useState(true);
  const [updatingCameraRequirement, setUpdatingCameraRequirement] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [restartTotalRounds, setRestartTotalRounds] = useState(4);
  const [restartStartDate, setRestartStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [restartCameraRequired, setRestartCameraRequired] = useState(true);
  const [restartingLeague, setRestartingLeague] = useState(false);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  const getWeekdayName = (day: number) => {
    const weekdayKeys = ["weekdays.sunday", "weekdays.monday", "weekdays.tuesday", "weekdays.wednesday", "weekdays.thursday", "weekdays.friday", "weekdays.saturday"];
    return t(weekdayKeys[day % 7]);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchLeaderboard = useCallback(async (leagueData: League) => {
    // Get creator's timezone first to use for correct 'today'
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", leagueData.created_by)
      .single();

    const tz = creatorProfile?.timezone || "Europe/Stockholm";
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { data: members } = await supabase
      .from("league_members")
      .select("user_id, profiles(display_name)")
      .eq("league_id", id);

    if (!members) return;

    const { data: allThrows } = await supabase
      .from("daily_throws")
      .select("*")
      .eq("league_id", id);

    const startDate = leagueData.started_at ? new Date(leagueData.started_at) : new Date();

    const results: RoundResult[] = [];
    for (let round = 1; round <= leagueData.current_round; round++) {
      const roundStart = addWeeks(startDate, round - 1);
      const roundEnd = addWeeks(startDate, round);

      const roundThrows = allThrows?.filter((t) => {
        const throwDate = new Date(t.throw_date);
        return t.round_number === round || isWithinInterval(throwDate, { start: roundStart, end: roundEnd });
      }) || [];

      const userTotals: { [key: string]: number } = {};
      roundThrows.forEach((t) => {
        userTotals[t.user_id] = (userTotals[t.user_id] || 0) + (t.total_score || 0);
      });

      let winner: string | null = null;
      let winnerScore = 0;
      Object.entries(userTotals).forEach(([userId, score]) => {
        if (score > winnerScore) {
          winnerScore = score;
          const member = members.find((m) => m.user_id === userId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          winner = (member?.profiles as any)?.display_name || t("common.unknown");
        }
      });

      if (round < leagueData.current_round) {
        results.push({
          round_number: round,
          winner,
          winner_score: winnerScore,
          start_date: roundStart,
          end_date: roundEnd,
        });
      }
    }
    setRoundResults(results);

    const leaderboardData: LeaderboardEntry[] = members.map((member) => {
      const userThrows = allThrows?.filter((t) => t.user_id === member.user_id) || [];
      const todayThrow = userThrows.find((t) => t.throw_date === today);

      const currentRoundThrows = userThrows.filter((t) => t.round_number === leagueData.current_round);

      return {
        user_id: member.user_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        display_name: (member.profiles as any)?.display_name || t("common.unknown"),
        today_score: todayThrow?.total_score || 0,
        week_score: currentRoundThrows.reduce((sum, t) => sum + (t.total_score || 0), 0),
        total_score: userThrows.reduce((sum, t) => sum + (t.total_score || 0), 0),
        today_video_url: todayThrow?.video_url || null,
        today_throw_date: todayThrow?.throw_date || null,
      };
    });

    leaderboardData.sort((a, b) => b.week_score - a.week_score || b.total_score - a.total_score);
    setLeaderboard(leaderboardData);
  }, [id, t]);

  const fetchLeagueData = useCallback(async () => {
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("*")
      .eq("id", id)
      .single();

    if (leagueError) {
      toast.error(t("league.couldNotFindLeague"));
      navigate("/dashboard");
      return;
    }

    setLeague(leagueData);
    setCameraRequired(leagueData.camera_required ?? true);

    // Fetch creator's timezone
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", leagueData.created_by)
      .single();

    if (creatorProfile?.timezone) {
      setCreatorTimezone(creatorProfile.timezone);
    }

    const leagueStarted = !leagueData.started_at || new Date(leagueData.started_at) <= new Date();

    const getLeagueToday = () => {
      try {
        return new Intl.DateTimeFormat("sv-SE", {
          timeZone: creatorTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
      } catch (e) {
        return format(new Date(), "yyyy-MM-dd");
      }
    };

    if (leagueStarted) {
      const today = getLeagueToday();
      const { data: todayThrow } = await supabase
        .from("daily_throws")
        .select("*")
        .eq("league_id", id)
        .eq("user_id", user!.id)
        .eq("throw_date", today)
        .single();

      if (todayThrow) {
        setHasThrown(true);
        setThrows([
          todayThrow.throw_1,
          todayThrow.throw_2,
          todayThrow.throw_3,
          todayThrow.throw_4,
          todayThrow.throw_5,
          todayThrow.throw_6,
          todayThrow.throw_7,
          todayThrow.throw_8,
          todayThrow.throw_9,
        ]);
      }

      await fetchLeaderboard(leagueData);
    }

    setLoading(false);
  }, [creatorTimezone, fetchLeaderboard, id, navigate, t, user]);

  useEffect(() => {
    if (user && id) {
      void fetchLeagueData();
    }
  }, [user, id, fetchLeagueData]);

  const handleThrowComplete = async (completedThrows: number[], videoUrl?: string) => {
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: creatorTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const throwData: DailyThrow = {
      throw_1: completedThrows[0],
      throw_2: completedThrows[1],
      throw_3: completedThrows[2],
      throw_4: completedThrows[3],
      throw_5: completedThrows[4],
      throw_6: completedThrows[5],
      throw_7: completedThrows[6],
      throw_8: completedThrows[7],
      throw_9: completedThrows[8],
    };

    const { error } = await supabase.from("daily_throws").insert({
      league_id: id,
      user_id: user!.id,
      round_number: league?.current_round || 1,
      throw_date: today,
      video_url: videoUrl || null,
      ...throwData,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error(t("league.alreadyRegisteredToday"));
      } else {
        toast.error(t("league.couldNotFindLeague"));
      }
      setIsPlaying(false);
    } else {
      const total = completedThrows.reduce((a, b) => a + b, 0);
      toast.success(t("league.todaysScore", { score: total }));
      setThrows(completedThrows);
      setHasThrown(true);
      setIsPlaying(false);
      if (league) fetchLeaderboard(league);
    }
  };

  const handleDeleteLeague = async () => {
    if (!league) return;
    setDeleting(true);

    const { error } = await supabase.from("leagues").delete().eq("id", league.id);

    if (error) {
      toast.error(t("league.couldNotDelete"));
      setDeleting(false);
    } else {
      toast.success(t("league.leagueDeleted"));
      navigate("/dashboard");
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(league?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return "text-dart-gold";
    if (index === 1) return "text-dart-silver";
    if (index === 2) return "text-dart-bronze";
    return "text-muted-foreground";
  };

  const handleCameraRequirementChange = async (nextValue: boolean) => {
    if (!league || user?.id !== league.created_by) return;

    const previousValue = cameraRequired;
    setCameraRequired(nextValue);
    setUpdatingCameraRequirement(true);

    const { error } = await supabase
      .from("leagues")
      .update({ camera_required: nextValue })
      .eq("id", league.id);

    if (error) {
      console.error("Error updating camera requirement:", error);
      setCameraRequired(previousValue);
      toast.error(t("league.cameraRequirementUpdateError"));
    } else {
      setLeague((prev) => (prev ? { ...prev, camera_required: nextValue } : prev));
      toast.success(t("league.cameraRequirementUpdated"));
    }

    setUpdatingCameraRequirement(false);
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

  if (!league) return null;

  const totalToday = throws.reduce((a, b) => a + b, 0);
  const isOwner = user?.id === league.created_by;
  // Calculate if finished: current_round equals total_rounds AND round end time has passed
  // Simplification: if current_round > total_rounds (backend logic) OR just check rounds.
  // We'll rely on checking current date vs end date of last round.
  const startDate = league.started_at ? new Date(league.started_at) : new Date();
  const endDate = addWeeks(startDate, league.total_rounds);
  const isFinished = new Date() > endDate;
  const leagueStarted = !league.started_at || new Date(league.started_at) <= new Date();
  const hasExplicitStartDate = Boolean(league.started_at);
  const leagueStartDateText = hasExplicitStartDate
    ? format(startDate, "d MMM yyyy", { locale: dateLocale })
    : t("common.unknown");
  const leagueEndDateText = hasExplicitStartDate
    ? format(endDate, "d MMM yyyy", { locale: dateLocale })
    : t("common.unknown");

  // Find winner based on TOTAL score, not current round/week score
  const winner = leaderboard.length > 0
    ? [...leaderboard].sort((a, b) => b.total_score - a.total_score)[0]
    : null;

  const handleRestartDialogOpenChange = (open: boolean) => {
    setRestartDialogOpen(open);
    if (!open || !league) return;

    setRestartTotalRounds(Math.min(52, Math.max(1, league.total_rounds)));
    setRestartStartDate(format(new Date(), "yyyy-MM-dd"));
    setRestartCameraRequired(league.camera_required ?? true);
  };

  const handleRestartLeague = async () => {
    if (!league || !isOwner || !user) return;
    if (restartTotalRounds < 1 || restartTotalRounds > 52) {
      toast.error(t("league.invalidRounds"));
      return;
    }

    const selectedDate = new Date(restartStartDate);
    if (Number.isNaN(selectedDate.getTime())) {
      toast.error(t("league.invalidStartDate"));
      return;
    }

    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
    const startedAt = selectedDate.toISOString();
    setRestartingLeague(true);

    // 1. Create new league
    const { data: newLeague, error: createError } = await supabase
      .from("leagues")
      .insert({
        name: league.name,
        total_rounds: restartTotalRounds,
        round_start_day: dayOfWeek,
        started_at: startedAt,
        created_by: user.id,
        camera_required: restartCameraRequired,
      })
      .select()
      .single();

    if (createError) {
      setRestartingLeague(false);
      toast.error(t("dashboard.couldNotCreateLeague"));
      return;
    }

    // 2. Add current members
    const { data: currentMembers } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", league.id);

    if (currentMembers && currentMembers.length > 0) {
      const newMembers = currentMembers.map(m => ({
        league_id: newLeague.id,
        user_id: m.user_id
      }));
      await supabase.from("league_members").insert(newMembers);
    }

    setRestartingLeague(false);
    setRestartDialogOpen(false);
    toast.success(t("league.seasonCreated"));
    navigate(`/league/${newLeague.id}`);
  };

  if (isPlaying && user && !isFinished) {
    return (
      <ThrowInput
        onComplete={handleThrowComplete}
        leagueId={id!}
        userId={user.id}
        leagueTimezone={creatorTimezone}
        cameraRequired={cameraRequired}
      />
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-40 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-6 bg-background/95 md:bg-background/80 md:backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/leagues")} className="shrink-0 text-white hover:bg-white/10 rounded-full w-10 h-10">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-2xl text-white truncate drop-shadow-md">{league.name}</h1>
              <p className="text-sm text-gray-300 truncate font-medium">
                {isFinished
                  ? t("league.finished")
                  : `${t("league.round")} ${league.current_round} ${t("league.of")} ${league.total_rounds}`
                }
              </p>
              <p className="text-xs text-gray-400 font-medium">
                {t("league.startsOn")}: <span className="text-white">{leagueStartDateText}</span>
                {" \u2022 "}
                {t("league.endsOn")}: <span className="text-white">{leagueEndDateText}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Show invite code for owner only */}
              {isOwner && (
                <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5">
                  <span className="text-sm font-mono text-white">{league.invite_code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      copyInviteCode();
                      toast.success(t("league.inviteCodeCopied"));
                    }}
                    className="shrink-0 text-white hover:bg-white/10 rounded-full w-8 h-8"
                  >
                    {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 text-white hover:bg-red-500/20 hover:text-red-400 rounded-full w-10 h-10">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">{t("league.deleteConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {t("league.deleteConfirmDesc", { name: league.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteLeague}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleting ? t("league.deleting") : t("league.deleteLeague")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          {isOwner && (
            <div className="glass-card rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{t("league.settings")}</p>
                  <h3 className="text-lg font-display font-bold text-white">{t("league.cameraRequirementTitle")}</h3>
                  <p className="text-sm text-gray-400">
                    {cameraRequired ? t("league.cameraRequiredDesc") : t("league.cameraNotRequiredDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${cameraRequired ? "text-neon-green" : "text-gray-400"}`}>
                    {cameraRequired ? t("league.cameraRequiredLabel") : t("league.cameraNotRequiredLabel")}
                  </span>
                  <Switch
                    checked={cameraRequired}
                    onCheckedChange={handleCameraRequirementChange}
                    disabled={updatingCameraRequirement}
                  />
                </div>
              </div>
            </div>
          )}
          {/* League Finished View */}
          {isFinished && winner && (
            <div className="glass-card rounded-[2.5rem] p-0 overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.15)] animate-slide-up relative">
              <div className="absolute inset-0 bg-gradient-to-b from-dart-gold/10 to-transparent pointer-events-none" />

              <div className="relative z-10 p-8 sm:p-12 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-dart-gold to-yellow-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                  <Trophy className="w-12 h-12 text-black fill-current" />
                </div>

                <h2 className="text-sm font-bold uppercase tracking-widest text-dart-gold mb-2">
                  {t("league.winner")}
                </h2>
                <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
                  {winner.display_name}
                </h1>
                <p className="text-lg text-gray-300 mb-8 max-w-lg mx-auto">
                  {t("league.congratulations", {
                    name: winner.display_name,
                    league: league.name
                  })}
                </p>

                <div className="inline-block px-8 py-4 bg-black/30 backdrop-blur-md rounded-2xl border border-dart-gold/20">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("league.finalScore")}</p>
                  <p className="text-3xl font-mono font-bold text-dart-gold">{winner.total_score}</p>
                </div>

                {isOwner && (
                  <div className="mt-10">
                    <Dialog open={restartDialogOpen} onOpenChange={handleRestartDialogOpenChange}>
                      <DialogTrigger asChild>
                        <Button className="bg-dart-gold text-black hover:bg-dart-gold/90 font-bold px-8 py-6 rounded-full text-lg shadow-lg">
                          <Crown className="w-5 h-5 mr-2" />
                          {t("league.startNewSeason")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card border-white/10 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-white">{t("league.restartConfirmTitle")}</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            {t("league.restartConfirmDesc")}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="restart-rounds" className="text-gray-300">{t("dashboard.numberOfRounds")}</Label>
                            <Input
                              id="restart-rounds"
                              type="number"
                              min={1}
                              max={52}
                              value={restartTotalRounds}
                              onChange={(e) => {
                                const parsedValue = Number.parseInt(e.target.value, 10);
                                setRestartTotalRounds(Number.isNaN(parsedValue) ? 1 : parsedValue);
                              }}
                              className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-dart-gold/50"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="restart-start-date" className="text-gray-300">{t("dashboard.leagueStarts")}</Label>
                            <Input
                              id="restart-start-date"
                              type="date"
                              value={restartStartDate}
                              onChange={(e) => setRestartStartDate(e.target.value)}
                              min={format(new Date(), "yyyy-MM-dd")}
                              className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-dart-gold/50"
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="space-y-1">
                              <Label className="text-gray-300">{t("dashboard.cameraRequirement")}</Label>
                              <p className="text-xs text-gray-500">{t("dashboard.cameraRequirementDesc")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {restartCameraRequired ? t("dashboard.cameraRequired") : t("dashboard.cameraNotRequired")}
                              </span>
                              <Switch
                                checked={restartCameraRequired}
                                onCheckedChange={setRestartCameraRequired}
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setRestartDialogOpen(false)}
                            className="bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white"
                            disabled={restartingLeague}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            onClick={handleRestartLeague}
                            className="bg-dart-gold text-black hover:bg-dart-gold/90"
                            disabled={restartingLeague}
                          >
                            {restartingLeague ? t("common.loading") : t("league.startNewSeason")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* League not started notice */}
          {!leagueStarted && !isFinished && league.started_at && (
            <div className="glass-card rounded-2xl p-8 text-center animate-slide-up border-neon-green/30 bg-neon-green/5">
              <Calendar className="w-12 h-12 mx-auto text-neon-green mb-4" />
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                {t("league.leagueNotStarted")}
              </h2>
              <p className="text-gray-400">
                {t("league.firstRoundStarts")}{" "}
                <span className="font-semibold text-neon-green">
                  {format(new Date(league.started_at), "EEEE d MMMM", { locale: dateLocale })}
                </span>
              </p>
            </div>
          )}

          {/* Today's throws */}
          {leagueStarted && !isFinished && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 animate-slide-up bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-neon-green" />
                  </div>
                  <div>
                    <p className="text-xs text-neon-green font-bold uppercase tracking-wider">{t("league.today")}</p>
                    <h2 className="text-xl font-display font-bold text-white">
                      {format(new Date(), "EEEE d MMMM", { locale: dateLocale })}
                    </h2>
                  </div>
                </div>
                <CountdownTimer timezone={creatorTimezone} />
              </div>

              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  <span>{t("league.cameraRequirementTitle")}</span>
                  <span className={cameraRequired ? "text-neon-green" : "text-gray-300"}>
                    {cameraRequired ? t("league.cameraRequiredLabel") : t("league.cameraNotRequiredLabel")}
                  </span>
                </div>
                {hasThrown ? (
                  <div className="text-center py-2">
                    <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider">{t("league.todaysPoints")}</p>
                    <p className="text-6xl font-display font-bold text-neon-green drop-shadow-[0_0_15px_rgba(72,255,160,0.3)]">{totalToday}</p>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-6">
                    <p className="text-gray-300 text-lg">
                      {t("league.notRegisteredToday")}
                    </p>
                    <Button
                      onClick={() => setIsPlaying(true)}
                      className="bg-neon-green text-black hover:bg-neon-green/90 font-bold px-8 py-6 rounded-full text-lg shadow-[0_0_20px_rgba(72,255,160,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                      <Target className="w-6 h-6 mr-2" />
                      {t("league.startTodaysThrows")}
                    </Button>
                    <p className="text-xs text-gray-500">
                      {t("league.fiveMinuteWarning")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Previous round results */}
          {roundResults.length > 0 && (
            <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "50ms" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-dart-gold/20 flex items-center justify-center">
                  <Award className="w-4 h-4 text-dart-gold" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">{t("league.previousRounds")}</h3>
              </div>

              <div className="space-y-3">
                {roundResults.map((result) => (
                  <div
                    key={result.round_number}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    <div>
                      <p className="font-display font-bold text-white">
                        {t("league.round")} {result.round_number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(result.start_date, "d MMM", { locale: dateLocale })} –{" "}
                        {format(result.end_date, "d MMM", { locale: dateLocale })}
                      </p>
                    </div>
                    {result.winner ? (
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Crown className="w-4 h-4 text-dart-gold" />
                          <span className="font-semibold text-white">{result.winner}</span>
                        </div>
                        <p className="text-sm text-gray-400 font-mono">{result.winner_score} p</p>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">{t("league.noThrows")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leagueStarted && (
            <div className="glass-card rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="p-6 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white">
                      {isFinished ? t("league.finalScore") : t("league.standings")}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-3">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">{t("league.player")}</div>
                  <div className="col-span-2 text-right hidden sm:block">{t("league.today")}</div>
                  <div className="col-span-2 text-right hidden sm:block">{t("league.week")}</div>
                  <div className="col-span-2 text-right">{t("league.total")}</div>
                </div>

                <div className="space-y-1">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-4 rounded-xl transition-all ${entry.user_id === user?.id
                        ? "bg-neon-green/10 border border-neon-green/30"
                        : "hover:bg-white/5 border border-transparent"
                        }`}
                    >
                      <div className={`col-span-1 font-display font-bold text-lg ${getMedalColor(index)}`}>
                        {index + 1}
                      </div>
                      <div className="col-span-5 flex items-center gap-2 truncate">
                        <span className={`font-semibold truncate ${entry.user_id === user?.id ? "text-neon-green" : "text-white"}`}>
                          {entry.display_name}
                        </span>
                        {entry.today_score > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVideo({
                                url: entry.today_video_url,
                                playerName: entry.display_name,
                                throwDate: entry.today_throw_date ? format(new Date(entry.today_throw_date), "d MMM", { locale: dateLocale }) : t("league.today")
                              });
                            }}
                            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <Video className={`w-3.5 h-3.5 ${entry.today_video_url ? "text-neon-green" : "opacity-30"}`} />
                          </button>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-mono text-gray-400 hidden sm:block">
                        {entry.today_score || "-"}
                      </div>
                      <div className="col-span-2 text-right font-mono text-gray-300 hidden sm:block">
                        {entry.week_score}
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-lg text-white">
                        {entry.total_score}
                      </div>
                    </div>
                  ))}

                  {leaderboard.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{t("league.noThrowsYet")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Video Dialog */}
      <VideoDialog
        videoUrl={selectedVideo?.url || null}
        playerName={selectedVideo?.playerName || ""}
        throwDate={selectedVideo?.throwDate || ""}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </AppLayout>
  );
}

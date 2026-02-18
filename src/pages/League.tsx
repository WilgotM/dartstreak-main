import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import {
  Target,
  ArrowLeft,
  Trophy,
  Calendar,
  TrendingUp,
  Copy,
  Check,
  Trash2,
  Crown,
  Award,
  Video,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { format, addWeeks, isWithinInterval } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import ThrowInput from "@/components/ThrowInput";
import { VideoDialog } from "@/components/VideoDialog";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AppLayout } from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";
import PlayerNameWithCountry from "@/components/PlayerNameWithCountry";
import { getCountryName } from "@/lib/countries";

interface League {
  id: string;
  name: string;
  invite_code: string;
  total_rounds: number;
  current_round: number;
  created_by: string | null;
  round_start_day: number;
  started_at: string | null;
  camera_required?: boolean | null;
  is_system?: boolean;
  system_scope?: "global" | "country" | null;
  country_code?: string | null;
  league_timezone?: string | null;
  season_key?: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  country_code: string | null;
  today_score: number;
  week_score: number;
  total_score: number;
  today_video_url: string | null;
  today_throw_date: string | null;
}

interface RoundResult {
  round_number: number;
  winner_name: string | null;
  winner_country_code: string | null;
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

interface SeasonHistoryItem {
  id: string;
  season_key: string | null;
  started_at: string | null;
}

const toDayKeyInTimezone = (timeZone: string) => {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const formatWithTimezone = (date: Date, timezone: string, locale: string) => {
  const localeValue = locale.startsWith("sv") ? "sv-SE" : "en-US";
  return new Intl.DateTimeFormat(localeValue, {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function League() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
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
  const [leaving, setLeaving] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string | null;
    playerName: string;
    playerCountryCode: string | null;
    throwDate: string;
  } | null>(null);
  const [leagueTimezone, setLeagueTimezone] = useState<string>("Europe/Stockholm");
  const [cameraRequired, setCameraRequired] = useState(true);
  const [updatingCameraRequirement, setUpdatingCameraRequirement] = useState(false);
  const [historyLeagues, setHistoryLeagues] = useState<SeasonHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchLeaderboard = useCallback(async (leagueData: League, timezone: string) => {
    const today = toDayKeyInTimezone(timezone);

    const { data: members } = await supabase
      .from("league_members")
      .select("user_id, profiles(display_name,country_code)")
      .eq("league_id", leagueData.id);

    if (!members) return;

    const { data: allThrows } = await supabase
      .from("daily_throws")
      .select("*")
      .eq("league_id", leagueData.id);

    const startDate = leagueData.started_at ? new Date(leagueData.started_at) : new Date();

    const results: RoundResult[] = [];
    for (let round = 1; round <= leagueData.current_round; round++) {
      const roundStart = addWeeks(startDate, round - 1);
      const roundEnd = addWeeks(startDate, round);

      const roundThrows = allThrows?.filter((item) => {
        const throwDate = new Date(item.throw_date);
        return item.round_number === round || isWithinInterval(throwDate, { start: roundStart, end: roundEnd });
      }) || [];

      const userTotals: Record<string, number> = {};
      roundThrows.forEach((item) => {
        userTotals[item.user_id] = (userTotals[item.user_id] || 0) + (item.total_score || 0);
      });

      let winnerName: string | null = null;
      let winnerCountryCode: string | null = null;
      let winnerScore = 0;
      Object.entries(userTotals).forEach(([userId, score]) => {
        if (score > winnerScore) {
          winnerScore = score;
          const member = members.find((row) => row.user_id === userId);
          const memberProfile = member?.profiles as { display_name?: string; country_code?: string | null } | null;
          winnerName = memberProfile?.display_name || t("common.unknown");
          winnerCountryCode = memberProfile?.country_code || null;
        }
      });

      if (round < leagueData.current_round) {
        results.push({
          round_number: round,
          winner_name: winnerName,
          winner_country_code: winnerCountryCode,
          winner_score: winnerScore,
          start_date: roundStart,
          end_date: roundEnd,
        });
      }
    }
    setRoundResults(results);

    const leaderboardData: LeaderboardEntry[] = members.map((member) => {
      const userThrows = allThrows?.filter((item) => item.user_id === member.user_id) || [];
      const todayThrow = userThrows.find((item) => item.throw_date === today);
      const currentRoundThrows = userThrows.filter((item) => item.round_number === leagueData.current_round);
      const memberProfile = member.profiles as { display_name?: string; country_code?: string | null } | null;

      return {
        user_id: member.user_id,
        display_name: memberProfile?.display_name || t("common.unknown"),
        country_code: memberProfile?.country_code || null,
        today_score: todayThrow?.total_score || 0,
        week_score: currentRoundThrows.reduce((sum, item) => sum + (item.total_score || 0), 0),
        total_score: userThrows.reduce((sum, item) => sum + (item.total_score || 0), 0),
        today_video_url: todayThrow?.video_url || null,
        today_throw_date: todayThrow?.throw_date || null,
      };
    });

    leaderboardData.sort((a, b) => b.week_score - a.week_score || b.total_score - a.total_score);
    setLeaderboard(leaderboardData);
  }, [t]);

  const fetchHistoryLeagues = useCallback(async (leagueData: League) => {
    if (!leagueData.is_system || !leagueData.system_scope) {
      setHistoryLeagues([]);
      setHistoryIndex(-1);
      return;
    }

    let query = supabase
      .from("leagues")
      .select("id, season_key, started_at")
      .eq("is_system", true)
      .eq("system_scope", leagueData.system_scope)
      .order("started_at", { ascending: false });

    if (leagueData.system_scope === "country") {
      query = query.eq("country_code", leagueData.country_code || "");
    }

    const { data } = await query;
    const seasons = data || [];
    setHistoryLeagues(seasons);
    setHistoryIndex(seasons.findIndex((item) => item.id === leagueData.id));
  }, []);

  const fetchLeagueData = useCallback(async () => {
    if (!id || !user) return;

    setLoading(true);
    setHasThrown(false);
    setThrows(Array(9).fill(0));

    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("*")
      .eq("id", id)
      .single();

    if (leagueError || !leagueData) {
      toast.error(t("league.couldNotFindLeague"));
      navigate("/dashboard");
      return;
    }

    setLeague(leagueData);
    setCameraRequired(leagueData.camera_required ?? true);

    let resolvedLeagueTimezone = leagueData.league_timezone || "Europe/Stockholm";

    if (!leagueData.is_system && leagueData.created_by) {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", leagueData.created_by)
        .single();

      if (creatorProfile?.timezone) {
        resolvedLeagueTimezone = creatorProfile.timezone;
      }
    }

    setLeagueTimezone(resolvedLeagueTimezone);
    await fetchHistoryLeagues(leagueData);

    const leagueStarted = !leagueData.started_at || new Date(leagueData.started_at) <= new Date();

    if (leagueStarted) {
      const today = toDayKeyInTimezone(resolvedLeagueTimezone);
      const { data: todayThrow } = await supabase
        .from("daily_throws")
        .select("*")
        .eq("league_id", leagueData.id)
        .eq("user_id", user.id)
        .eq("throw_date", today)
        .maybeSingle();

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

      await fetchLeaderboard(leagueData, resolvedLeagueTimezone);
    }

    setLoading(false);
  }, [id, user, navigate, t, fetchHistoryLeagues, fetchLeaderboard]);

  useEffect(() => {
    void fetchLeagueData();
  }, [fetchLeagueData]);

  const handleThrowComplete = async (completedThrows: number[], videoUrl?: string) => {
    const today = toDayKeyInTimezone(leagueTimezone);

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
      const total = completedThrows.reduce((sum, value) => sum + value, 0);
      toast.success(t("league.todaysScore", { score: total }));
      setThrows(completedThrows);
      setHasThrown(true);
      setIsPlaying(false);
      if (league) {
        await fetchLeaderboard(league, leagueTimezone);
      }
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

  const handleLeaveLeague = async () => {
    if (!league || !user) return;
    setLeaving(true);

    const { error } = await supabase
      .from("league_members")
      .delete()
      .eq("league_id", league.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error(t("league.couldNotLeave"));
      setLeaving(false);
    } else {
      toast.success(t("league.leagueLeft"));
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
    if (!league || user?.id !== league.created_by || league.is_system) return;

    const previousValue = cameraRequired;
    setCameraRequired(nextValue);
    setUpdatingCameraRequirement(true);

    const { error } = await supabase
      .from("leagues")
      .update({ camera_required: nextValue })
      .eq("id", league.id);

    if (error) {
      setCameraRequired(previousValue);
      toast.error(t("league.cameraRequirementUpdateError"));
    } else {
      setLeague((prev) => (prev ? { ...prev, camera_required: nextValue } : prev));
      toast.success(t("league.cameraRequirementUpdated"));
    }

    setUpdatingCameraRequirement(false);
  };

  const navigateHistory = (offset: number) => {
    const nextIndex = historyIndex + offset;
    if (nextIndex < 0 || nextIndex >= historyLeagues.length) return;
    const nextLeague = historyLeagues[nextIndex];
    navigate(`/league/${nextLeague.id}`);
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

  const totalToday = throws.reduce((sum, value) => sum + value, 0);
  const isOwner = user?.id === league.created_by;
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
  const winner = leaderboard.length > 0
    ? [...leaderboard].sort((a, b) => b.total_score - a.total_score)[0]
    : null;

  const isSystemLeague = league.is_system === true;
  const hideHistoricalVideos = isSystemLeague && isFinished;

  const localizedUserEnd = hasExplicitStartDate
    ? formatWithTimezone(
      endDate,
      profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      i18n.language
    )
    : t("common.unknown");

  const countryName = league.country_code
    ? getCountryName(league.country_code, i18n.language)
    : "";

  const leagueDisplayName = isSystemLeague
    ? league.system_scope === "global"
      ? t("league.globalLeagueTitle")
      : t("league.countryLeagueTitle", { country: countryName })
    : league.name;

  if (isPlaying && user && !isFinished) {
    return (
      <ThrowInput
        onComplete={handleThrowComplete}
        leagueId={id!}
        userId={user.id}
        leagueTimezone={leagueTimezone}
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
              <h1 className="font-display font-bold text-2xl text-white truncate drop-shadow-md">{leagueDisplayName}</h1>
              <p className="text-sm text-gray-300 truncate font-medium">
                {isFinished
                  ? t("league.finished")
                  : `${t("league.round")} ${league.current_round} ${t("league.of")} ${league.total_rounds}`
                }
              </p>
              <p className="text-xs text-gray-400 font-medium">
                {t("league.startsOn")}: <span className="text-white">{leagueStartDateText}</span>
                {" • "}
                {t("league.endsOn")}: <span className="text-white">{leagueEndDateText}</span>
              </p>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {t("league.endsAtYourTimezone")}: <span className="text-white">{localizedUserEnd}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && !isSystemLeague && (
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

              {!isSystemLeague && (isOwner ? (
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
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 text-white hover:bg-red-500/20 hover:text-red-400 rounded-full w-10 h-10">
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">{t("league.leaveConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {t("league.leaveConfirmDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLeaveLeague}
                        disabled={leaving}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {leaving ? t("league.leaving") : t("league.leave")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          {isSystemLeague && historyLeagues.length > 1 && (
            <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => navigateHistory(1)}
                disabled={historyIndex === -1 || historyIndex >= historyLeagues.length - 1}
                className="border-white/10 bg-transparent text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("league.olderWeek")}
              </Button>
              <div className="text-center text-sm text-gray-300">
                <p className="font-semibold">{league.season_key}</p>
                <p className="text-xs text-gray-400">{t("league.historyView")}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigateHistory(-1)}
                disabled={historyIndex === -1 || historyIndex <= 0}
                className="border-white/10 bg-transparent text-white hover:bg-white/10"
              >
                {t("league.newerWeek")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {isOwner && !isSystemLeague && (
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
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-4 flex justify-center">
                  <PlayerNameWithCountry
                    displayName={winner.display_name}
                    countryCode={winner.country_code}
                    flagSize="md"
                    textClassName="text-white"
                  />
                </div>
                <p className="text-lg text-gray-300 mb-8 max-w-lg mx-auto">
                  {t("league.congratulations", {
                    name: winner.display_name,
                    league: league.name,
                  })}
                </p>

                <div className="inline-block px-8 py-4 bg-black/30 backdrop-blur-md rounded-2xl border border-dart-gold/20">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("league.finalScore")}</p>
                  <p className="text-3xl font-mono font-bold text-dart-gold">{winner.total_score}</p>
                </div>

                {isOwner && !isSystemLeague && (
                  <div className="mt-10">
                    <Button
                      className="bg-dart-gold text-black hover:bg-dart-gold/90 font-bold px-8 py-6 rounded-full text-lg shadow-lg"
                      onClick={() => navigate(`/leagues/restart/${league.id}`)}
                    >
                      <Crown className="w-5 h-5 mr-2" />
                      {t("league.startNewSeason")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <CountdownTimer timezone={leagueTimezone} />
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
                    {result.winner_name ? (
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Crown className="w-4 h-4 text-dart-gold" />
                          <PlayerNameWithCountry
                            displayName={result.winner_name}
                            countryCode={result.winner_country_code}
                            textClassName="font-semibold text-white"
                          />
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

          {leagueStarted && (
            <div className="glass-card rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="p-6 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    {isSystemLeague ? <Globe className="w-5 h-5 text-blue-400" /> : <Trophy className="w-5 h-5 text-blue-400" />}
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
                        <PlayerNameWithCountry
                          displayName={entry.display_name}
                          countryCode={entry.country_code}
                          textClassName={`font-semibold ${entry.user_id === user?.id ? "text-neon-green" : "text-white"}`}
                        />
                        {!hideHistoricalVideos && entry.today_score > 0 && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedVideo({
                                url: entry.today_video_url,
                                playerName: entry.display_name,
                                playerCountryCode: entry.country_code,
                                throwDate: entry.today_throw_date
                                  ? format(new Date(entry.today_throw_date), "d MMM", { locale: dateLocale })
                                  : t("league.today"),
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

      <VideoDialog
        videoUrl={selectedVideo?.url || null}
        playerName={selectedVideo?.playerName || ""}
        playerCountryCode={selectedVideo?.playerCountryCode || null}
        throwDate={selectedVideo?.throwDate || ""}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </AppLayout>
  );
}

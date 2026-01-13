import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Target, ArrowLeft, Trophy, Calendar, TrendingUp, Copy, Check, Trash2, Crown, Award, Video, UserPlus } from "lucide-react";
import { format, addWeeks, isWithinInterval } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import ThrowInput from "@/components/ThrowInput";
import { VideoDialog } from "@/components/VideoDialog";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AppLayout } from "@/components/AppLayout";

interface League {
  id: string;
  name: string;
  invite_code: string;
  total_rounds: number;
  current_round: number;
  created_by: string;
  round_start_day: number;
  started_at: string | null;
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

  useEffect(() => {
    if (user && id) {
      fetchLeagueData();
    }
  }, [user, id]);

  const fetchLeagueData = async () => {
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

    if (leagueStarted) {
      const today = format(new Date(), "yyyy-MM-dd");
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
  };

  const fetchLeaderboard = async (leagueData: League) => {
    const today = format(new Date(), "yyyy-MM-dd");

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
  };

  const handleThrowComplete = async (completedThrows: number[], videoUrl?: string) => {
    const today = format(new Date(), "yyyy-MM-dd");

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
    toast.success(t("league.inviteCodeCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return "text-dart-gold";
    if (index === 1) return "text-dart-silver";
    if (index === 2) return "text-dart-bronze";
    return "text-muted-foreground";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <Target className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!league) return null;

  const totalToday = throws.reduce((a, b) => a + b, 0);
  const isOwner = user?.id === league.created_by;
  const leagueStarted = !league.started_at || new Date(league.started_at) <= new Date();

  if (isPlaying && user) {
    return (
      <ThrowInput 
        onComplete={handleThrowComplete} 
        leagueId={id!}
        userId={user.id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          {/* Top row: back button + title */}
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-lg truncate">{league.name}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {t("league.round")} {league.current_round} {t("league.of")} {league.total_rounds}
                <span className="mx-1">•</span>
                {t("league.newRoundEvery")} {getWeekdayName(league.round_start_day)}
              </p>
            </div>
          </div>
          {/* Bottom row: actions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button variant="outline" size="sm" onClick={copyInviteCode} className="shrink-0">
              {copied ? (
                <Check className="w-4 h-4 mr-1.5" />
              ) : (
                <Copy className="w-4 h-4 mr-1.5" />
              )}
              <span className="text-xs">{league.invite_code}</span>
            </Button>
            <InviteFriendDialog leagueId={league.id} leagueName={league.name}>
              <Button variant="default" size="sm" className="shrink-0">
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span className="text-xs">{t("friends.inviteFriend")}</span>
              </Button>
            </InviteFriendDialog>
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("league.deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("league.deleteConfirmDesc", { name: league.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteLeague}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t("league.deleting") : t("league.deleteLeague")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* League not started notice */}
          {!leagueStarted && league.started_at && (
            <Card className="border-2 border-primary/50 bg-primary/5 animate-slide-up">
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-display font-bold text-primary mb-2">
                  {t("league.leagueNotStarted")}
                </h2>
                <p className="text-muted-foreground">
                  {t("league.firstRoundStarts")}{" "}
                  <span className="font-semibold text-foreground">
                    {format(new Date(league.started_at), "EEEE d MMMM", { locale: dateLocale })}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Today's throws - only show if league has started */}
          {leagueStarted && (
            <Card className="border-2 animate-slide-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <CardTitle className="font-display">
                      {format(new Date(), "EEEE d MMMM", { locale: dateLocale })}
                    </CardTitle>
                  </div>
                  <CountdownTimer timezone={creatorTimezone} />
                </div>
              </CardHeader>
              <CardContent>
                {hasThrown ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">{t("league.todaysPoints")}</p>
                    <p className="text-4xl font-display font-bold text-primary">{totalToday}</p>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <p className="text-muted-foreground">
                      {t("league.notRegisteredToday")}
                    </p>
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={() => setIsPlaying(true)}
                      className="px-8"
                    >
                      <Target className="w-5 h-5 mr-2" />
                      {t("league.startTodaysThrows")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t("league.fiveMinuteWarning")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Previous round results */}
          {roundResults.length > 0 && (
            <Card className="border-2 animate-slide-up" style={{ animationDelay: "50ms" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-dart-gold" />
                  <CardTitle className="font-display">{t("league.previousRounds")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roundResults.map((result) => (
                    <div
                      key={result.round_number}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-display font-semibold">
                          {t("league.round")} {result.round_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(result.start_date, "d MMM", { locale: dateLocale })} –{" "}
                          {format(result.end_date, "d MMM", { locale: dateLocale })}
                        </p>
                      </div>
                      {result.winner ? (
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <div className="flex items-center gap-1">
                              <Crown className="w-4 h-4 text-dart-gold" />
                              <span className="font-semibold">{result.winner}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{result.winner_score} {i18n.language === "sv" ? "poäng" : "points"}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("league.noThrows")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard - only show if league has started */}
          {leagueStarted && (
            <Card className="border-2 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-dart-gold" />
                    <CardTitle className="font-display">{t("league.standings")} – {t("league.round")} {league.current_round}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-3 py-2">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">{t("league.player")}</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-2 text-right">{t("league.today")}</div>
                    <div className="col-span-2 text-right">{t("league.week")}</div>
                    <div className="col-span-2 text-right">{t("league.total")}</div>
                  </div>

                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg transition-colors ${
                        entry.user_id === user?.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className={`col-span-1 font-display font-bold ${getMedalColor(index)}`}>
                        {index + 1}
                      </div>
                      <div className="col-span-4 font-medium truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${entry.user_id}`);
                          }}
                          className="hover:text-primary transition-colors text-left"
                        >
                          {entry.display_name}
                        </button>
                        {entry.user_id === user?.id && (
                          <span className="text-xs text-muted-foreground ml-1">({t("league.you")})</span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {entry.today_score > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedVideo({
                              url: entry.today_video_url,
                              playerName: entry.display_name,
                              throwDate: entry.today_throw_date ? format(new Date(entry.today_throw_date), "d MMM", { locale: dateLocale }) : t("league.today")
                            })}
                          >
                            <Video className={`w-4 h-4 ${entry.today_video_url ? "text-primary" : "text-muted-foreground/50"}`} />
                          </Button>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-mono">
                        {entry.today_score || "-"}
                      </div>
                      <div className="col-span-2 text-right font-mono font-semibold">
                        {entry.week_score}
                      </div>
                      <div className="col-span-2 text-right font-mono text-muted-foreground">
                        {entry.total_score}
                      </div>
                    </div>
                  ))}

                  {leaderboard.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{t("league.noThrowsYet")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}

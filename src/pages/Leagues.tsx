import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  Trophy,
  ArrowRight,
  Calendar,
  Globe,
  Flag,
} from "lucide-react";
import {
  format,
  startOfISOWeek,
  endOfISOWeek,
  setISOWeek,
  setYear,
} from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { addDays, isAfter, isBefore } from "date-fns";
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

/** Parse "YYYY-WNN" → { year, week } */
function parseSeasonKey(
  seasonKey: string,
): { year: number; week: number } | null {
  const match = seasonKey.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
}

/** Get Mon–Sun date range string from a season key like "2025-W07" */
function getWeekRange(seasonKey: string, locale: Locale): string | null {
  const parsed = parseSeasonKey(seasonKey);
  if (!parsed) return null;
  // Build a date that falls in the correct ISO week
  const baseDate = setYear(setISOWeek(new Date(), parsed.week), parsed.year);
  const mon = startOfISOWeek(baseDate);
  const sun = endOfISOWeek(baseDate);
  const fmt = "d MMM";
  return `${format(mon, fmt, { locale })} – ${format(sun, fmt, { locale })}`;
}

export default function Leagues() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { light } = useHaptics();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  const isActiveSystemLeague = useCallback((league: League) => {
    if (!league.is_system || !league.started_at) return false;
    const start = new Date(league.started_at);
    const end = addDays(start, 7);
    const now = new Date();
    return (
      (isAfter(now, start) || now.getTime() === start.getTime()) &&
      isBefore(now, end)
    );
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const fetchLeagues = useCallback(async () => {
    if (!user) return;
    const { data: memberData, error: memberError } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", user!.id);

    if (memberError) {
      console.error("Error fetching league memberships:", memberError);
      setLoadingLeagues(false);
      return;
    }

    const leagueIds = memberData?.map((m) => m.league_id) || [];

    if (leagueIds.length === 0) {
      setLeagues([]);
      setLoadingLeagues(false);
      return;
    }

    const { data, error } = await supabase
      .from("leagues")
      .select("*")
      .in("id", leagueIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leagues:", error);
    } else {
      const visibleLeagues = (data || []).filter(
        (league) => !league.is_system || isActiveSystemLeague(league),
      );
      setLeagues(visibleLeagues);
    }
    setLoadingLeagues(false);
  }, [isActiveSystemLeague, user]);

  useEffect(() => {
    if (user) {
      void fetchLeagues();
    }
  }, [user, fetchLeagues]);

  const getLeagueStatus = (league: League) => {
    if (!league.started_at) return null;
    const leagueStartDate = new Date(league.started_at);
    const now = new Date();
    if (leagueStartDate > now) {
      return `${t("dashboard.starts")} ${format(leagueStartDate, "d MMM", { locale: dateLocale })}`;
    }
    return null;
  };

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft">
            <img
              src="/logo.png"
              alt="DartStreak Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-40 bg-card/95 md:bg-card/80 md:backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-display font-bold">{t("nav.leagues")}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24">
        <div className="flex gap-4 mb-8">
          <Button
            variant="outline"
            className="flex-1 h-12 glass-panel border-border hover:bg-secondary hover:text-foreground transition-all text-base"
            onClick={() => navigate("/leagues/join")}
          >
            <Users className="w-5 h-5 mr-2 text-primary" />
            {t("dashboard.join")}
          </Button>

          <Button
            variant="outline"
            className="flex-1 h-12 glass-panel border-border hover:bg-secondary hover:text-foreground transition-all text-base"
            onClick={() => navigate("/leagues/create")}
          >
            <Plus className="w-5 h-5 mr-2 text-accent" />
            {t("dashboard.createLeague")}
          </Button>
        </div>

        {loadingLeagues ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-6 w-1/2 bg-secondary rounded" />
                    <div className="h-4 w-1/3 bg-secondary rounded" />
                  </div>
                  <div className="w-8 h-8 bg-secondary rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : leagues.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border-border">
            <Trophy className="w-20 h-20 mx-auto text-muted-foreground/30 mb-6" />
            <h3 className="text-2xl font-display font-bold mb-3 text-foreground">
              {t("dashboard.noLeaguesYet")}
            </h3>
            <p className="text-muted-foreground text-lg">
              {t("dashboard.noLeaguesDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league, index) => {
              const status = getLeagueStatus(league);
              const isSystem = league.is_system;
              const isGlobal = league.system_scope === "global";
              const weekRange =
                isSystem && league.season_key
                  ? getWeekRange(league.season_key, dateLocale)
                  : null;
              const parsed =
                isSystem && league.season_key
                  ? parseSeasonKey(league.season_key)
                  : null;
              const weekNum = parsed?.week ?? null;

              // Clean display name for system leagues
              const countryName =
                !isGlobal && league.country_code
                  ? getCountryName(league.country_code, i18n.language)
                  : null;

              return (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="group cursor-pointer glass-card rounded-2xl hover:shadow-md transition-all duration-300 relative overflow-hidden"
                    onClick={() => {
                      light();
                      navigate(`/league/${league.id}`);
                    }}
                  >
                    {/* Accent bar */}
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${isGlobal ? "bg-accent/60" : isSystem ? "bg-primary/60" : "bg-dart-gold/60"} opacity-60 group-hover:opacity-100 transition-opacity`}
                    />

                    <div className="p-5">
                      {/* Top row: icon + title + arrow */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Icon badge */}
                          {isSystem ? (
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isGlobal ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}
                            >
                              {isGlobal ? (
                                <Globe className="w-5 h-5" />
                              ) : (
                                <Flag className="w-5 h-5" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-dart-gold/10 text-dart-gold flex items-center justify-center">
                              <Trophy className="w-5 h-5" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* League type label */}
                            {isSystem && (
                              <p
                                className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${isGlobal ? "text-accent" : "text-primary"}`}
                              >
                                {isGlobal
                                  ? t("league.globalLeagueLabel")
                                  : t("league.countryLeagueLabel", {
                                      country: "",
                                    }).replace(": ", "")}
                              </p>
                            )}

                            {/* Main title */}
                            <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                              {isSystem
                                ? isGlobal
                                  ? t("league.globalLeagueTitle")
                                  : (countryName ?? league.name)
                                : league.name}
                            </h3>

                            {/* Round info */}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t("dashboard.round")}{" "}
                              <span className="text-foreground">
                                {league.current_round}
                              </span>{" "}
                              {t("dashboard.of")} {league.total_rounds}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-all mt-0.5">
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </div>

                      {/* Bottom row: week info / invite code + status */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        {isSystem && weekNum !== null ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isGlobal ? "bg-accent/10 text-accent border border-accent/20" : "bg-primary/10 text-primary border border-primary/20"}`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>
                                {t("league.weekLabel", { week: weekNum })}
                              </span>
                            </div>
                            {weekRange && (
                              <span className="text-xs text-muted-foreground">
                                {weekRange}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-3 py-1 bg-secondary rounded-full font-mono text-xs border border-border">
                              {league.invite_code}
                            </span>
                            <span>{t("dashboard.inviteCode")}</span>
                          </div>
                        )}

                        {status && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                            <Calendar className="w-3 h-3" />
                            <span>{status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

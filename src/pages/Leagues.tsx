import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
import { AppLayout } from "@/components/AppLayout";
import { useHaptics } from "@/hooks/useHaptics";
import { addDays, isAfter, isBefore } from "date-fns";
import { getCountryName } from "@/lib/countries";
import { getDateFnsLocale } from "@/i18n/languages";

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

const LEAGUES_CACHE_KEY = "dartstreak:leagues:list";

interface CachedLeaguesPayload {
  userId: string;
  leagues: League[];
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
  const { light, medium } = useHaptics();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  const appLanguage = i18n.resolvedLanguage || i18n.language;
  const dateLocale = getDateFnsLocale(appLanguage);

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

  useEffect(() => {
    if (!user) return;

    try {
      const raw = window.sessionStorage.getItem(LEAGUES_CACHE_KEY);
      if (!raw) return;

      const cached = JSON.parse(raw) as CachedLeaguesPayload;
      if (cached.userId !== user.id || !Array.isArray(cached.leagues)) return;

      setLeagues(cached.leagues);
      setLoadingLeagues(false);
    } catch (error) {
      console.error("Error reading leagues cache:", error);
    }
  }, [user]);

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
      window.sessionStorage.setItem(
        LEAGUES_CACHE_KEY,
        JSON.stringify({ userId: user.id, leagues: [] } satisfies CachedLeaguesPayload),
      );
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
      window.sessionStorage.setItem(
        LEAGUES_CACHE_KEY,
        JSON.stringify({ userId: user.id, leagues: visibleLeagues } satisfies CachedLeaguesPayload),
      );
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
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D12]">
          <div className="animate-pulse">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-full bg-[#0D0D12] overflow-x-hidden">
        <header className="sticky top-0 z-40 px-4 pt-6 pb-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#FAF8F5] drop-shadow-[0_0_20px_rgba(250,248,245,0.15)]">
              {t("nav.leagues")}
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-2 pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Custom Action Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                type="button"
                className="group relative flex-1 overflow-hidden rounded-[1.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/80 px-4 py-4 md:py-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#22C55E]/40 hover:bg-[#1A1A24] dark-glass text-left"
                onClick={() => {
                  medium();
                  navigate("/leagues/join");
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#22C55E]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FAF8F5]/5 bg-[#0D0D12] shadow-inner transition-transform group-hover:scale-110">
                    <Users className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <span className="text-base font-bold text-[#FAF8F5] tracking-wide">
                    {t("dashboard.join")}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="group relative flex-1 overflow-hidden rounded-[1.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/80 px-4 py-4 md:py-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#FACC15]/40 hover:bg-[#1A1A24] dark-glass text-left"
                onClick={() => {
                  medium();
                  navigate("/leagues/create");
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FACC15]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FAF8F5]/5 bg-[#0D0D12] shadow-inner transition-transform group-hover:scale-110">
                    <Plus className="w-5 h-5 text-[#FACC15]" />
                  </div>
                  <span className="text-base font-bold text-[#FAF8F5] tracking-wide">
                    {t("dashboard.createLeague")}
                  </span>
                </div>
              </button>
            </div>

            {loadingLeagues ? (
              <div className="space-y-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative overflow-hidden rounded-[2rem] border border-[#FAF8F5]/5 bg-[#16161C]/40 p-6 shadow-xl backdrop-blur-md">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[#FAF8F5]/5 to-transparent" />
                    <div className="flex items-start justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="h-7 w-1/2 rounded-lg bg-[#FAF8F5]/10" />
                        <div className="h-4 w-1/3 rounded bg-[#FAF8F5]/10" />
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-[#FAF8F5]/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leagues.length === 0 ? (
              <div className="relative overflow-hidden rounded-[2.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/60 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.1),transparent_50%)] pointer-events-none" />
                <div className="relative z-10">
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-[#FAF8F5]/5 bg-[#0D0D12] shadow-inner">
                    <Trophy className="w-12 h-12 text-[#FAF8F5]/20" />
                  </div>
                  <h3 className="mb-3 text-3xl font-black text-[#FAF8F5] tracking-tight">
                    {t("dashboard.noLeaguesYet")}
                  </h3>
                  <p className="text-lg font-medium text-[#FAF8F5]/50">
                    {t("dashboard.noLeaguesDesc")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 relative">
                {leagues.map((league) => {
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

                  const countryName =
                    !isGlobal && league.country_code
                      ? getCountryName(league.country_code, appLanguage)
                      : null;

                  // Determine colors based on type
                  const colorConfig = isGlobal 
                    ? { base: "text-amber-400", bg: "bg-amber-400", borderHover: "hover:border-amber-400/40", shadow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]" }
                    : isSystem 
                      ? { base: "text-[#22C55E]", bg: "bg-[#22C55E]", borderHover: "hover:border-[#22C55E]/40", shadow: "shadow-[0_0_15px_rgba(34,197,94,0.3)]" }
                      : { base: "text-[#FAF8F5]", bg: "bg-[#FAF8F5]", borderHover: "hover:border-[#FAF8F5]/40", shadow: "shadow-[0_0_15px_rgba(250,248,245,0.2)]" };

                  return (
                    <div
                      key={league.id}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          light();
                          navigate(`/league/${league.id}`);
                        }}
                        className={`group relative w-full overflow-hidden rounded-[2rem] border border-[#FAF8F5]/10 bg-[#16161C]/70 p-6 text-left shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${colorConfig.borderHover} hover:bg-[#181824]`}
                      >
                        {/* Edge highlight line */}
                        <div className={`absolute left-0 top-0 h-full w-[3px] ${colorConfig.bg} opacity-50 shadow-[0_0_10px_currentColor] transition-all duration-300 group-hover:w-[5px] group-hover:opacity-100`} />
                        
                        {/* Inner gradient glow on hover */}
                        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-${colorConfig.bg.replace('bg-', '')}/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                        <div className="relative z-10">
                          {/* Top Row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                              {/* Icon box */}
                              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-[#FAF8F5]/10 bg-[#0D0D12] shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                                {isSystem ? (
                                  isGlobal ? (
                                    <Globe className={`h-6 w-6 ${colorConfig.base} drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]`} />
                                  ) : (
                                    <Flag className={`h-6 w-6 ${colorConfig.base} drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]`} />
                                  )
                                ) : (
                                  <Trophy className="h-6 w-6 text-[#FAF8F5]/80 group-hover:text-[#FAF8F5] transition-colors" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1 pt-0.5">
                                {/* Type Label */}
                                {isSystem && (
                                  <p className={`mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] ${colorConfig.base}`}>
                                    {isGlobal
                                      ? t("league.globalLeagueLabel")
                                      : t("league.countryLeagueLabel", { country: "" }).replace(": ", "")}
                                  </p>
                                )}

                                {/* Main Title */}
                                <h3 className="truncate text-xl font-black tracking-tight text-[#FAF8F5] transition-colors duration-300 md:text-2xl">
                                  {isSystem
                                    ? isGlobal
                                      ? t("league.globalLeagueTitle")
                                      : (countryName ?? league.name)
                                    : league.name}
                                </h3>

                                {/* Round info */}
                                <p className="mt-1 text-sm font-semibold text-[#FAF8F5]/50">
                                  {t("dashboard.round")} <span className="text-[#FAF8F5]">{league.current_round}</span> {t("dashboard.of")} <span className="text-[#FAF8F5]">{league.total_rounds}</span>
                                </p>
                              </div>
                            </div>

                            {/* Chevron container */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FAF8F5]/5 bg-[#0D0D12] opacity-80 transition-all duration-300 group-hover:border-[#FAF8F5]/20 group-hover:opacity-100 group-hover:shadow-[0_4px_15px_rgba(0,0,0,0.5)] pt-0.5">
                              <ArrowRight className={`h-5 w-5 text-[#FAF8F5]/50 transition-all duration-300 group-hover:translate-x-0.5 ${isSystem && !isGlobal ? 'group-hover:text-[#22C55E]' : isGlobal ? 'group-hover:text-amber-400' : 'group-hover:text-[#FAF8F5]'}`} />
                            </div>
                          </div>

                          {/* Bottom Row / Status / Codes */}
                          <div className="mt-6 flex items-center justify-between border-t border-[#FAF8F5]/10 pt-4">
                            {isSystem && weekNum !== null ? (
                              <div className="flex items-center gap-3">
                                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${isGlobal ? "border-amber-400/20 bg-amber-400/10 text-amber-400" : "border-[#22C55E]/20 bg-[#22C55E]/10 text-[#22C55E]"}`}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{t("league.weekLabel", { week: weekNum })}</span>
                                </div>
                                {weekRange && (
                                  <span className="text-xs font-medium text-[#FAF8F5]/40">{weekRange}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="rounded-full border border-[#FAF8F5]/10 bg-[#0D0D12] px-3.5 py-1.5 font-mono text-xs font-bold tracking-wider text-[#FAF8F5]/80 shadow-inner">
                                  {league.invite_code}
                                </span>
                                <span className="text-xs font-semibold text-[#FAF8F5]/40">{t("dashboard.inviteCode")}</span>
                              </div>
                            )}

                            {status && (
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-1.5 text-xs font-bold text-[#22C55E]">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}

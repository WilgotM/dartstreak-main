import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Users, Trophy, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
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
    return (isAfter(now, start) || now.getTime() === start.getTime()) && isBefore(now, end);
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

    const leagueIds = memberData?.map(m => m.league_id) || [];

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
      const visibleLeagues = (data || []).filter((league) => !league.is_system || isActiveSystemLeague(league));
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
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
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
            className="flex-1 h-12 glass-panel border-white/10 hover:bg-white/5 hover:text-white transition-all text-base"
            onClick={() => navigate("/leagues/join")}
          >
            <Users className="w-5 h-5 mr-2 text-neon-green" />
            {t("dashboard.join")}
          </Button>

          <Button
            variant="outline"
            className="flex-1 h-12 glass-panel border-white/10 hover:bg-white/5 hover:text-white transition-all text-base"
            onClick={() => navigate("/leagues/create")}
          >
            <Plus className="w-5 h-5 mr-2 text-neon-orange" />
            {t("dashboard.createLeague")}
          </Button>
        </div>

        {loadingLeagues ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-6 w-1/2 bg-white/10 rounded" />
                    <div className="h-4 w-1/3 bg-white/5 rounded" />
                  </div>
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : leagues.length === 0 ? (
          <div className="glass-card rounded-[2rem] p-12 text-center border-white/5">
            <Trophy className="w-20 h-20 mx-auto text-white/20 mb-6" />
            <h3 className="text-2xl font-display font-bold mb-3 text-white">{t("dashboard.noLeaguesYet")}</h3>
            <p className="text-gray-400 text-lg">
              {t("dashboard.noLeaguesDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league, index) => {
              const status = getLeagueStatus(league);
              return (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="group cursor-pointer glass-card rounded-2xl p-6 hover:shadow-glow transition-all duration-300 relative overflow-hidden"
                    onClick={() => {
                      light();
                      navigate(`/league/${league.id}`);
                    }}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-neon-green to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display font-bold text-xl text-white group-hover:text-neon-green transition-colors">
                          {league.name}
                        </h3>
                        {league.is_system && (
                          <p className="text-xs text-neon-green uppercase tracking-wider mt-1">
                            {league.system_scope === "global"
                              ? t("league.globalLeagueLabel")
                              : t("league.countryLeagueLabel", {
                                country: league.country_code ? getCountryName(league.country_code, i18n.language) : "",
                              })}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          {t("dashboard.round")} <span className="text-white">{league.current_round}</span> {t("dashboard.of")} {league.total_rounds}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-green/20 group-hover:text-neon-green transition-all">
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-neon-green" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      {!league.is_system ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-3 py-1 bg-black/30 rounded-full font-mono text-xs border border-white/5">
                            {league.invite_code}
                          </span>
                          <span>{t("dashboard.inviteCode")}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          {league.season_key}
                        </div>
                      )}
                      {status && (
                        <div className="flex items-center gap-1.5 text-xs text-neon-green font-medium bg-neon-green/10 px-2 py-1 rounded-full">
                          <Calendar className="w-3 h-3" />
                          <span>{status}</span>
                        </div>
                      )}
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

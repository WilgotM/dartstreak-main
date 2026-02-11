import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Users, Trophy, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Leagues() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { light, medium } = useHaptics();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [totalRounds, setTotalRounds] = useState(4);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [joinCode, setJoinCode] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [cameraRequired, setCameraRequired] = useState(true);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const fetchLeagues = useCallback(async () => {
    if (!user) return;
    // First get the leagues the user is a member of
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
      setLeagues(data || []);
    }
    setLoadingLeagues(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchLeagues();
    }
  }, [user, fetchLeagues]);

  const createLeague = async () => {
    if (!newLeagueName.trim()) {
      toast.error(t("dashboard.enterLeagueName"));
      return;
    }

    const startedAt = startDate ? new Date(startDate).toISOString() : null;
    const selectedDate = new Date(startDate);
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();

    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({
        name: newLeagueName,
        total_rounds: totalRounds,
        round_start_day: dayOfWeek,
        started_at: startedAt,
        created_by: user!.id,
        camera_required: cameraRequired,
      })
      .select()
      .single();

    if (leagueError) {
      toast.error(t("dashboard.couldNotCreateLeague"));
      console.error(leagueError);
      return;
    }

    await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: user!.id,
    });

    toast.success(t("dashboard.leagueCreated"));
    setNewLeagueName("");
    setTotalRounds(4);
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setCameraRequired(true);
    setCreateDialogOpen(false);
    fetchLeagues();
  };

  const joinLeague = async () => {
    if (!joinCode.trim()) {
      toast.error(t("dashboard.enterInviteCode"));
      return;
    }

    const { data: league, error: findError } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("invite_code", joinCode.toLowerCase().trim())
      .single();

    if (findError || !league) {
      toast.error(t("dashboard.couldNotFindLeague"));
      return;
    }

    const { error: joinError } = await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: user!.id,
    });

    if (joinError) {
      if (joinError.code === "23505") {
        toast.error(t("dashboard.alreadyInLeague"));
      } else {
        toast.error(t("dashboard.couldNotJoinLeague"));
      }
      return;
    }

    toast.success(t("dashboard.welcomeTo", { name: league.name }));
    setJoinCode("");
    setJoinDialogOpen(false);
    fetchLeagues();
  };

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
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-12 glass-panel border-white/10 hover:bg-white/5 hover:text-white transition-all text-base">
                <Users className="w-5 h-5 mr-2 text-neon-green" />
                {t("dashboard.join")}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">{t("dashboard.joinLeague")}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode" className="text-gray-300">{t("dashboard.inviteCode")}</Label>
                  <Input
                    id="joinCode"
                    placeholder="abc123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-neon-green/50"
                  />
                </div>
                <Button onClick={joinLeague} className="w-full bg-neon-green text-black hover:bg-neon-green/90 font-bold">
                  {t("dashboard.joinButton")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-12 glass-panel border-white/10 hover:bg-white/5 hover:text-white transition-all text-base">
                <Plus className="w-5 h-5 mr-2 text-neon-orange" />
                {t("dashboard.createLeague")}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">{t("dashboard.createNewLeague")}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t("dashboard.createLeagueDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="leagueName" className="text-gray-300">{t("dashboard.leagueName")}</Label>
                  <Input
                    id="leagueName"
                    placeholder=""
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-neon-orange/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rounds" className="text-gray-300">{t("dashboard.numberOfRounds")}</Label>
                  <Input
                    id="rounds"
                    type="number"
                    min={1}
                    max={52}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(parseInt(e.target.value) || 4)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-neon-orange/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-gray-300">{t("dashboard.leagueStarts")}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-neon-orange/50"
                  />
                  <p className="text-xs text-gray-500">
                    {t("dashboard.leagueCanStartNow")}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="space-y-1">
                    <Label className="text-gray-300">{t("dashboard.cameraRequirement")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("dashboard.cameraRequirementDesc")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {cameraRequired ? t("dashboard.cameraRequired") : t("dashboard.cameraNotRequired")}
                    </span>
                    <Switch
                      checked={cameraRequired}
                      onCheckedChange={setCameraRequired}
                    />
                  </div>
                </div>
                <Button onClick={createLeague} className="w-full bg-neon-orange text-white hover:bg-neon-orange/90 font-bold">
                  {t("dashboard.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                        <p className="text-sm text-gray-400 mt-1">
                          {t("dashboard.round")} <span className="text-white">{league.current_round}</span> {t("dashboard.of")} {league.total_rounds}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-green/20 group-hover:text-neon-green transition-all">
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-neon-green" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-3 py-1 bg-black/30 rounded-full font-mono text-xs border border-white/5">
                          {league.invite_code}
                        </span>
                        <span>{t("dashboard.inviteCode")}</span>
                      </div>
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

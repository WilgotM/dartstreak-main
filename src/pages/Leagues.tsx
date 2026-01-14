import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Plus, Users, Trophy, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";
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

export default function Leagues() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [totalRounds, setTotalRounds] = useState(4);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [joinCode, setJoinCode] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeagues();
    }
  }, [user]);

  const fetchLeagues = async () => {
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
  };

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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-display font-bold">{t("nav.leagues")}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                {t("dashboard.join")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("dashboard.joinLeague")}</DialogTitle>
                <DialogDescription>
                  {t("dashboard.enterInviteCode")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">{t("dashboard.inviteCode")}</Label>
                  <Input
                    id="joinCode"
                    placeholder="abc123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                <Button onClick={joinLeague} className="w-full" variant="hero">
                  {t("dashboard.joinButton")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                {t("dashboard.createLeague")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("dashboard.createNewLeague")}</DialogTitle>
                <DialogDescription>
                  {t("dashboard.createLeagueDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="leagueName">{t("dashboard.leagueName")}</Label>
                  <Input
                    id="leagueName"
                    placeholder=""
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rounds">{t("dashboard.numberOfRounds")}</Label>
                  <Input
                    id="rounds"
                    type="number"
                    min={1}
                    max={52}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(parseInt(e.target.value) || 4)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("dashboard.leagueStarts")}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.leagueCanStartNow")}
                  </p>
                </div>
                <Button onClick={createLeague} className="w-full" variant="hero">
                  {t("dashboard.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingLeagues ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : leagues.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-display font-semibold mb-2">{t("dashboard.noLeaguesYet")}</h3>
              <p className="text-muted-foreground mb-6">
                {t("dashboard.noLeaguesDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leagues.map((league, index) => {
              const status = getLeagueStatus(league);
              return (
                <Card
                  key={league.id}
                  className="group cursor-pointer hover:shadow-glow transition-all duration-300 border-2 hover:border-primary/50 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/league/${league.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-display text-lg group-hover:text-primary transition-colors">
                          {league.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t("dashboard.round")} {league.current_round} {t("dashboard.of")} {league.total_rounds}
                        </CardDescription>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="px-2 py-1 bg-secondary rounded-md font-mono text-xs">
                        {league.invite_code}
                      </span>
                      <span>• {t("dashboard.inviteCode")}</span>
                    </div>
                    {status && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                        <Calendar className="w-4 h-4" />
                        <span>{status}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

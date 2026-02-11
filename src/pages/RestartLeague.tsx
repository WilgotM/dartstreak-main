import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Crown } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";

interface League {
    id: string;
    name: string;
    total_rounds: number;
    created_by: string;
    camera_required?: boolean | null;
}

export default function RestartLeague() {
    const { id } = useParams();
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [league, setLeague] = useState<League | null>(null);
    const [loadingLeague, setLoadingLeague] = useState(true);
    const [totalRounds, setTotalRounds] = useState(4);
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [cameraRequired, setCameraRequired] = useState(true);
    const [restarting, setRestarting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    const fetchLeague = useCallback(async () => {
        if (!id || !user) return;

        const { data, error } = await supabase
            .from("leagues")
            .select("id, name, total_rounds, created_by, camera_required")
            .eq("id", id)
            .single();

        if (error || !data) {
            toast.error(t("league.couldNotFindLeague"));
            navigate("/leagues");
            return;
        }

        if (data.created_by !== user.id) {
            toast.error(t("common.unauthorized"));
            navigate(`/league/${id}`);
            return;
        }

        setLeague(data);
        setTotalRounds(Math.min(52, Math.max(1, data.total_rounds)));
        setCameraRequired(data.camera_required ?? true);
        setLoadingLeague(false);
    }, [id, user, navigate, t]);

    useEffect(() => {
        if (user && id) {
            void fetchLeague();
        }
    }, [user, id, fetchLeague]);

    const handleRestart = async () => {
        if (!league || !user) return;
        if (totalRounds < 1 || totalRounds > 52) {
            toast.error(t("league.invalidRounds"));
            return;
        }

        const selectedDate = new Date(startDate);
        if (Number.isNaN(selectedDate.getTime())) {
            toast.error(t("league.invalidStartDate"));
            return;
        }

        const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
        const startedAt = selectedDate.toISOString();
        setRestarting(true);

        // 1. Create new league
        const { data: newLeague, error: createError } = await supabase
            .from("leagues")
            .insert({
                name: league.name,
                total_rounds: totalRounds,
                round_start_day: dayOfWeek,
                started_at: startedAt,
                created_by: user.id,
                camera_required: cameraRequired,
            })
            .select()
            .single();

        if (createError) {
            setRestarting(false);
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
                user_id: m.user_id,
            }));
            await supabase.from("league_members").insert(newMembers);
        }

        setRestarting(false);
        toast.success(t("league.seasonCreated"));
        navigate(`/league/${newLeague.id}`);
    };

    if (loading || !user || loadingLeague) {
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

    if (!league) return null;

    return (
        <AppLayout>
            <header className="sticky top-0 z-40 bg-card/95 md:bg-card/80 md:backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/league/${id}`)}
                        className="shrink-0 text-white hover:bg-white/10 rounded-full w-10 h-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-display font-bold">{t("league.startNewSeason")}</h1>
                        <p className="text-sm text-gray-400">{league.name}</p>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 pb-24">
                <div className="max-w-lg mx-auto space-y-6">
                    <p className="text-gray-400">{t("league.restartConfirmDesc")}</p>

                    <div className="space-y-2">
                        <Label htmlFor="restart-rounds" className="text-gray-300">{t("dashboard.numberOfRounds")}</Label>
                        <Input
                            id="restart-rounds"
                            type="number"
                            min={1}
                            max={52}
                            value={totalRounds}
                            onChange={(e) => {
                                const parsedValue = Number.parseInt(e.target.value, 10);
                                setTotalRounds(Number.isNaN(parsedValue) ? 1 : parsedValue);
                            }}
                            className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-dart-gold/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="restart-start-date" className="text-gray-300">{t("dashboard.leagueStarts")}</Label>
                        <Input
                            id="restart-start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={format(new Date(), "yyyy-MM-dd")}
                            className="bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-dart-gold/50"
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="space-y-1">
                            <Label className="text-gray-300">{t("dashboard.cameraRequirement")}</Label>
                            <p className="text-xs text-gray-500">{t("dashboard.cameraRequirementDesc")}</p>
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

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/league/${id}`)}
                            className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white h-12"
                            disabled={restarting}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleRestart}
                            className="flex-1 bg-dart-gold text-black hover:bg-dart-gold/90 font-bold h-12"
                            disabled={restarting}
                        >
                            <Crown className="w-4 h-4 mr-2" />
                            {restarting ? t("common.loading") : t("league.startNewSeason")}
                        </Button>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}

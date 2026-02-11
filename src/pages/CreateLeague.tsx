import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/AppLayout";

export default function CreateLeague() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [newLeagueName, setNewLeagueName] = useState("");
    const [totalRounds, setTotalRounds] = useState(4);
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [cameraRequired, setCameraRequired] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    const createLeague = async () => {
        if (!newLeagueName.trim()) {
            toast.error(t("dashboard.enterLeagueName"));
            return;
        }

        setCreating(true);

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
            setCreating(false);
            return;
        }

        await supabase.from("league_members").insert({
            league_id: league.id,
            user_id: user!.id,
        });

        toast.success(t("dashboard.leagueCreated"));
        navigate(`/league/${league.id}`);
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
                <div className="container mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/leagues")}
                        className="shrink-0 text-white hover:bg-white/10 rounded-full w-10 h-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-display font-bold">{t("dashboard.createNewLeague")}</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 pb-24">
                <div className="max-w-lg mx-auto space-y-6">
                    <p className="text-gray-400">{t("dashboard.createLeagueDesc")}</p>

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

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
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

                    <Button
                        onClick={createLeague}
                        disabled={creating}
                        className="w-full bg-neon-orange text-white hover:bg-neon-orange/90 font-bold h-12 text-base"
                    >
                        {creating ? t("common.loading") : t("dashboard.create")}
                    </Button>
                </div>
            </main>
        </AppLayout>
    );
}

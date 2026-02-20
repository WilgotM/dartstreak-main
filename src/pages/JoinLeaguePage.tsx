import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function JoinLeaguePage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    const joinLeague = async () => {
        if (!joinCode.trim()) {
            toast.error(t("dashboard.enterInviteCode"));
            return;
        }

        setJoining(true);

        const { data: league, error: findError } = await supabase
            .from("leagues")
            .select("id, name")
            .eq("invite_code", joinCode.toLowerCase().trim())
            .single();

        if (findError || !league) {
            toast.error(t("dashboard.couldNotFindLeague"));
            setJoining(false);
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
            setJoining(false);
            return;
        }

        toast.success(t("dashboard.welcomeTo", { name: league.name }));
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
                        className="shrink-0 text-foreground hover:bg-secondary rounded-full w-10 h-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-display font-bold">{t("dashboard.joinLeague")}</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 pb-24">
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="joinCode" className="text-muted-foreground">{t("dashboard.inviteCode")}</Label>
                        <Input
                            id="joinCode"
                            placeholder="abc123"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="bg-black/20 border-border text-foreground placeholder:text-gray-600 focus:border-primary/50"
                        />
                    </div>

                    <Button
                        onClick={joinLeague}
                        disabled={joining}
                        className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-12 text-base"
                    >
                        {joining ? t("common.loading") : t("dashboard.joinButton")}
                    </Button>
                </div>
            </main>
        </AppLayout>
    );
}

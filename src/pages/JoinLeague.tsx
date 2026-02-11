import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

export default function JoinLeague() {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [joining, setJoining] = useState(false);

    const joinLeague = useCallback(async () => {
        if (!code || !user) return;

        setJoining(true);

        try {
            // Find league by invite code
            const { data: league, error: leagueError } = await supabase
                .from("leagues")
                .select("id, name")
                .eq("invite_code", code.toUpperCase())
                .single();

            if (leagueError || !league) {
                toast.error(t("dashboard.couldNotFindLeague"));
                navigate("/dashboard");
                return;
            }

            // Check if already a member
            const { data: existingMember } = await supabase
                .from("league_members")
                .select("id")
                .eq("league_id", league.id)
                .eq("user_id", user.id)
                .single();

            if (existingMember) {
                toast.info(t("dashboard.alreadyInLeague"));
                navigate(`/league/${league.id}`);
                return;
            }

            // Join the league
            const { error: joinError } = await supabase
                .from("league_members")
                .insert({
                    league_id: league.id,
                    user_id: user.id,
                });

            if (joinError) {
                toast.error(t("dashboard.couldNotJoinLeague"));
                navigate("/dashboard");
                return;
            }

            toast.success(t("dashboard.welcomeTo", { name: league.name }));
            navigate(`/league/${league.id}`);
        } catch (error) {
            console.error("Join error:", error);
            toast.error(t("dashboard.couldNotJoinLeague"));
            navigate("/dashboard");
        }
    }, [code, user, navigate, t]);

    useEffect(() => {
        if (!authLoading && !user) {
            // Store the invite code and redirect to auth
            sessionStorage.setItem("pendingLeagueCode", code || "");
            navigate("/auth");
            return;
        }

        if (user && code && !joining) {
            void joinLeague();
        }
    }, [authLoading, user, code, joining, navigate, joinLeague]);

    return (
        <AppLayout>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-neon-green mx-auto mb-4" />
                    <p className="text-white text-lg">{t("common.loading")}</p>
                </div>
            </div>
        </AppLayout>
    );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import X01Arena from "@/components/training/X01Arena";

export default function TrainingX01() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate("/auth", { replace: true }); }, [loading, navigate, user]);
  if (loading || !user) return <LoadingScreen />;
  return <X01Arena initialPlayerName={profile?.display_name ?? ""} />;
}

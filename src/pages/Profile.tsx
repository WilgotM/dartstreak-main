import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { StatsDisplay } from "@/components/StatsDisplay";
import { AppLayout } from "@/components/AppLayout";

interface ProfileData {
  id: string;
  display_name: string;
  created_at: string;
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const dateLocale = i18n.language === "sv" ? sv : enUS;
  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = useCallback(async () => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (profileError || !profileData) {
      toast.error(t("profile.notFound"));
      navigate("/dashboard");
      return;
    }

    setProfile(profileData);
    setLoading(false);
  }, [id, navigate, t]);

  useEffect(() => {
    if (user && id) {
      void fetchProfile();
    }
  }, [user, id, fetchProfile]);

  if (authLoading || loading) {
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

  if (!profile) return null;

  return (
    <AppLayout>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-xl">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">
                {t("profile.memberSince")} {format(new Date(profile.created_at), "MMMM yyyy", { locale: dateLocale })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-display font-semibold mb-4">{t("stats.statistics")}</h2>
          <StatsDisplay userId={id} />
        </div>
      </main>
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, LogOut, User } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { StatsDisplay } from "@/components/StatsDisplay";
import { ProfileSettings } from "@/components/ProfileSettings";

interface ExtendedProfile {
  id: string;
  display_name: string;
  timezone: string;
  display_name_changed_at: string | null;
  email_changed_at: string | null;
}

export default function ProfilePage() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExtendedProfile();
    }
  }, [user]);

  const fetchExtendedProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, timezone, display_name_changed_at, email_changed_at")
      .eq("id", user.id)
      .single();

    if (data) {
      setExtendedProfile(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 md:top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">{t("nav.profile")}</h1>
          <LanguageSwitch />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">{profile?.display_name || t("profile.unnamed")}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Settings */}
        {extendedProfile && (
          <ProfileSettings
            currentDisplayName={extendedProfile.display_name}
            currentEmail={user.email || ""}
            currentTimezone={extendedProfile.timezone || "Europe/Stockholm"}
            displayNameChangedAt={extendedProfile.display_name_changed_at}
            emailChangedAt={extendedProfile.email_changed_at}
            onUpdate={fetchExtendedProfile}
          />
        )}

        {/* Statistics */}
        <section>
          <h2 className="text-lg font-display font-semibold mb-4">{t("stats.statistics")}</h2>
          <StatsDisplay userId={user.id} />
        </section>

        {/* Sign Out */}
        <Button variant="outline" onClick={handleSignOut} className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          {t("auth.logout")}
        </Button>
      </main>
    </AppLayout>
  );
}

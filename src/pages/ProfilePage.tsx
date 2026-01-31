import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Clock, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { StatsDisplay } from "@/components/StatsDisplay";
import { ProfileSettings } from "@/components/ProfileSettings";
import { GuestLogoutDialog } from "@/components/GuestLogoutDialog";
import { GuestWarningBanner } from "@/components/GuestWarningBanner";
import { motion } from "framer-motion";

interface ExtendedProfile {
  id: string;
  display_name: string;
  timezone: string;
  display_name_changed_at: string | null;
  email_changed_at: string | null;
}

export default function ProfilePage() {
  const { user, profile, signOut, loading, isGuest, guestDaysRemaining } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile | null>(null);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, isGuest, loading, navigate]);

  useEffect(() => {
    if (user && !isGuest) {
      fetchExtendedProfile();
    }
  }, [user, isGuest]);

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

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: {} & { offset: { x: number; y: number } }) => {
    const SWIPE_THRESHOLD = 50;
    if (info.offset.x > SWIPE_THRESHOLD) {
      // Swipe Right -> Go to Dashboard
      navigate("/dashboard");
    }
  };

  if (loading || (!user && !isGuest)) {
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
      <motion.div
        className="min-h-screen"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <header className="border-b border-border bg-card/80 backdrop-blur-md fixed top-[calc(56px+env(safe-area-inset-top))] md:top-16 left-0 right-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-display font-bold text-foreground">{t("nav.profile")}</h1>
            <LanguageSwitch />
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6 pt-24 pb-24">
          {/* Guest Warning Banner */}
          {isGuest && <GuestWarningBanner variant="full" />}

          {/* Profile Card */}
          <Card className="glass-card border-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isGuest
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                  : "bg-primary/20 shadow-neon-green"
                  }`}>
                  {isGuest ? (
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <CardTitle className="font-display text-xl text-foreground">
                    {profile?.display_name || t("profile.unnamed")}
                  </CardTitle>
                  {isGuest ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {t("guest.daysRemaining", { days: guestDaysRemaining ?? 30 })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Guest-specific info */}
            {isGuest && (
              <CardContent className="pt-0">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    {t("guest.profileInfo")}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Settings - Only for logged in users */}
          {!isGuest && extendedProfile && (
            <div className="glass-panel rounded-xl p-1">
              <ProfileSettings
                currentDisplayName={extendedProfile.display_name}
                currentEmail={user?.email || ""}
                currentTimezone={extendedProfile.timezone || "Europe/Stockholm"}
                displayNameChangedAt={extendedProfile.display_name_changed_at}
                emailChangedAt={extendedProfile.email_changed_at}
                onUpdate={fetchExtendedProfile}
              />
            </div>
          )}

          {/* Statistics - For both guests and users, but different data source */}
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 text-foreground">{t("stats.statistics")}</h2>
            {isGuest ? (
              <Card className="text-center py-8 glass-card border-none">
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {t("guest.statsLocalOnly")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden border-none text-foreground">
                <StatsDisplay userId={user!.id} />
              </div>
            )}
          </section>

          {/* Sign Out */}
          {isGuest ? (
            <GuestLogoutDialog>
              <Button variant="outline" className="w-full glass-button border-white/10 hover:bg-white/5">
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logout")}
              </Button>
            </GuestLogoutDialog>
          ) : (
            <Button variant="outline" onClick={handleSignOut} className="w-full glass-button border-white/10 hover:bg-white/5">
              <LogOut className="w-4 h-4 mr-2" />
              {t("auth.logout")}
            </Button>
          )}
        </main>
      </motion.div>
    </AppLayout>
  );
}


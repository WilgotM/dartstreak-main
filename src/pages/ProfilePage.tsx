import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, LogOut, Mail, Shield, Trash2, User } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { StatsDisplay } from "@/components/StatsDisplay";
import { ProfileSettings } from "@/components/ProfileSettings";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const fetchExtendedProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, timezone, display_name_changed_at, email_changed_at")
      .eq("id", user.id)
      .single();

    if (data) {
      setExtendedProfile(data);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchExtendedProfile();
    }
  }, [user, fetchExtendedProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("profile.deleteAccountError"));
        setDeleting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        toast.error(t("profile.deleteAccountError"));
        setDeleting(false);
        return;
      }

      toast.success(t("profile.deleteAccountSuccess"));
      await signOut();
      navigate("/");
    } catch {
      toast.error(t("profile.deleteAccountError"));
      setDeleting(false);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: {} & { offset: { x: number; y: number } }) => {
    const SWIPE_THRESHOLD = 50;
    if (info.offset.x > SWIPE_THRESHOLD) {
      // Swipe Right -> Go to Dashboard
      navigate("/dashboard");
    }
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
      <motion.div
        className="min-h-screen"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <header className="sticky top-0 z-40 bg-card/95 md:bg-card/80 md:backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-display font-bold text-foreground">{t("nav.profile")}</h1>
            <LanguageSwitch />
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
          {/* Profile Card */}
          <Card className="glass-card border-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 shadow-neon-green">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-xl text-foreground">
                    {profile?.display_name || t("profile.unnamed")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Settings */}
          {extendedProfile && (
            <div className="glass-panel rounded-xl p-1">
              <ProfileSettings
                currentDisplayName={extendedProfile.display_name}
                currentEmail={user.email || ""}
                currentTimezone={extendedProfile.timezone || "Europe/Stockholm"}
                displayNameChangedAt={extendedProfile.display_name_changed_at}
                emailChangedAt={extendedProfile.email_changed_at}
                onUpdate={fetchExtendedProfile}
              />
            </div>
          )}

          {/* Statistics */}
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 text-foreground">{t("stats.statistics")}</h2>
            <div className="glass-card rounded-xl overflow-hidden border-none text-foreground">
              <StatsDisplay userId={user.id} />
            </div>
          </section>

          {/* Legal and Contact */}
          <section className="glass-card rounded-xl border-none p-4 space-y-3">
            <Link to="/privacy" className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-background/40 hover:bg-background/60 transition-colors">
              <span className="flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4 text-primary" />
                {t("common.privacyPolicy")}
              </span>
            </Link>
            <Link to="/terms" className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-background/40 hover:bg-background/60 transition-colors">
              <span className="flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                {t("common.termsOfService")}
              </span>
            </Link>
            <Link to="/contact" className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-background/40 hover:bg-background/60 transition-colors">
              <span className="flex items-center gap-2 text-foreground">
                <Mail className="w-4 h-4 text-primary" />
                {t("common.contact")}
              </span>
            </Link>
          </section>

          {/* Danger Zone */}
          <section className="space-y-3">
            <Button variant="outline" onClick={handleSignOut} className="w-full glass-button border-white/10 hover:bg-white/5">
              <LogOut className="w-4 h-4 mr-2" />
              {t("auth.logout")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting ? t("profile.deleting") : t("profile.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    {t("profile.deleteAccountConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    {t("profile.deleteAccountConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white border-none"
                    disabled={deleting}
                  >
                    {deleting ? t("profile.deleting") : t("profile.deleteAccount")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </main>
      </motion.div>
    </AppLayout>
  );
}

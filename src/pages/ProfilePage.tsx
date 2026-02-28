import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
import { FileText, LogOut, Mail, Shield, Trash2, User, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatsDisplay } from "@/components/StatsDisplay";
import { ProfileSettings } from "@/components/ProfileSettings";
import { toast } from "sonner";
import PlayerNameWithCountry from "@/components/PlayerNameWithCountry";

interface ExtendedProfile {
  id: string;
  display_name: string;
  timezone: string | null;
  country_code: string | null;
  country_timezone: string | null;
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
      .select("id, display_name, timezone, country_code, country_timezone, display_name_changed_at, email_changed_at")
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

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new Event("open-cookie-settings"));
  };

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D12]">
          <div className="animate-pulse">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#0D0D12] overflow-x-hidden">
        <header className="sticky top-0 z-40 px-4 pb-4 pt-6">
          <div className="mx-auto max-w-2xl px-2">
            <h1 className="text-3xl md:text-4xl font-black text-[#FAF8F5] tracking-tight drop-shadow-[0_0_15px_rgba(250,248,245,0.1)]">{t("nav.profile")}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-4 space-y-8 pb-32 max-w-2xl">
          {/* Profile Hero section */}
          <section className="group relative overflow-hidden rounded-[2.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/60 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:border-[#FAF8F5]/20 hover:bg-[#1A1A24]/80">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,197,94,0.1),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.05),transparent_50%)]" />
            <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#22C55E]/40 to-[#38BDF8]/20 blur-md opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#FAF8F5]/20 bg-[#0D0D12] shadow-2xl">
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-[#FAF8F5]/80" />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-[#FAF8F5] tracking-tight">
                  <PlayerNameWithCountry
                    displayName={extendedProfile?.display_name || profile?.display_name || t("profile.unnamed")}
                    countryCode={extendedProfile?.country_code || profile?.country_code}
                    flagSize="lg"
                  />
                </h2>
                <p className="mt-1.5 rounded-full border border-[#FAF8F5]/10 bg-[#0D0D12]/50 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-[#FAF8F5]/60">
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          {/* Settings Section */}
          <section>
            {extendedProfile && (
              <ProfileSettings
                currentDisplayName={extendedProfile.display_name}
                currentEmail={user.email || ""}
                currentTimezone={extendedProfile.timezone || "Europe/Stockholm"}
                currentCountryCode={extendedProfile.country_code || ""}
                currentCountryTimezone={extendedProfile.country_timezone || "UTC"}
                displayNameChangedAt={extendedProfile.display_name_changed_at}
                emailChangedAt={extendedProfile.email_changed_at}
                onUpdate={fetchExtendedProfile}
              />
            )}
          </section>

          {/* Statistics Display */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[#FAF8F5] px-2">{t("stats.statistics")}</h2>
            <div className="overflow-hidden rounded-[2rem] border border-[#FAF8F5]/10 bg-[#16161C]/50 shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <StatsDisplay userId={user.id} />
            </div>
          </section>

          {/* Legal and Contact */}
          <section className="grid gap-3 rounded-[2rem] border border-[#FAF8F5]/10 bg-[#16161C]/50 p-6 shadow-xl backdrop-blur-xl">
            {[
              { to: "/privacy", icon: Shield, label: t("common.privacyPolicy") },
              { to: "/terms", icon: FileText, label: t("common.termsOfService") },
              { onClick: handleOpenCookieSettings, icon: Shield, label: t("cookie.settingsButton") },
              { to: "/contact", icon: Mail, label: t("common.contact") },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isButton = "onClick" in item;
              
              const innerContent = (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D0D12] text-[#22C55E] shadow-inner border border-[#FAF8F5]/5 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-[#FAF8F5]/90 transition-colors group-hover:text-[#FAF8F5]">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#FAF8F5]/30 transition-all group-hover:text-[#FAF8F5]/80 group-hover:translate-x-1" />
                </>
              );

              const className = "group flex w-full items-center justify-between rounded-[1.25rem] border border-transparent bg-[#0D0D12]/40 px-4 py-3 transition-all duration-300 hover:border-[#FAF8F5]/10 hover:bg-[#1A1A24]/60 hover:shadow-lg";

              if (isButton) {
                return (
                 <button key={idx} type="button" onClick={item.onClick} className={className}>
                   {innerContent}
                 </button>
                );
              }

              return (
                <Link key={idx} to={item.to} className={className}>
                  {innerContent}
                </Link>
              );
            })}
          </section>

          {/* Danger Zone */}
          <section className="space-y-4 pt-4">
            <button 
              onClick={handleSignOut} 
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/80 px-4 py-5 font-bold text-[#FAF8F5]/90 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-[#FAF8F5]/30 hover:bg-[#2A2A35]"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span>{t("auth.logout")}</span>
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.5rem] border border-red-500/20 bg-red-950/20 px-4 py-5 font-bold text-red-400 shadow-[0_0_20px_rgba(248,113,113,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-300 hover:shadow-[0_0_25px_rgba(248,113,113,0.15)] disabled:opacity-50"
                  disabled={deleting}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Trash2 className="relative z-10 h-5 w-5" />
                  <span className="relative z-10">{deleting ? t("profile.deleting") : t("profile.deleteAccount")}</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] border border-red-500/20 bg-[#0D0D12]/95 p-8 text-white shadow-[0_25px_50px_rgba(220,38,38,0.2)] backdrop-blur-xl">
                <AlertDialogHeader className="mb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <Trash2 className="h-8 w-8" />
                  </div>
                  <AlertDialogTitle className="text-center text-2xl font-black tracking-tight text-[#FAF8F5]">
                    {t("profile.deleteAccountConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-base font-medium text-[#FAF8F5]/60 mt-2">
                    {t("profile.deleteAccountConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-6">
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="h-14 w-full rounded-[1.25rem] bg-red-500 hover:bg-red-600 text-[#FAF8F5] font-bold tracking-wide transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    disabled={deleting}
                  >
                    {deleting ? t("profile.deleting") : t("profile.deleteAccount")}
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-14 w-full rounded-[1.25rem] border border-[#FAF8F5]/10 bg-transparent text-[#FAF8F5]/80 hover:bg-[#FAF8F5]/10 hover:text-[#FAF8F5] transition-colors font-semibold mt-0">
                    {t("common.cancel")}
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { useFriends } from "@/hooks/useFriends";
import { FriendsSheet } from "@/components/FriendsSheet";
import { GuestWarningBanner } from "@/components/GuestWarningBanner";
import { GuestInfoModal } from "@/components/GuestInfoModal";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

export default function Dashboard() {
  const { user, profile, loading, isGuest, showGuestInfoModal, setShowGuestInfoModal } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { totalNotifications } = useFriends();
  const { light, medium } = useHaptics();

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, isGuest, loading, navigate]);

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
      <header className="border-b border-border bg-card/80 backdrop-blur-md fixed top-[calc(56px+env(safe-area-inset-top))] md:top-16 left-0 right-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DartStreak Logo" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-display font-bold text-xl">DartStreak</span>
              {profile && (
                <p className="text-sm text-muted-foreground">{t("dashboard.welcomeBack", { name: profile.display_name })}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pt-24">
        {/* Guest Warning Banner */}
        {isGuest && <GuestWarningBanner variant="full" />}

        {/* Quick Actions - Leagues only */}
        <section className="grid grid-cols-1 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:shadow-glow transition-all border-2 hover:border-primary/50"
              onClick={() => {
                medium();
                navigate("/leagues");
              }}
            >
              <CardContent className="py-8 text-center">
                <Trophy className="w-12 h-12 mx-auto text-primary mb-3" />
                <h3 className="font-display font-semibold text-lg">{t("nav.leagues")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("dashboard.competeDaily")}</p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Notifications hint */}
        {totalNotifications > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <FriendsSheet>
              <Card className="cursor-pointer hover:shadow-soft transition-all">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{t("dashboard.youHaveNotifications", { count: totalNotifications })}</p>
                    <p className="text-sm text-muted-foreground">{t("dashboard.checkProfile")}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </FriendsSheet>
          </motion.div>
        )}
      </main>

      {/* Guest Info Modal - shown on first guest login */}
      <GuestInfoModal
        open={showGuestInfoModal}
        onClose={() => setShowGuestInfoModal(false)}
      />
    </AppLayout>
  );
}

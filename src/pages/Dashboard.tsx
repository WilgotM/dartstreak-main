import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Trophy, Flame, User, Moon, ChevronRight, ChevronLeft, Target } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { motion, PanInfo } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";


export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { medium, light } = useHaptics();
  const [activeCard, setActiveCard] = useState<'leagues' | 'profile'>('leagues');
  const [smartAction, setSmartAction] = useState<{
    type: 'join' | 'play' | 'view';
    targetId?: string;
    label: string;
  }>({ type: 'view', label: 'Quick Start' });

  useEffect(() => {
    if (!user) return;

    const determineSmartAction = async () => {
      // 1. Get user's leagues
      const { data: memberData } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id);

      const leagueIds = memberData?.map(m => m.league_id) || [];

      if (leagueIds.length === 0) {
        setSmartAction({
          type: 'join',
          label: t("dashboard.joinLeague") || "Gå med i Liga"
        });
        return;
      }

      // 2. Access active leagues info to check their timezone/status
      const { data: leagues } = await supabase
        .from("leagues")
        .select("id, name, created_by")
        .in("id", leagueIds)
        .order("created_at", { ascending: false });

      if (!leagues || leagues.length === 0) {
        setSmartAction({
          type: 'join',
          label: t("dashboard.joinLeague") || "Gå med i Liga"
        });
        return;
      }

      // 3. Check for pending throws in these leagues
      // We need to check if a throw exists for 'today' for each league
      // For simplicity/performance, we'll check against user's local date first
      // A more robust solution would check creator's timezone for each league
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: throws } = await supabase
        .from("daily_throws")
        .select("league_id")
        .eq("user_id", user.id)
        .eq("throw_date", today)
        .in("league_id", leagueIds);

      const thrownLeagueIds = new Set(throws?.map(t => t.league_id) || []);

      // Find the first league where user hasn't thrown
      const pendingLeague = leagues.find(l => !thrownLeagueIds.has(l.id));

      if (pendingLeague) {
        setSmartAction({
          type: 'play',
          targetId: pendingLeague.id,
          label: t("dashboard.playDarts") || "Kasta Dagens Pilar"
        });
      } else {
        // If user has only one league, go directly to it. Otherwise go to list.
        if (leagues.length === 1) {
          setSmartAction({
            type: 'view',
            targetId: leagues[0].id,
            label: t("dashboard.viewStandings") || "Se Tabell"
          });
        } else {
          setSmartAction({
            type: 'view',
            label: t("dashboard.viewStandings") || "Se Tabell"
          });
        }
      }
    };

    determineSmartAction();
  }, [user, t]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate the correct X position to center the profile card
  // Main container padding: 24px (px-6)
  // Inner container padding: 28px (pl-7)
  // Card width: 100vw - 104px
  // Gap: 16px
  // Start pos of Profile Card: 24 + 28 + (100vw - 104) + 16 = 100vw - 36
  // Target center pos: 52px (since margin is (100vw - (100vw - 104)) / 2 = 52)
  // Required X = 52 - (100vw - 36) = 88 - 100vw
  const profileX = 88 - windowWidth;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const SWIPE_THRESHOLD = 50;
    if (info.offset.x < -SWIPE_THRESHOLD && activeCard === 'leagues') {
      light();
      setActiveCard('profile');
    } else if (info.offset.x > SWIPE_THRESHOLD && activeCard === 'profile') {
      light();
      setActiveCard('leagues');
    }
  };

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse-soft">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Player";

  return (
    <AppLayout>
      <div className="h-full relative overflow-hidden">


        <main className="container mx-auto px-6 h-full flex flex-col justify-start md:justify-center pt-8 md:pt-20 pb-24">

          {/* Welcome Section */}
          <div className="flex flex-col items-center text-center mb-8 md:mb-12 animate-fade-in gap-2">
            <div className="relative mb-4 md:mb-6">
              <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-orange-500/50 p-1 relative z-10 shadow-neon-orange">
                <Avatar className="w-full h-full">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-orange-500 text-white text-3xl font-bold">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 leading-tight">
              {t("dashboard.welcomeBack", { name: "" })}<br />
              <span className="text-white">{displayName}!</span>
            </h1>
          </div>

          {/* Desktop: Side-by-side cards */}
          <div className="hidden md:flex gap-6 justify-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => {
                medium();
                navigate("/leagues");
              }}
              className="w-72 h-72 glass-card rounded-[2.5rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-glow hover:scale-105 transition-transform duration-300"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="relative z-10">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
                  <Trophy className="w-20 h-20 text-neon-green drop-shadow-[0_0_15px_rgba(72,255,160,0.5)] transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">
                  {t("nav.leagues")}
                </h2>
                <p className="text-muted-foreground text-sm font-medium mt-2">
                  {t("dashboard.competeDaily")}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => {
                medium();
                navigate("/profile");
              }}
              className="w-72 h-72 glass-card rounded-[2.5rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center hover:scale-105 transition-transform duration-300"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="relative z-10">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <User className="w-20 h-20 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)] transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">
                  {t("nav.profile")}
                </h2>
                <p className="text-muted-foreground text-sm font-medium mt-2">
                  {t("dashboard.viewStats")}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Mobile: Swipeable carousel with peek */}
          <div className="md:hidden relative w-full overflow-visible mb-6 md:mb-8">
            <motion.div
              drag="x"
              dragConstraints={{ left: profileX, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              animate={{ x: activeCard === 'leagues' ? 0 : profileX }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              className="flex gap-4 pl-7"
            >
              {/* Leagues Card */}
              <motion.div
                onClick={() => {
                  if (activeCard === 'leagues') {
                    medium();
                    navigate("/leagues");
                  } else {
                    light();
                    setActiveCard('leagues');
                  }
                }}
                className={`flex-shrink-0 w-[calc(100vw-104px)] h-72 glass-card rounded-[2.5rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-glow transition-all duration-300 ${activeCard === 'leagues' ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
                    <Trophy className="w-20 h-20 text-neon-green drop-shadow-[0_0_15px_rgba(72,255,160,0.5)] transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white">
                    {t("nav.leagues")}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-2">
                    {t("dashboard.competeDaily")}
                  </p>
                </div>
                {activeCard === 'leagues' && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 animate-pulse">
                    <ChevronRight className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </motion.div>

              {/* Profile Card */}
              <motion.div
                onClick={() => {
                  if (activeCard === 'profile') {
                    medium();
                    navigate("/profile");
                  } else {
                    light();
                    setActiveCard('profile');
                  }
                }}
                className={`flex-shrink-0 w-[calc(100vw-104px)] h-72 glass-card rounded-[2.5rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center transition-all duration-300 ${activeCard === 'profile' ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <User className="w-20 h-20 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)] transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white">
                    {t("nav.profile")}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-2">
                    {t("dashboard.viewStats")}
                  </p>
                </div>
                {activeCard === 'profile' && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 animate-pulse">
                    <ChevronLeft className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full transition-colors ${activeCard === 'leagues' ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${activeCard === 'profile' ? 'bg-white' : 'bg-white/30'}`} />
            </div>
          </div>

          {/* Smart Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <button
              className={`group relative px-10 py-5 ${smartAction.type === 'play'
                ? 'bg-gradient-to-r from-neon-green via-emerald-500 to-neon-green shadow-[0_0_30px_rgba(72,255,160,0.5)] hover:shadow-[0_0_50px_rgba(72,255,160,0.7)] border-neon-green/30'
                : 'bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 shadow-[0_0_30px_rgba(234,88,12,0.5)] hover:shadow-[0_0_50px_rgba(234,88,12,0.7)] border-orange-400/30'
                } bg-[length:200%_auto] animate-gradient rounded-full flex items-center gap-3 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border`}
              onClick={() => {
                medium();
                if (smartAction.type === 'play' && smartAction.targetId) {
                  navigate(`/league/${smartAction.targetId}`);
                } else if (smartAction.type === 'join') {
                  // Open join dialog logic would require lifting state or navigating to leagues page with query param
                  // For now, navigating to leagues page is safest as it has the join button
                  navigate("/leagues");
                } else {
                  if (smartAction.targetId) {
                    navigate(`/league/${smartAction.targetId}`);
                  } else {
                    navigate("/leagues");
                  }
                }
              }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                {smartAction.type === 'play' ? (
                  <Target className="w-6 h-6 text-black fill-black/20 animate-pulse-soft" />
                ) : smartAction.type === 'join' ? (
                  <User className="w-6 h-6 text-white fill-white/20" />
                ) : (
                  <Flame className="w-6 h-6 text-white fill-orange-200 animate-pulse-soft" />
                )}
                <span className={`font-bold text-xl tracking-wide uppercase drop-shadow-md ${smartAction.type === 'play' ? 'text-black' : 'text-white'
                  }`}>
                  {smartAction.label}
                </span>
              </div>
            </button>
          </motion.div>

        </main>
      </div>
    </AppLayout>
  );
}

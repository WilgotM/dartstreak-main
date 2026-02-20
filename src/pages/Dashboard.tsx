import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Trophy, User, ChevronRight, ChevronLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { motion, PanInfo } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PlayerNameWithCountry from "@/components/PlayerNameWithCountry";


export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { medium, light } = useHaptics();
  const [activeCard, setActiveCard] = useState<'leagues' | 'profile'>('leagues');

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
      <div className="min-h-full relative overflow-x-hidden overflow-y-auto">
        <main className="container mx-auto px-6 min-h-full flex flex-col justify-start md:justify-center pt-6 md:pt-20 pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-24">

          {/* Welcome Section */}
          <div className="flex flex-col items-center text-center mb-6 md:mb-12 animate-fade-in gap-2">
            <div className="relative mb-4 md:mb-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-primary/50 p-1 relative z-10 shadow-sm">
                <Avatar className="w-full h-full">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">
              {t("dashboard.welcomeBack", { name: "" })}<br />
              <span className="text-foreground inline-flex items-center gap-2">
                <PlayerNameWithCountry
                  displayName={displayName}
                  countryCode={profile?.country_code}
                  flagSize="md"
                  textClassName="text-foreground"
                />
                !
              </span>
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
              className="w-72 h-72 glass-card rounded-[2rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-300"
            >
              <div className="relative z-10">
                <div className="relative mb-4">
                  <Trophy className="w-20 h-20 text-primary transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
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
              className="w-72 h-72 glass-card rounded-[2rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform duration-300"
            >
              <div className="relative z-10">
                <div className="relative mb-4">
                  <User className="w-20 h-20 text-accent transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {t("nav.profile")}
                </h2>
                <p className="text-muted-foreground text-sm font-medium mt-2">
                  {t("dashboard.viewStats")}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Mobile: Swipeable carousel with peek */}
          <div className="md:hidden relative w-full overflow-hidden mb-6 md:mb-8">
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
                className={`flex-shrink-0 w-[calc(100vw-104px)] h-64 sm:h-72 glass-card rounded-[2rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-md transition-all duration-300 ${activeCard === 'leagues' ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}
              >
                <div className="relative z-10">
                  <div className="relative mb-4">
                    <Trophy className="w-20 h-20 text-primary transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {t("nav.leagues")}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-2">
                    {t("dashboard.competeDaily")}
                  </p>
                </div>
                {activeCard === 'leagues' && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 animate-pulse">
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
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
                className={`flex-shrink-0 w-[calc(100vw-104px)] h-64 sm:h-72 glass-card rounded-[2rem] p-8 text-center cursor-pointer group flex flex-col items-center justify-center shadow-md transition-all duration-300 ${activeCard === 'profile' ? 'opacity-100 scale-100' : 'opacity-70 scale-95'}`}
              >
                <div className="relative z-10">
                  <div className="relative mb-4">
                    <User className="w-20 h-20 text-accent transform transition-transform group-hover:scale-110 duration-300 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {t("nav.profile")}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium mt-2">
                    {t("dashboard.viewStats")}
                  </p>
                </div>
                {activeCard === 'profile' && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 animate-pulse">
                    <ChevronLeft className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full transition-colors ${activeCard === 'leagues' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${activeCard === 'profile' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            </div>
          </div>



        </main>
      </div>
    </AppLayout>
  );
}

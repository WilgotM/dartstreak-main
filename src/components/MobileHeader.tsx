import { Users, Moon, Sun } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { FriendsSheet } from "@/components/FriendsSheet";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

export function MobileHeader() {
  const { totalNotifications } = useFriends();
  const { theme, setTheme } = useTheme();
  const { light } = useHaptics();

  const toggleTheme = () => {
    light();
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 md:hidden pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl border-b border-white/10" />
      <div className="relative flex items-center justify-between h-14 px-4 z-10">
        <div className="flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="DartStreak Logo"
            className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            whileTap={{ scale: 0.95 }}
          />
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            onClick={toggleTheme}
            className="relative p-2.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors w-10 h-10 flex items-center justify-center text-white"
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Sun className="w-5 h-5 opacity-0 rotate-90 scale-0 transition-all dark:opacity-100 dark:rotate-0 dark:scale-100 absolute" />
            <Moon className="w-5 h-5 opacity-100 rotate-0 scale-100 transition-all dark:opacity-0 dark:-rotate-90 dark:scale-0 absolute" />
          </motion.button>
          <FriendsSheet>
            <motion.button
              className="relative p-2.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => light()}
            >
              <Users className="w-5 h-5 text-white" />
              {totalNotifications > 0 && (
                <motion.span
                  className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-neon-orange text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5 shadow-[0_0_8px_rgba(255,100,0,0.6)]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </motion.span>
              )}
            </motion.button>
          </FriendsSheet>
        </div>
      </div>
    </nav>
  );
}

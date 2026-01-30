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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border-b border-border/50 md:hidden pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="DartStreak Logo"
            className="w-8 h-8 object-contain"
            whileTap={{ scale: 0.95 }}
          />
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            onClick={toggleTheme}
            className="relative p-2.5 rounded-full hover:bg-secondary/80 active:bg-secondary transition-colors w-10 h-10 flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Sun className="w-5 h-5 text-foreground rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="w-5 h-5 text-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
          </motion.button>
          <FriendsSheet>
            <motion.button
              className="relative p-2.5 rounded-full hover:bg-secondary/80 active:bg-secondary transition-colors"
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => light()}
            >
              <Users className="w-5 h-5 text-foreground" />
              {totalNotifications > 0 && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-semibold px-1"
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

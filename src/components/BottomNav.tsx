import { Home, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home" },
  { to: "/leagues", icon: Trophy, labelKey: "nav.leagues" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { light } = useHaptics();

  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.to));

  return (
    <nav className="shrink-0 z-50 fixed bottom-0 left-0 right-0 md:hidden px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="relative flex items-center justify-center gap-1 h-14 px-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              onClick={() => light()}
              className="flex-1"
            >
              <motion.div
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-all relative z-10",
                  isActive
                    ? "bg-neon-green/10 text-neon-green shadow-[0_0_15px_rgba(72,255,160,0.1)]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                )}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(72,255,160,0.5)]")} />
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-xs font-bold tracking-wide overflow-hidden whitespace-nowrap"
                  >
                    {t(item.labelKey)}
                  </motion.span>
                )}
              </motion.div>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}

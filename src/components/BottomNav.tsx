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
    <nav className="shrink-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-center justify-around h-16 px-2">
        {/* Animated indicator */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0 h-0.5 bg-primary rounded-full"
            initial={false}
            animate={{
              left: `calc(${(activeIndex / navItems.length) * 100}% + ${100 / navItems.length / 2}% - 12px)`,
              width: 24,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

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
                  "flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <motion.div
                  animate={isActive ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </motion.div>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}

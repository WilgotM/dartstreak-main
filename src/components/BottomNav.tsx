import { memo } from "react";
import { Home, Target, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home" },
  { to: "/leagues", icon: Trophy, labelKey: "nav.leagues" },
  { to: "/training", icon: Target, labelKey: "nav.training" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
];

export const BottomNav = memo(function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="shrink-0 z-50 fixed bottom-0 left-0 right-0 md:hidden px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="relative flex items-center justify-center gap-1 h-14 px-2 bg-zinc-900/95 rounded-full border border-white/10 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className="flex-1"
            >
              <div
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-colors duration-150 relative z-10 active:scale-95",
                  isActive
                    ? "bg-neon-green/10 text-neon-green"
                    : "text-gray-400"
                )}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="text-xs font-bold tracking-wide whitespace-nowrap">
                    {t(item.labelKey)}
                  </span>
                )}
              </div>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
});

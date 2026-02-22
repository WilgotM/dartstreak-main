import { memo } from "react";
import { Home, Target, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home", matchPrefixes: ["/dashboard"] },
  { to: "/leagues", icon: Trophy, labelKey: "nav.leagues", matchPrefixes: ["/leagues", "/league/", "/join/"] },
  { to: "/training", icon: Target, labelKey: "nav.training", matchPrefixes: ["/training"] },
  { to: "/profile", icon: User, labelKey: "nav.profile", matchPrefixes: ["/profile"] },
];

export const BottomNav = memo(function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="relative flex h-14 items-center justify-center gap-1 rounded-full border border-white/10 bg-[#0D0D12]/92 px-2 shadow-[0_16px_42px_rgba(0,0,0,0.55)] backdrop-blur-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefixes.some((prefix) =>
            location.pathname.startsWith(prefix),
          );

          return (
            <RouterNavLink key={item.to} to={item.to} className="flex-1">
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center gap-2 rounded-full px-3 py-2.5 transition-all duration-200 active:scale-95",
                  isActive
                    ? "bg-[#22C55E]/16 text-[#22C55E]"
                    : "text-[#FAF8F5]/70"
                )}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
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

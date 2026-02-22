import { Home, Target, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = [
    { to: "/dashboard", icon: Home, label: t("nav.home"), matchPrefixes: ["/dashboard"] },
    { to: "/leagues", icon: Trophy, label: t("nav.leagues"), matchPrefixes: ["/leagues", "/league/", "/join/"] },
    { to: "/training", icon: Target, label: t("nav.training"), matchPrefixes: ["/training"] },
    { to: "/profile", icon: User, label: t("nav.profile"), matchPrefixes: ["/profile"] },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 hidden md:block pt-4">
      <div className="mx-auto flex h-16 w-[min(1120px,calc(100%-2rem))] items-center justify-between rounded-[1.6rem] border border-white/10 bg-[#0D0D12]/78 px-5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img src="/logo.png" alt="DartStreak Logo" className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight text-[#FAF8F5]">
            DartStreak
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#16161C]/85 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchPrefixes.some((prefix) =>
              location.pathname.startsWith(prefix),
            );

            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-[#22C55E]/18 text-[#22C55E]"
                    : "text-[#FAF8F5]/70 hover:bg-white/5 hover:text-[#FAF8F5]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </RouterNavLink>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
          <LanguageSwitch />
        </div>
      </div>
    </nav>
  );
}

import { Home, Target, Trophy, User } from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { cn } from "@/lib/utils";

interface DesktopNavProps {
  isScrolled?: boolean;
}

export function DesktopNav({ isScrolled = false }: DesktopNavProps) {
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
      <div
        className={cn(
          "mx-auto flex h-16 w-[calc(100%_-_32px)] max-w-6xl items-center justify-between gap-4 rounded-[1.6rem] border border-white/10 bg-[#0D0D12]/78 px-5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-[opacity,transform,filter] duration-300 ease-out",
          isScrolled
            ? "pointer-events-none -translate-y-2 scale-[0.98] opacity-0 blur-[2px]"
            : "translate-y-0 scale-100 opacity-100 blur-0",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="DartStreak Logo"
            className="h-9 w-9 object-contain"
          />
          <span className="whitespace-nowrap font-display text-xl font-bold tracking-tight text-[#FAF8F5]">
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
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
                  isActive
                    ? "bg-[#22C55E]/18 text-[#22C55E]"
                    : "text-[#FAF8F5]/70 hover:bg-white/5 hover:text-[#FAF8F5]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </RouterNavLink>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
          <LanguageSwitch />
        </div>
      </div>

      <div
        className={cn(
          "absolute left-1/2 top-4 flex h-12 -translate-x-1/2 items-center gap-1 rounded-full border border-white/12 bg-[#0D0D12]/86 p-1.5 shadow-[0_16px_44px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-[opacity,transform,filter] duration-300 ease-out",
          isScrolled
            ? "translate-y-0 opacity-100 blur-0"
            : "pointer-events-none -translate-y-2 opacity-0 blur-[2px]",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefixes.some((prefix) =>
            location.pathname.startsWith(prefix),
          );

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200 hover:scale-105",
                isActive
                  ? "bg-[#22C55E]/18 text-[#22C55E] shadow-[inset_0_0_0_1px_rgba(34,197,94,0.24),0_0_18px_rgba(34,197,94,0.12)]"
                  : "text-[#FAF8F5]/62 hover:bg-white/7 hover:text-[#FAF8F5]",
              )}
            >
              <Icon className="h-4 w-4" />
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-3 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              )}
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}

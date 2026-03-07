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

  const ease = "cubic-bezier(0.4,0,0.2,1)";
  const dur = "500ms";

  return (
    <nav className="fixed inset-x-0 top-0 z-50 hidden md:block pt-4">
      <div
        className="mx-auto flex items-center justify-between border border-white/10 bg-[#0D0D12]/78 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{
          height: isScrolled ? "48px" : "64px",
          width: isScrolled ? "auto" : undefined,
          maxWidth: isScrolled ? "420px" : "1120px",
          padding: isScrolled ? "0 16px" : "0 20px",
          borderRadius: isScrolled ? "9999px" : "1.6rem",
          transition: `height ${dur} ${ease}, max-width ${dur} ${ease}, padding ${dur} ${ease}, border-radius ${dur} ${ease}`,
        }}
      >
        {/* Logo — text collapses when scrolled */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="DartStreak Logo"
            className="object-contain"
            style={{
              height: isScrolled ? "28px" : "36px",
              width: isScrolled ? "28px" : "36px",
              transition: `all ${dur} ${ease}`,
            }}
          />
          <span
            className="font-display font-bold tracking-tight text-[#FAF8F5] whitespace-nowrap overflow-hidden"
            style={{
              fontSize: isScrolled ? "0px" : "1.25rem",
              opacity: isScrolled ? 0 : 1,
              maxWidth: isScrolled ? "0px" : "120px",
              transition: `all ${dur} ${ease}`,
            }}
          >
            DartStreak
          </span>
        </div>

        {/* Nav items — labels collapse when scrolled */}
        <div
          className="flex items-center rounded-full border border-white/10 bg-[#16161C]/85"
          style={{
            padding: isScrolled ? "2px" : "4px",
            gap: isScrolled ? "2px" : "4px",
            transition: `all ${dur} ${ease}`,
          }}
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
                className={cn(
                  "flex items-center rounded-full text-sm font-semibold",
                  isActive
                    ? "bg-[#22C55E]/18 text-[#22C55E]"
                    : "text-[#FAF8F5]/70 hover:bg-white/5 hover:text-[#FAF8F5]",
                )}
                style={{
                  gap: isScrolled ? "0px" : "8px",
                  padding: isScrolled ? "6px 10px" : "8px 16px",
                  transition: `all ${dur} ${ease}`,
                }}
              >
                <Icon
                  className="shrink-0"
                  style={{
                    width: isScrolled ? "16px" : "16px",
                    height: isScrolled ? "16px" : "16px",
                  }}
                />
                <span
                  className="whitespace-nowrap overflow-hidden"
                  style={{
                    opacity: isScrolled ? 0 : 1,
                    maxWidth: isScrolled ? "0px" : "100px",
                    transition: `all ${dur} ${ease}`,
                  }}
                >
                  {item.label}
                </span>
              </RouterNavLink>
            );
          })}
        </div>

        {/* Language switch — collapses when scrolled */}
        <div
          className="flex min-w-0 justify-end overflow-hidden"
          style={{
            opacity: isScrolled ? 0 : 1,
            maxWidth: isScrolled ? "0px" : "120px",
            flex: isScrolled ? "0 0 0px" : "1 1 0%",
            pointerEvents: isScrolled ? "none" : "auto",
            transition: `all ${dur} ${ease}`,
          }}
        >
          <LanguageSwitch />
        </div>
      </div>
    </nav>
  );
}

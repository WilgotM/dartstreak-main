import { Home, Trophy, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DesktopNav() {
  const { t } = useTranslation();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-20">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md border-b border-white/10" />
      <div className="container mx-auto px-6 flex items-center justify-between relative z-10 h-full">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="DartStreak Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <span className="font-display font-bold text-xl text-white tracking-wide">DartStreak</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-sm">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-6 py-2.5 text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/5"
            activeClassName="bg-neon-green/10 text-neon-green font-bold shadow-[0_0_15px_rgba(72,255,160,0.1)]"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">{t("nav.home")}</span>
          </NavLink>

          <NavLink
            to="/leagues"
            className="flex items-center gap-2 px-6 py-2.5 text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/5"
            activeClassName="bg-neon-green/10 text-neon-green font-bold shadow-[0_0_15px_rgba(72,255,160,0.1)]"
          >
            <Trophy className="w-4 h-4" />
            <span className="text-sm">{t("nav.leagues")}</span>
          </NavLink>

          <NavLink
            to="/profile"
            className="flex items-center gap-2 px-6 py-2.5 text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/5"
            activeClassName="bg-neon-green/10 text-neon-green font-bold shadow-[0_0_15px_rgba(72,255,160,0.1)]"
          >
            <User className="w-4 h-4" />
            <span className="text-sm">{t("nav.profile")}</span>
          </NavLink>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

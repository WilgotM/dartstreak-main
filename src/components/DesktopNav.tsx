import { Home, Target, Trophy, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";

export function DesktopNav() {
  const { t } = useTranslation();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-20">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md border-b border-border" />
      <div className="container mx-auto px-6 flex items-center justify-between relative z-10 h-full">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <img src="/logo.png" alt="DartStreak Logo" className="w-10 h-10 object-contain" />
          <span className="font-display font-bold text-xl text-foreground tracking-wide">DartStreak</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 bg-card/50 p-1 rounded-full border border-border">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-6 py-2.5 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-card"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">{t("nav.home")}</span>
          </NavLink>

          <NavLink
            to="/leagues"
            className="flex items-center gap-2 px-6 py-2.5 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-card"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <Trophy className="w-4 h-4" />
            <span className="text-sm">{t("nav.leagues")}</span>
          </NavLink>

          <NavLink
            to="/training"
            className="flex items-center gap-2 px-6 py-2.5 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-card"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <Target className="w-4 h-4" />
            <span className="text-sm">{t("nav.training")}</span>
          </NavLink>

          <NavLink
            to="/profile"
            className="flex items-center gap-2 px-6 py-2.5 text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-card"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <User className="w-4 h-4" />
            <span className="text-sm">{t("nav.profile")}</span>
          </NavLink>
        </div>

        <div className="flex-1 min-w-0" />
      </div>
    </nav>
  );
}

import { Home, Trophy, Swords, User, Award, WifiOff } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { useMatch } from "@/hooks/useMatch";

export function BottomNav() {
  const { t } = useTranslation();
  const { pendingMatches } = useMatch();

  const matchNotifications = pendingMatches.length;

  return (
    <nav className="bottom-nav-fixed z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink
          to="/dashboard"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.home")}</span>
        </NavLink>

        <NavLink
          to="/matches"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors relative"
          activeClassName="text-primary"
        >
          <Swords className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.matches")}</span>
          {matchNotifications > 0 && (
            <span className="absolute top-1 right-0 w-4 h-4 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center">
              {matchNotifications}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/offline"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <WifiOff className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.offline")}</span>
        </NavLink>

        <NavLink
          to="/tournaments"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.tournaments")}</span>
        </NavLink>

        <NavLink
          to="/profile"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.profile")}</span>
        </NavLink>
      </div>
    </nav>
  );
}

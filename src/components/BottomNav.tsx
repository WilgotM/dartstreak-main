import { Home, Trophy, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const { t } = useTranslation();

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
          to="/leagues"
          className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("nav.leagues")}</span>
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

import { Home, Trophy, Swords, User, Users, Award } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { useFriends } from "@/hooks/useFriends";
import { useMatch } from "@/hooks/useMatch";
import { FriendsSheet } from "@/components/FriendsSheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
export function DesktopNav() {
  const { t } = useTranslation();
  const { totalNotifications } = useFriends();
  const { pendingMatches } = useMatch();
  
  const matchNotifications = pendingMatches.length;

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border h-16">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Swords className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">DartApp</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            activeClassName="text-primary bg-primary/10"
          >
            <Home className="w-4 h-4" />
            <span className="font-medium">{t("nav.home")}</span>
          </NavLink>

          <NavLink
            to="/leagues"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            activeClassName="text-primary bg-primary/10"
          >
            <Trophy className="w-4 h-4" />
            <span className="font-medium">{t("nav.leagues")}</span>
          </NavLink>

          <NavLink
            to="/matches"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary relative"
            activeClassName="text-primary bg-primary/10"
          >
            <Swords className="w-4 h-4" />
            <span className="font-medium">{t("nav.matches")}</span>
            {matchNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                {matchNotifications}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/tournaments"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            activeClassName="text-primary bg-primary/10"
          >
            <Award className="w-4 h-4" />
            <span className="font-medium">{t("nav.tournaments")}</span>
          </NavLink>

          <NavLink
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            activeClassName="text-primary bg-primary/10"
          >
            <User className="w-4 h-4" />
            <span className="font-medium">{t("nav.profile")}</span>
          </NavLink>
        </div>

        {/* Friends/Inbox and Theme Toggle */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <FriendsSheet>
            <Button variant="ghost" size="sm" className="relative">
              <Users className="w-4 h-4 mr-2" />
              {t("friends.title")}
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {totalNotifications}
                </span>
              )}
            </Button>
          </FriendsSheet>
        </div>
      </div>
    </nav>
  );
}

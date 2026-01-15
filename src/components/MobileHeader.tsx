import { Users, Moon, Sun } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { FriendsSheet } from "@/components/FriendsSheet";
import { useTheme } from "next-themes";

export function MobileHeader() {
  const { totalNotifications } = useFriends();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border md:hidden pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="DartStreak Logo" className="w-8 h-8 object-contain" />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors w-9 h-9 flex items-center justify-center"
          >
            <Sun className="w-5 h-5 text-foreground rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="w-5 h-5 text-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
          </button>
          <FriendsSheet>
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
              <Users className="w-5 h-5 text-foreground" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                  {totalNotifications}
                </span>
              )}
            </button>
          </FriendsSheet>
        </div>
      </div>
    </nav>
  );
}

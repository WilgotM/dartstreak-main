import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leagues from "./pages/Leagues";
import League from "./pages/League";
import Matches from "./pages/Matches";
import Match from "./pages/Match";
import OfflineMatch from "./pages/OfflineMatch";
import RemoteCamera from "./pages/RemoteCamera";
import Tournaments from "./pages/Tournaments";
import Tournament from "./pages/Tournament";
import OfflineTournament from "./pages/OfflineTournament";
import Offline from "./pages/Offline";
import ProfilePage from "./pages/ProfilePage";
import InstallGuide from "./pages/InstallGuide";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/InstallPrompt";
import Legal from "./pages/Legal";
import { IOSInstallReminder } from "@/components/iOSInstallReminder";
import { TournamentGuard } from "@/components/TournamentGuard";
import { UsernameGuard } from "@/components/UsernameGuard";

const queryClient = new QueryClient();

const App = () => {
  return (
    <div className="animate-app-enter">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <HashRouter>
                <UsernameGuard>
                  <TournamentGuard>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/leagues" element={<Leagues />} />
                      <Route path="/league/:id" element={<League />} />
                      <Route path="/matches" element={<Matches />} />
                      <Route path="/match/:id" element={<Match />} />
                      <Route path="/offline-match/:id" element={<OfflineMatch />} />
                      <Route path="/remote-camera/:matchId" element={<RemoteCamera />} />
                      <Route path="/tournaments" element={<Tournaments />} />
                      <Route path="/tournament/:id" element={<Tournament />} />
                      <Route path="/offline-tournament/:id" element={<OfflineTournament />} />
                      <Route path="/offline" element={<Offline />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/profile/:id" element={<ProfilePage />} />
                      <Route path="/install-guide" element={<InstallGuide />} />
                      <Route path="/privacy" element={<Legal />} />
                      <Route path="/terms" element={<Legal />} />
                      <Route path="/contact" element={<Legal />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TournamentGuard>
                </UsernameGuard>
                <InstallPrompt />
                <IOSInstallReminder />
              </HashRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  );
};

export default App;

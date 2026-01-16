import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingScreen } from "@/components/LoadingScreen";
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
import ProfilePage from "./pages/ProfilePage";
import InstallGuide from "./pages/InstallGuide";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallReminder } from "@/components/iOSInstallReminder";
import { TournamentGuard } from "@/components/TournamentGuard";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for a brief moment on app start
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
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
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:id" element={<ProfilePage />} />
                  <Route path="/install-guide" element={<InstallGuide />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TournamentGuard>
              <InstallPrompt />
              <IOSInstallReminder />
            </HashRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;

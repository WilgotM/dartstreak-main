import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leagues from "./pages/Leagues";
import League from "./pages/League";
import CreateLeague from "./pages/CreateLeague";
import JoinLeaguePage from "./pages/JoinLeaguePage";
import RestartLeague from "./pages/RestartLeague";
import JoinLeague from "./pages/JoinLeague";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import TrainingTicTacToe from "./pages/TrainingTicTacToe";
import TrainingHub from "./pages/TrainingHub";
import TrainingRedZone from "./pages/TrainingRedZone";
import * as Sentry from "@sentry/react";
import { trackPageView } from "@/lib/analytics";
import CookieConsent from "@/components/CookieConsent";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";

const queryClient = new QueryClient();

const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

const App = () => {
  return (
    <div className="animate-app-enter">
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ProfileCompletionGuard>
                <BrowserRouter>
                  <CookieConsent />
                  <AnalyticsRouteTracker />
                  <Sentry.ErrorBoundary fallback={<div className="flex min-h-[50vh] items-center justify-center p-4"><p className="text-muted-foreground">Something went wrong. Please reload the page.</p></div>}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/leagues" element={<Leagues />} />
                      <Route path="/leagues/create" element={<CreateLeague />} />
                      <Route path="/leagues/join" element={<JoinLeaguePage />} />
                      <Route path="/leagues/restart/:id" element={<RestartLeague />} />
                      <Route path="/league/:id" element={<League />} />
                      <Route path="/join/:code" element={<JoinLeague />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/profile/:id" element={<ProfilePage />} />
                      <Route path="/training" element={<TrainingHub />} />
                      <Route path="/training/tic-tac-toe" element={<TrainingTicTacToe />} />
                      <Route path="/training/red-zone" element={<TrainingRedZone />} />
                      <Route path="/privacy" element={<Legal />} />
                      <Route path="/terms" element={<Legal />} />
                      <Route path="/contact" element={<Legal />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Sentry.ErrorBoundary>
                </BrowserRouter>
              </ProfileCompletionGuard>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  );
};

export default App;

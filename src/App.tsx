import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import * as Sentry from "@sentry/react";
import { trackPageView } from "@/lib/analytics";
import CookieConsent from "@/components/CookieConsent";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import { LoadingScreen } from "@/components/LoadingScreen";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leagues = lazy(() => import("./pages/Leagues"));
const League = lazy(() => import("./pages/League"));
const CreateLeague = lazy(() => import("./pages/CreateLeague"));
const JoinLeaguePage = lazy(() => import("./pages/JoinLeaguePage"));
const RestartLeague = lazy(() => import("./pages/RestartLeague"));
const JoinLeague = lazy(() => import("./pages/JoinLeague"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Legal = lazy(() => import("./pages/Legal"));
const TrainingTicTacToe = lazy(() => import("./pages/TrainingTicTacToe"));
const TrainingHub = lazy(() => import("./pages/TrainingHub"));
const TrainingRedZone = lazy(() => import("./pages/TrainingRedZone"));

const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

const App = () => {
  useEffect(() => {
    if (localStorage.getItem("dartCursor") === "true") {
      document.body.classList.add("dart-cursor");
    }
  }, []);

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
                    <Suspense fallback={<LoadingScreen />}>
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
                    </Suspense>
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

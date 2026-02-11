import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import * as Sentry from "@sentry/react";

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
              <BrowserRouter>
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
                    <Route path="/privacy" element={<Legal />} />
                    <Route path="/terms" element={<Legal />} />
                    <Route path="/contact" element={<Legal />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Sentry.ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </div>
  );
};

export default App;

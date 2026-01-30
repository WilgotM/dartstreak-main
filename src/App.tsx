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
import ProfilePage from "./pages/ProfilePage";
import InstallGuide from "./pages/InstallGuide";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/InstallPrompt";
import Legal from "./pages/Legal";
import { IOSInstallReminder } from "@/components/iOSInstallReminder";
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
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/leagues" element={<Leagues />} />
                    <Route path="/league/:id" element={<League />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/:id" element={<ProfilePage />} />
                    <Route path="/install-guide" element={<InstallGuide />} />
                    <Route path="/privacy" element={<Legal />} />
                    <Route path="/terms" element={<Legal />} />
                    <Route path="/contact" element={<Legal />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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

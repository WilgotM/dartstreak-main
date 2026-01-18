import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, ArrowLeft, Check, X, AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.state?.mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);

  const { signIn, signUp, continueAsGuest, upgradeGuestAccount, resetPassword, updatePassword, isPasswordRecovery, signInWithGoogle, isGuest, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Check if this is a guest trying to upgrade their account
  const isUpgradeMode = isGuest && location.state?.mode === "signup";

  const handleGuestContinue = async () => {
    const { error } = await continueAsGuest();
    if (!error) {
      navigate("/dashboard");
    }
  };

  const authSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.passwordMinLength")),
    displayName: z.string().min(2, t("auth.nameMinLength")).optional(),
  });

  // ... (checkUsernameAvailability and logic stays same)
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", username)
      .maybeSingle();

    setCheckingUsername(false);
    setUsernameAvailable(!data && !error);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setUsernameAvailable(null);

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.resetEmailSent") || "Reset link sent to your email");
      setForgotPassword(false);
      setIsLogin(true);
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await updatePassword(password);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.passwordUpdated") || "Password updated successfully");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin
        ? { email, password }
        : { email, password, displayName };

      authSchema.parse(validationData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setLoading(false);
        return;
      }
    }

    if (!isLogin && usernameAvailable === false) {
      toast.error(t("auth.usernameTaken"));
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t("auth.wrongCredentials"));
        } else {
          toast.error(t("auth.loginError"));
        }
      } else {
        navigate("/dashboard");
      }
    } else if (isUpgradeMode) {
      // Upgrade guest account - link email/password to anonymous user
      const { error } = await upgradeGuestAccount(email, password, displayName);
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          toast.error(t("auth.emailAlreadyRegistered"));
        } else if (error.message.includes("duplicate key") || error.message.includes("profiles_display_name_unique")) {
          toast.error(t("auth.usernameTaken"));
        } else {
          toast.error(error.message || t("auth.signupError"));
        }
      } else {
        toast.success(t("auth.accountUpgraded") || t("auth.accountCreated"));
        navigate("/dashboard");
      }
    } else {
      // Create new account
      const { error } = await signUp(email, password, displayName);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t("auth.emailAlreadyRegistered"));
        } else if (error.message.includes("duplicate key") || error.message.includes("profiles_display_name_unique")) {
          toast.error(t("auth.usernameTaken"));
        } else {
          toast.error(t("auth.signupError"));
        }
      } else {
        // If successful, user is created.
        // If email confirmation is disabled (PER USER REQUEST), session is active immediately.
        // If enabled, they get email.
        // We will assume they disabled it or will.
        toast.success(t("auth.accountCreated"));
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleGoogleLoginClick = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message === "User cancelled login" || error.message === "Popup closed") {
          // ignore
        } else {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error(t("auth.loginError"));
    }
  };

  // View: Update Password (from Recovery Link)
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <Card className="shadow-card border-2">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto mb-4">
                <img src="/logo.png" alt="DartStreak Logo" className="w-20 h-20 object-contain mx-auto" />
              </div>
              <CardTitle className="text-2xl font-display">
                {t("auth.updatePassword") || "Update Password"}
              </CardTitle>
              <CardDescription>
                {t("auth.enterNewPassword") || "Enter your new password below."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.newPassword") || "New Password"}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.updatePassword") || "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // View: Forgot Password
  if (forgotPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <Button variant="ghost" className="mb-6" onClick={() => setForgotPassword(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          <Card className="shadow-card border-2">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto mb-4">
                <img src="/logo.png" alt="DartStreak Logo" className="w-20 h-20 object-contain mx-auto" />
              </div>
              <CardTitle className="text-2xl font-display">
                {t("auth.forgotPassword") || "Reset Password"}
              </CardTitle>
              <CardDescription>
                {t("auth.forgotPasswordDesc") || "Enter your email to receive a reset link."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.sendResetLink") || "Send Reset Link"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // View: Login / Signup
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("common.back")}
        </Button>

        <Card className="shadow-card border-2">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-4">
              <img src="/logo.png" alt="DartStreak Logo" className="w-20 h-20 object-contain mx-auto" />
            </div>
            <CardTitle className="text-2xl font-display">
              {isLogin ? t("auth.login") : t("auth.signup")}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? t("auth.welcomeBack")
                : t("auth.joinCompetition")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t("auth.displayName")}</Label>
                  <div className="relative">
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t("auth.yourName")}
                      value={displayName}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      required={!isLogin}
                      className={usernameAvailable === false ? "border-destructive" : usernameAvailable === true ? "border-primary" : ""}
                    />
                    {displayName.length >= 2 && !checkingUsername && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameAvailable === true && <Check className="w-4 h-4 text-primary" />}
                        {usernameAvailable === false && <X className="w-4 h-4 text-destructive" />}
                      </div>
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-xs text-destructive">{t("auth.usernameTaken")}</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-xs text-primary">{t("auth.usernameAvailable")}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {t("auth.forgotPassword") || "Forgot password?"}
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? t("common.loading") : isLogin ? t("auth.login") : t("auth.signup")}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                {isLogin
                  ? t("auth.noAccount")
                  : t("auth.hasAccount")}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t("common.or") || "Or"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-2 h-12 relative"
                  onClick={handleGoogleLoginClick}
                >
                  <GoogleIcon className="w-5 h-5 absolute left-4" />
                  {t("auth.continueWithGoogle") || "Continue with Google"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-2 text-muted-foreground"
                  onClick={handleGuestContinue}
                >
                  {t("auth.continueAsGuest")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground space-y-2">
          <p>
            {t("auth.byContinuing") || "By continuing, you agree to our"}{" "}
            <Link to="/terms" className="underline hover:text-primary transition-colors">
              {t("common.termsOfService")}
            </Link>{" "}
            {t("common.and") || "and"}{" "}
            <Link to="/privacy" className="underline hover:text-primary transition-colors">
              {t("common.privacyPolicy")}
            </Link>
            .
          </p>
        </div>


      </div>
    </div>
  );
}

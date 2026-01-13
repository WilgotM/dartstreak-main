import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Target, ArrowLeft, Check, X } from "lucide-react";
import { z } from "zod";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const { signIn, signUp, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGuestContinue = () => {
    continueAsGuest();
    navigate("/dashboard");
  };

  const authSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.passwordMinLength")),
    displayName: z.string().min(2, t("auth.nameMinLength")).optional(),
  });

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
        toast.success(t("auth.welcomeBackToast"));
        navigate("/dashboard");
      }
    } else {
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
        toast.success(t("auth.accountCreated"));
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

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
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-2">
              <Target className="w-8 h-8 text-primary-foreground" />
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
                <Label htmlFor="password">{t("auth.password")}</Label>
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

              <Button
                type="button"
                variant="outline"
                className="w-full border-2"
                onClick={handleGuestContinue}
              >
                {t("auth.continueAsGuest")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

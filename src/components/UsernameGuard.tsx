import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Target } from "lucide-react";

export const UsernameGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, profile, loading, isGuest, createProfile, signOut } = useAuth();
    const { t } = useTranslation();
    const [displayName, setDisplayName] = useState("");
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkUsernameAvailability = useCallback(async (username: string) => {
        const trimmedUsername = username.trim();

        if (trimmedUsername.length < 2) {
            setUsernameAvailable(null);
            return;
        }

        setCheckingUsername(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("display_name", trimmedUsername)
            .maybeSingle();

        setCheckingUsername(false);
        if (error) {
            setUsernameAvailable(false);
            return;
        }

        // If the found username belongs to the current user, it should be allowed.
        setUsernameAvailable(!data || data.id === user?.id);
    }, [user?.id]);

    // Suggested username from Google metadata
    useEffect(() => {
        if (user && !profile && !isGuest && !displayName) {
            const suggested = user.user_metadata?.display_name
                || user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.email?.split("@")[0]
                || "";
            if (suggested) {
                setDisplayName(suggested);
                checkUsernameAvailability(suggested);
            }
        }
    }, [user, profile, isGuest, displayName, checkUsernameAvailability]);

    const handleDisplayNameChange = (value: string) => {
        setDisplayName(value);
        setUsernameAvailable(null);

        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
        }

        checkTimeoutRef.current = setTimeout(() => {
            checkUsernameAvailability(value);
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameAvailable) return;

        setSubmitting(true);
        const { error } = await createProfile(displayName);
        setSubmitting(false);

        if (error) {
            toast.error(t("auth.signupError"));
        } else {
            toast.success(t("auth.accountCreated"));
        }
    };

    // If loading, show loading spinner to prevent flash of username screen
    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
                <div className="animate-pulse-soft">
                    <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
                </div>
            </div>
        );
    }

    // If logged in but no profile, and not a guest, show the username choice screen
    if (user && !profile && !isGuest) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md animate-slide-up">
                    <Card className="shadow-premium border-2 border-primary/20 bg-card/95 md:bg-card/50 md:backdrop-blur-xl">
                        <CardHeader className="text-center space-y-2">
                            <div className="mx-auto mb-4 bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
                                <Target className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-display font-bold">
                                {t("auth.chooseUsername") || "Välj användarnamn"}
                            </CardTitle>
                            <CardDescription>
                                {t("auth.chooseUsernameDesc") || "Välj ett unikt namn för att börja tävla."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="onboarding-displayName">{t("auth.displayName")}</Label>
                                    <div className="relative">
                                        <Input
                                            id="onboarding-displayName"
                                            type="text"
                                            placeholder={t("auth.yourName")}
                                            value={displayName}
                                            onChange={(e) => handleDisplayNameChange(e.target.value)}
                                            required
                                            className={`h-12 text-lg ${usernameAvailable === false
                                                ? "border-destructive focus-visible:ring-destructive"
                                                : usernameAvailable === true
                                                    ? "border-primary focus-visible:ring-primary"
                                                    : ""
                                                }`}
                                        />
                                        {displayName.length >= 2 && !checkingUsername && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {usernameAvailable === true && <Check className="w-5 h-5 text-primary" />}
                                                {usernameAvailable === false && <X className="w-5 h-5 text-destructive" />}
                                            </div>
                                        )}
                                    </div>
                                    {usernameAvailable === false && (
                                        <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                                            {t("auth.usernameTaken")}
                                        </p>
                                    )}
                                    {usernameAvailable === true && (
                                        <p className="text-xs text-primary animate-in fade-in slide-in-from-top-1">
                                            {t("auth.usernameAvailable")}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2 space-y-3">
                                    <Button
                                        type="submit"
                                        variant="hero"
                                        size="lg"
                                        className="w-full h-12 text-lg"
                                        disabled={!usernameAvailable || submitting}
                                    >
                                        {submitting ? t("common.loading") : t("common.save") || "Börja spela"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-muted-foreground"
                                        onClick={() => signOut()}
                                    >
                                        {t("auth.logout")}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return children;
};

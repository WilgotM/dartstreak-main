import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Clock, ArrowRight } from "lucide-react";

interface GuestWarningBannerProps {
    variant?: "full" | "compact";
    showDismiss?: boolean;
    className?: string;
}

export function GuestWarningBanner({
    variant = "full",
    showDismiss = false,
    className = "",
}: GuestWarningBannerProps) {
    const { t } = useTranslation();
    const { isGuest, guestDaysRemaining } = useAuth();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);

    if (!isGuest || dismissed) return null;

    const daysRemaining = guestDaysRemaining ?? 30;
    const isUrgent = daysRemaining <= 7;

    if (variant === "compact") {
        return (
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all hover:opacity-90 ${isUrgent
                        ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30"
                        : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                    } ${className}`}
                onClick={() => navigate("/auth", { state: { mode: "signup" } })}
            >
                <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-red-500" : "text-amber-500"}`} />
                <span className="text-xs font-medium truncate">
                    {t("guest.daysRemaining", { days: daysRemaining })}
                </span>
                <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card
            className={`overflow-hidden ${isUrgent
                    ? "border-2 border-red-500/50 bg-gradient-to-r from-red-500/5 to-orange-500/5"
                    : "border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5"
                } ${className}`}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div
                        className={`shrink-0 p-2 rounded-lg ${isUrgent ? "bg-red-500/20" : "bg-amber-500/20"
                            }`}
                    >
                        <AlertTriangle
                            className={`w-5 h-5 ${isUrgent ? "text-red-500" : "text-amber-500"}`}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {t("guest.bannerTitle")}
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${isUrgent
                                                ? "bg-red-500/20 text-red-500"
                                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                            }`}
                                    >
                                        {t("guest.daysRemaining", { days: daysRemaining })}
                                    </span>
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {isUrgent ? t("guest.bannerDescUrgent") : t("guest.bannerDesc")}
                                </p>
                            </div>

                            {showDismiss && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDismissed(true);
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                                variant="hero"
                                size="sm"
                                onClick={() => navigate("/auth", { state: { mode: "signup" } })}
                            >
                                {t("guest.createAccount")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => navigate("/auth")}
                            >
                                {t("guest.learnMore")}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, Shield, Trash2, ArrowRight } from "lucide-react";

interface GuestLogoutDialogProps {
    children: React.ReactNode;
}

export function GuestLogoutDialog({ children }: GuestLogoutDialogProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { signOut, guestDaysRemaining } = useAuth();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleCreateAccount = () => {
        setOpen(false);
        navigate("/auth", { state: { mode: "signup" } });
    };

    const handleLogoutAndDelete = async () => {
        setIsLoggingOut(true);

        // Clear all guest data
        localStorage.removeItem("dartstreak_guest_mode");
        localStorage.removeItem("dartstreak_guest_id");
        localStorage.removeItem("dartstreak_guest_matches");
        localStorage.removeItem("dartstreak_guest_friends");
        localStorage.removeItem("dartstreak_guest_leagues");
        localStorage.removeItem("dartstreak_guest_tournaments");
        localStorage.removeItem("dartstreak_guest_last_active");
        localStorage.removeItem("dartstreak_guest_info_shown");

        await signOut();
        setOpen(false);
        navigate("/");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <DialogTitle className="text-lg font-display">
                        {t("guest.logoutTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-sm pt-1">
                        {t("guest.logoutDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 my-2">
                    {/* Warning about data loss */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <Trash2 className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-xs text-red-600 dark:text-red-400">
                                {t("guest.logoutWarningTitle")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("guest.logoutWarningDesc")}
                            </p>
                        </div>
                    </div>

                    {/* Recommendation to create account */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-xs">
                                {t("guest.logoutRecommendation")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("guest.logoutRecommendationDesc")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer - using div instead of DialogFooter to force vertical stack */}
                <div className="flex flex-col gap-2 mt-2">
                    {/* Primary: Create Account */}
                    <Button
                        variant="hero"
                        size="default"
                        className="w-full"
                        onClick={handleCreateAccount}
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        {t("guest.createAccountKeepData")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {/* Destructive: Logout and delete */}
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={handleLogoutAndDelete}
                        disabled={isLoggingOut}
                    >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {isLoggingOut ? t("common.loading") : t("guest.logoutAndDelete")}
                    </Button>

                    {/* Cancel */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => setOpen(false)}
                    >
                        {t("common.cancel")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

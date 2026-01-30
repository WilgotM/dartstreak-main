import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Clock, Smartphone, Shield, ArrowRight } from "lucide-react";

interface GuestInfoModalProps {
    open: boolean;
    onClose: () => void;
}

export function GuestInfoModal({ open, onClose }: GuestInfoModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    const handleCreateAccount = () => {
        onClose();
        navigate("/auth", { state: { mode: "signup" } });
    };

    const handleContinueAsGuest = () => {
        localStorage.setItem("dartstreak_guest_info_shown", "true");
        onClose();
    };

    const features = [
        {
            icon: Check,
            title: t("guest.featureFullAccess"),
            description: t("guest.featureFullAccessDesc"),
            color: "text-primary",
        },
        {
            icon: Clock,
            title: t("guest.featureExpiration"),
            description: t("guest.featureExpirationDesc"),
            color: "text-amber-500",
        },
        {
            icon: Shield,
            title: t("guest.featureUpgrade"),
            description: t("guest.featureUpgradeDesc"),
            color: "text-blue-500",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center sm:text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <DialogTitle className="text-xl font-display">
                        {t("guest.welcomeTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        {t("guest.welcomeDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 my-4">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                        >
                            <div className={`mt-0.5 ${feature.color}`}>
                                <feature.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{feature.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{t("guest.recommendationTitle")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("guest.recommendationDesc")}
                    </p>
                </div>

                <DialogFooter className="flex-col gap-2 mt-4 sm:flex-col sm:space-x-0">
                    <Button
                        variant="hero"
                        size="lg"
                        className="w-full"
                        onClick={handleCreateAccount}
                    >
                        {t("guest.createAccountNow")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={handleContinueAsGuest}
                    >
                        {t("guest.continueAsGuestAnyway")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

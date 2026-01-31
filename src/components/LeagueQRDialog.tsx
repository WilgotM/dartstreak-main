import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LeagueQRDialogProps {
    inviteCode: string;
    leagueName: string;
    children?: React.ReactNode;
}

export function LeagueQRDialog({ inviteCode, leagueName, children }: LeagueQRDialogProps) {
    const { t } = useTranslation();

    // Create a URL that works with phone camera apps
    const joinUrl = `${window.location.origin}/join/${inviteCode}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" size="icon" className="shrink-0 text-white hover:bg-white/10 rounded-full w-10 h-10">
                        <QrCode className="w-5 h-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-white text-center">{t("league.scanToJoin")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-4 rounded-2xl">
                        <QRCodeSVG
                            value={joinUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-gray-400 text-sm">{t("league.inviteCode")}</p>
                        <p className="text-2xl font-mono font-bold text-white tracking-wider">{inviteCode}</p>
                    </div>
                    <p className="text-gray-400 text-xs text-center">
                        {t("league.scanWithCamera")}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

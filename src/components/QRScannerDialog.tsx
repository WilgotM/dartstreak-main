import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerDialogProps {
    onScan: (code: string) => void;
    children?: React.ReactNode;
}

export function QRScannerDialog({ onScan, children }: QRScannerDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && containerRef.current) {
            const scannerId = "qr-scanner-container";

            // Create scanner instance
            scannerRef.current = new Html5Qrcode(scannerId);

            scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    // Extract invite code from URL or use as-is
                    let inviteCode = decodedText;

                    // Check if it's a full URL
                    const urlMatch = decodedText.match(/\/join\/([A-Za-z0-9]+)/);
                    if (urlMatch) {
                        inviteCode = urlMatch[1];
                    }

                    // Stop scanner and close dialog
                    if (scannerRef.current) {
                        scannerRef.current.stop().catch(console.error);
                    }
                    setOpen(false);
                    onScan(inviteCode);
                },
                () => {
                    // Ignore scan errors (no QR found)
                }
            ).catch((err) => {
                console.error("Scanner error:", err);
                setError(t("qrScanner.cameraError"));
            });
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }
        };
    }, [open, onScan, t]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2">
                        <ScanLine className="w-4 h-4" />
                        {t("qrScanner.scanQR")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 text-white max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-white text-center">{t("qrScanner.scanToJoin")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    {error ? (
                        <div className="text-red-400 text-center">
                            <p>{error}</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                    setError(null);
                                    setOpen(false);
                                    setTimeout(() => setOpen(true), 100);
                                }}
                            >
                                {t("common.tryAgain")}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div
                                id="qr-scanner-container"
                                ref={containerRef}
                                className="w-full aspect-square rounded-xl overflow-hidden bg-black"
                            />
                            <p className="text-gray-400 text-sm text-center">
                                {t("qrScanner.pointCamera")}
                            </p>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

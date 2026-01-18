import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VideoDialogProps {
  videoUrl: string | null;
  playerName: string;
  throwDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoDialog({ videoUrl, playerName, throwDate, isOpen, onClose }: VideoDialogProps) {
  const { t } = useTranslation();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideo = async () => {
    if (!videoUrl) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from("throw-videos")
        .createSignedUrl(videoUrl, 3600); // 1 hour expiry

      if (downloadError) {
        throw downloadError;
      }

      if (data?.signedUrl) {
        setVideoSrc(data.signedUrl);
      }
    } catch (err) {
      console.error("Error loading video:", err);
      setError(t("videoDialog.couldNotLoadVideo"));
    } finally {
      setLoading(false);
    }
  };

  // Load video when dialog opens
  if (isOpen && !videoSrc && !loading && !error && videoUrl) {
    loadVideo();
  }

  // Reset state when dialog closes
  const handleClose = () => {
    setVideoSrc(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {playerName} – {throwDate}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-square bg-black">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
              <p className="text-destructive font-medium mb-2">{t("videoDialog.videoNotAvailable")}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {videoSrc && !loading && !error && (
            <video
              src={videoSrc}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}

          {!videoUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("videoDialog.noVideoRecorded")}</p>
            </div>
          )}
        </div>

        <div className="p-4 pt-2">
          <Button variant="secondary" className="w-full" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

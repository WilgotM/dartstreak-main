import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Delete, Timer, VideoOff, Upload, AlertTriangle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useDartCaller } from "@/hooks/useDartCaller";

type Multiplier = 1 | 2 | 3;

interface ThrowInputProps {
  onComplete: (throws: number[], videoUrl?: string) => void;
  onCancel?: () => void;
  leagueId: string;
  userId: string;
  leagueTimezone?: string;
}

export default function ThrowInput({ onComplete, leagueId, userId, leagueTimezone = "Europe/Stockholm" }: ThrowInputProps) {
  const { t } = useTranslation();
  const [throws, setThrows] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const lastCalledRoundRef = useRef(0);
  const { playScore } = useDartCaller();

  // Handle voice score detection
  const handleVoiceScore = useCallback((score: number) => {
    if (throws.length >= 9) return;
    setThrows(prev => [...prev, score]);
  }, [throws.length]);

  const { isListening, isSupported, needsRestart, toggleListening } = useVoiceInput({
    onScoreDetected: handleVoiceScore,
    disabled: throws.length >= 9,
    autoStart: true, // Auto-start when it's the player's turn
  });

  const {
    videoRef,
    isRecording,
    hasCamera,
    cameraError,
    startRecording,
    stopRecording,
  } = useCamera();

  // Start camera when component mounts
  useEffect(() => {
    if (!cameraStarted) {
      setCameraStarted(true);
      startRecording();
    }
  }, [cameraStarted, startRecording]);

  // Play dart caller sound after each completed round (every 3 darts)
  useEffect(() => {
    const currentRound = Math.floor(throws.length / 3);

    // If we just completed a round and haven't called it yet
    if (throws.length > 0 && throws.length % 3 === 0 && currentRound > lastCalledRoundRef.current) {
      const roundStart = (currentRound - 1) * 3;
      const roundScore = throws[roundStart] + throws[roundStart + 1] + throws[roundStart + 2];
      playScore(roundScore);
      lastCalledRoundRef.current = currentRound;
    }
  }, [throws, playScore]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      stopRecording();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, stopRecording]);

  // Prevent navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalScore = throws.reduce((a, b) => a + b, 0);
  const currentThrowIndex = throws.length;
  const currentRound = Math.floor(currentThrowIndex / 3) + 1;

  const handleNumberClick = useCallback((num: number) => {
    if (throws.length >= 9) return;
    const score = num * multiplier;
    setThrows((prev) => [...prev, score]);
    setMultiplier(1); // Reset multiplier after each throw
  }, [throws.length, multiplier]);

  const handleBackspace = useCallback(() => {
    if (throws.length > 0) {
      setThrows((prev) => prev.slice(0, -1));
    }
  }, [throws.length]);

  const handleMiss = useCallback(() => {
    if (throws.length >= 9) return;
    setThrows((prev) => [...prev, 0]);
  }, [throws.length]);

  const uploadVideo = async (blob: Blob): Promise<string | undefined> => {
    let throwDate: string;
    try {
      throwDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: leagueTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      throwDate = new Date().toISOString().split("T")[0];
    }
    const filePath = `${leagueId}/${userId}/${throwDate}.webm`;

    const { error } = await supabase.storage
      .from("throw-videos")
      .upload(filePath, blob, {
        contentType: blob.type || "video/webm",
        upsert: true,
      });

    if (error) {
      console.error("Video upload error:", error);
      return undefined;
    }

    return filePath;
  };

  const handleComplete = useCallback(async () => {
    if (throws.length !== 9 || isCompleting) return;

    setIsCompleting(true);

    // Stop recording and get the blob directly
    const blob = await stopRecording();

    let videoUrl: string | undefined;

    if (blob && blob.size > 0) {
      console.log("Uploading video blob:", blob.size, "bytes");
      setIsUploading(true);
      videoUrl = await uploadVideo(blob);
      setIsUploading(false);
      console.log("Video uploaded, URL:", videoUrl);
    } else {
      console.log("No video blob to upload");
    }

    onComplete(throws, videoUrl);
  }, [throws, onComplete, isCompleting, stopRecording, leagueId, userId]);

  const getRoundThrows = (round: number) => {
    const start = (round - 1) * 3;
    return throws.slice(start, start + 3);
  };

  const getRoundTotal = (round: number) => {
    return getRoundThrows(round).reduce((a, b) => a + b, 0);
  };

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Timer className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-display font-bold text-destructive">
            {t("throwInput.timeUp")}
          </h2>
          <p className="text-muted-foreground">
            {t("throwInput.didNotComplete")}
          </p>
          <Button onClick={() => window.location.reload()} variant="hero">
            {t("throwInput.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen">
      {/* Camera preview - Square, takes ~30% of screen on mobile */}
      <div className="relative bg-black flex-shrink-0" style={{ height: "30vh" }}>
        {/* Always render video element so ref can be attached */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${hasCamera && isRecording ? 'block' : 'hidden'}`}
          style={{ aspectRatio: "1/1", margin: "0 auto" }}
        />

        {hasCamera && isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            REC
          </div>
        )}

        {cameraError && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
            <p className="text-destructive text-sm font-medium mb-2">{t("throwInput.cameraError")}</p>
            <p className="text-muted-foreground text-xs max-w-[250px]">{cameraError}</p>
          </div>
        )}

        {!hasCamera && !cameraError && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <VideoOff className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{t("throwInput.startingCamera")}</p>
          </div>
        )}

        {/* Timer overlay */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono ${timeLeft < 60
          ? "bg-destructive/90 text-destructive-foreground animate-pulse"
          : "bg-background/80 text-foreground"
          }`}>
          <Timer className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Numpad section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Number pad - matching MatchThrowInput layout */}
        <div className="flex-1 bg-background p-3 flex flex-col justify-center overflow-y-auto space-y-3">
          {/* Multiplier buttons + Voice - moved to top like MatchThrowInput */}
          <div className="flex justify-center gap-2 max-w-md mx-auto w-full">
            {([1, 2, 3] as const).map((m) => (
              <Button
                key={m}
                variant={multiplier === m ? "default" : "outline"}
                size="sm"
                onClick={() => setMultiplier(m)}
                disabled={throws.length >= 9}
                className="w-16"
              >
                {m === 1 ? "Single" : m === 2 ? "Double" : "Triple"}
              </Button>
            ))}
            <VoiceInputButton
              isListening={isListening}
              isSupported={isSupported}
              needsRestart={needsRestart}
              onToggle={toggleListening}
              disabled={throws.length >= 9}
            />
          </div>

          {/* Number grid - 5 columns like MatchThrowInput */}
          <div className="grid grid-cols-5 gap-2 max-w-md mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
              <Button
                key={num}
                variant="secondary"
                size="sm"
                onClick={() => handleNumberClick(num)}
                disabled={throws.length >= 9}
                className="h-14 text-lg font-bold font-mono shadow-sm active:scale-95 transition-transform"
              >
                {num}
              </Button>
            ))}
          </div>

          {/* Special buttons - Miss, 25, BULL, Undo (like MatchThrowInput) */}
          <div className="flex gap-2 max-w-md mx-auto w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMiss}
              disabled={throws.length >= 9}
              className="flex-1 h-14 font-bold border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {t("throwInput.miss")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setThrows((prev) => [...prev, 25]); setMultiplier(1); }}
              disabled={throws.length >= 9}
              className="flex-1 h-14 font-bold text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/20"
            >
              25
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setThrows((prev) => [...prev, 50]); setMultiplier(1); }}
              disabled={throws.length >= 9}
              className="flex-1 h-14 font-black shadow-lg shadow-destructive/20"
            >
              BULL
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackspace}
              disabled={throws.length === 0}
              className="h-14 px-3"
            >
              <Delete className="w-6 h-6" />
            </Button>
          </div>

          {/* Confirm button - only show when 9 throws are done */}
          {throws.length === 9 && (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || isUploading}
              variant="hero"
              className="w-full max-w-md mx-auto"
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  {t("throwInput.uploading")}
                </>
              ) : isCompleting ? (
                t("throwInput.saving")
              ) : (
                `${t("throwInput.done")} (${totalScore})`
              )}
            </Button>
          )}
        </div>

        {/* Score section at bottom - more compact */}
        <div className="bg-card border-t border-border py-2 px-3">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Round indicators - compact */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((round) => {
                const roundThrows = getRoundThrows(round);
                const isCurrentRound = currentRound === round;
                const isCompleted = roundThrows.length === 3;

                return (
                  <div
                    key={round}
                    className={`px-1.5 py-1 rounded text-center ${isCurrentRound
                      ? "bg-primary/20 border border-primary/50"
                      : isCompleted
                        ? "bg-primary/10"
                        : "bg-muted"
                      }`}
                  >
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((dartIndex) => {
                        const throwIndex = (round - 1) * 3 + dartIndex;
                        const hasThrow = throws[throwIndex] !== undefined;
                        const score = throws[throwIndex];
                        return (
                          <div
                            key={dartIndex}
                            className={`w-6 h-5 rounded text-[10px] flex items-center justify-center font-mono ${hasThrow
                              ? "bg-primary text-primary-foreground font-bold"
                              : throwIndex === currentThrowIndex
                                ? "bg-accent/30 border border-accent"
                                : "bg-background border border-border"
                              }`}
                          >
                            {hasThrow ? score : ""}
                          </div>
                        );
                      })}
                    </div>
                    <p className={`text-[10px] font-display font-bold mt-0.5 ${isCompleted ? "text-primary" : "text-muted-foreground"
                      }`}>
                      {isCompleted ? getRoundTotal(round) : "-"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total score */}
            <div className="text-right">
              <p className="text-2xl font-display font-bold text-primary tracking-tight">
                {totalScore}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {t("throwInput.throw")} {Math.min(currentThrowIndex + 1, 9)}/9
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

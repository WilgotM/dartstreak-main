import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Delete, Timer, VideoOff, Upload, AlertTriangle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useOrientation } from "@/hooks/useOrientation";


type Multiplier = 1 | 2 | 3;

interface ThrowInputProps {
  onComplete: (throws: number[], videoUrl?: string) => void;
  onCancel?: () => void;
  leagueId: string;
  userId: string;
  leagueTimezone?: string;
  cameraRequired?: boolean;
}

export default function ThrowInput({
  onComplete,
  leagueId,
  userId,
  leagueTimezone = "Europe/Stockholm",
  cameraRequired = true,
}: ThrowInputProps) {
  const { t } = useTranslation();
  const isLandscape = useOrientation();
  const [throws, setThrows] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [multiplier, setMultiplier] = useState<Multiplier>(1);



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
    if (!cameraStarted && cameraRequired) {
      setCameraStarted(true);
      startRecording();
    }
  }, [cameraStarted, cameraRequired, startRecording]);



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

  const uploadVideo = useCallback(async (blob: Blob): Promise<string | undefined> => {
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
  }, [leagueId, leagueTimezone, userId]);

  const handleComplete = useCallback(async () => {
    if (throws.length !== 9 || isCompleting) return;

    setIsCompleting(true);

    let videoUrl: string | undefined;

    if (cameraRequired) {
      // Stop recording and get the blob directly
      const blob = await stopRecording();

      if (blob && blob.size > 0) {
        console.log("Uploading video blob:", blob.size, "bytes");
        setIsUploading(true);
        videoUrl = await uploadVideo(blob);
        setIsUploading(false);
        console.log("Video uploaded, URL:", videoUrl);
      } else {
        console.log("No video blob to upload");
      }
    }

    onComplete(throws, videoUrl);
  }, [throws, onComplete, isCompleting, stopRecording, cameraRequired, uploadVideo]);

  const getRoundThrows = (round: number) => {
    const start = (round - 1) * 3;
    return throws.slice(start, start + 3);
  };

  const getRoundTotal = (round: number) => {
    return getRoundThrows(round).reduce((a, b) => a + b, 0);
  };

  // ── Shared UI pieces ──

  const cameraPreview = (
    <>
      {cameraRequired ? (
        <>
          {/* Always render video element so ref can be attached */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover rounded-lg ${hasCamera && isRecording ? 'block' : 'hidden'}`}
          />

          {hasCamera && isRecording && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded-full text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              REC
            </div>
          )}

          {cameraError && (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
              <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
              <p className="text-destructive text-xs font-medium">{t("throwInput.cameraError")}</p>
            </div>
          )}

          {!hasCamera && !cameraError && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <VideoOff className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-xs">{t("throwInput.startingCamera")}</p>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
          <VideoOff className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-xs">{t("throwInput.cameraNotRequired")}</p>
        </div>
      )}
    </>
  );

  const timerBadge = (
    <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${timeLeft < 60
      ? "bg-destructive/90 text-destructive-foreground animate-pulse"
      : "bg-background/80 text-foreground"
      }`}>
      <Timer className="w-3 h-3" />
      {formatTime(timeLeft)}
    </div>
  );

  const multiplierButtons = (
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
  );

  const numberGrid = (
    <div className={`grid gap-1.5 max-w-md mx-auto w-full ${isLandscape ? 'grid-cols-5' : 'grid-cols-5 gap-2'}`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
        <Button
          key={num}
          variant="secondary"
          size="sm"
          onClick={() => handleNumberClick(num)}
          disabled={throws.length >= 9}
          className={`font-bold font-mono shadow-sm active:scale-95 transition-transform ${isLandscape ? 'h-10 text-sm' : 'h-14 text-lg'}`}
        >
          {num}
        </Button>
      ))}
    </div>
  );

  const specialButtons = (
    <div className="flex gap-1.5 max-w-md mx-auto w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={handleMiss}
        disabled={throws.length >= 9}
        className={`flex-1 font-bold border-destructive/50 text-destructive hover:bg-destructive/10 ${isLandscape ? 'h-10' : 'h-14'}`}
      >
        {t("throwInput.miss")}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => { setThrows((prev) => [...prev, 25]); setMultiplier(1); }}
        disabled={throws.length >= 9}
        className={`flex-1 font-bold text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/20 ${isLandscape ? 'h-10' : 'h-14'}`}
      >
        25
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setThrows((prev) => [...prev, 50]); setMultiplier(1); }}
        disabled={throws.length >= 9}
        className={`flex-1 font-black shadow-lg shadow-destructive/20 ${isLandscape ? 'h-10' : 'h-14'}`}
      >
        BULL
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBackspace}
        disabled={throws.length === 0}
        className={`px-3 ${isLandscape ? 'h-10' : 'h-14'}`}
      >
        <Delete className="w-5 h-5" />
      </Button>
    </div>
  );

  const confirmButton = throws.length === 9 ? (
    <Button
      onClick={handleComplete}
      disabled={isCompleting || isUploading}
      variant="hero"
      className={`w-full max-w-md mx-auto ${isLandscape ? 'h-10' : ''}`}
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
  ) : null;

  const scoreSection = (
    <div className="flex items-center justify-between max-w-md mx-auto w-full">
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
  );

  // ── Expired state ──

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

  // ── LANDSCAPE LAYOUT ──

  if (isLandscape) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-row" style={{ height: '100dvh' }}>
        {/* Left column: Camera preview + Score summary */}
        <div className="flex flex-col flex-shrink-0 items-center" style={{ width: '28%', maxWidth: '200px' }}>
          {/* Camera - always square */}
          <div className="relative bg-black w-full flex items-center justify-center">
            <div className="relative w-full aspect-square">
              {cameraPreview}
              {timerBadge}
            </div>
          </div>
          {/* Score section */}
          <div className="bg-card border-t border-r border-border p-2">
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((round) => {
                  const roundThrows = getRoundThrows(round);
                  const isCurrentRound = currentRound === round;
                  const isCompleted = roundThrows.length === 3;

                  return (
                    <div
                      key={round}
                      className={`px-1 py-0.5 rounded text-center ${isCurrentRound
                        ? "bg-primary/20 border border-primary/50"
                        : isCompleted
                          ? "bg-primary/10"
                          : "bg-muted"
                        }`}
                    >
                      <div className="flex gap-px">
                        {[0, 1, 2].map((dartIndex) => {
                          const throwIndex = (round - 1) * 3 + dartIndex;
                          const hasThrow = throws[throwIndex] !== undefined;
                          const score = throws[throwIndex];
                          return (
                            <div
                              key={dartIndex}
                              className={`w-5 h-4 rounded text-[9px] flex items-center justify-center font-mono ${hasThrow
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
                      <p className={`text-[9px] font-display font-bold ${isCompleted ? "text-primary" : "text-muted-foreground"
                        }`}>
                        {isCompleted ? getRoundTotal(round) : "-"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xl font-display font-bold text-primary">
                {totalScore}
              </p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">
                {t("throwInput.throw")} {Math.min(currentThrowIndex + 1, 9)}/9
              </p>
            </div>
          </div>
        </div>

        {/* Right column: All input controls */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-2 gap-1.5 justify-center">
          {multiplierButtons}
          {numberGrid}
          {specialButtons}
          {confirmButton}
        </div>
      </div>
    );
  }

  // ── PORTRAIT LAYOUT (original) ──

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ height: '100dvh' }}>
      {/* Camera preview - Square, centered */}
      <div className="relative bg-black flex-shrink-0 flex items-center justify-center" style={{ height: '25dvh' }}>
        <div className="relative aspect-square h-full max-w-full">
          {cameraPreview}
          {timerBadge}
        </div>
      </div>

      {/* Numpad section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Number pad - matching MatchThrowInput layout */}
        <div className="flex-1 bg-background p-3 flex flex-col justify-center overflow-y-auto space-y-3">
          {multiplierButtons}
          {numberGrid}
          {specialButtons}
          {confirmButton}
        </div>

        {/* Score section at bottom - with safe area for iOS Safari */}
        <div className="bg-card border-t border-border py-2 px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          {scoreSection}
        </div>
      </div>
    </div>
  );
}

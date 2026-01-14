import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useDartCaller } from "@/hooks/useDartCaller";

interface MatchThrowInputProps {
  onComplete: (dart1: number, dart2: number, dart3: number) => void;
  remainingScore: number;
  disabled?: boolean;
  onDartsChange?: (darts: number[]) => void;
}

export function MatchThrowInput({ onComplete, remainingScore, disabled, onDartsChange }: MatchThrowInputProps) {
  const { t } = useTranslation();
  const [darts, setDarts] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const { playRoundScore } = useDartCaller();

  // Handle voice score detection
  const handleVoiceScore = useCallback((score: number) => {
    if (darts.length >= 3 || disabled) return;
    setDarts(prev => [...prev, score]);
  }, [darts.length, disabled]);

  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onScoreDetected: handleVoiceScore,
    disabled: disabled || darts.length >= 3,
  });

  // Notify parent of darts changes for real-time broadcast
  useEffect(() => {
    onDartsChange?.(darts);
  }, [darts, onDartsChange]);

  const handleNumberClick = (num: number) => {
    if (darts.length >= 3) return;
    
    const score = num * multiplier;
    const maxScore = num === 25 ? (multiplier === 2 ? 50 : 25) : score;
    
    setDarts([...darts, maxScore]);
    setMultiplier(1);
  };

  const handleSpecialClick = (score: number) => {
    if (darts.length >= 3) return;
    setDarts([...darts, score]);
    setMultiplier(1);
  };

  const handleUndo = () => {
    if (darts.length > 0) {
      setDarts(darts.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    const [d1 = 0, d2 = 0, d3 = 0] = darts;
    // Play the dart caller sound for the round total
    playRoundScore(d1, d2, d3);
    onComplete(d1, d2, d3);
    setDarts([]);
    setMultiplier(1);
  };

  const currentTotal = darts.reduce((a, b) => a + b, 0);
  const projectedScore = remainingScore - currentTotal;

  return (
    <div className="space-y-3">
      {/* Current darts display */}
      <div className="flex justify-center gap-4 py-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-display font-bold transition-all ${
              darts[i] !== undefined
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {darts[i] !== undefined ? darts[i] : "-"}
          </div>
        ))}
      </div>

      {/* Score preview */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">{t("match.total")}: </span>
        <span className="font-bold">{currentTotal}</span>
        <span className="text-muted-foreground mx-2">→</span>
        <span className={`font-bold ${projectedScore < 0 ? "text-destructive" : "text-primary"}`}>
          {projectedScore}
        </span>
      </div>

      {/* Multiplier buttons + Voice */}
      <div className="flex justify-center gap-2">
        {([1, 2, 3] as const).map((m) => (
          <Button
            key={m}
            variant={multiplier === m ? "default" : "outline"}
            size="sm"
            onClick={() => setMultiplier(m)}
            disabled={disabled || darts.length >= 3}
            className="w-16"
          >
            {m === 1 ? "Single" : m === 2 ? "Double" : "Triple"}
          </Button>
        ))}
        <VoiceInputButton
          isListening={isListening}
          isSupported={isSupported}
          onToggle={toggleListening}
          disabled={disabled || darts.length >= 3}
        />
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
          <Button
            key={num}
            variant="secondary"
            size="sm"
            onClick={() => handleNumberClick(num)}
            disabled={disabled || darts.length >= 3}
            className="h-14 text-lg font-bold font-mono shadow-sm active:scale-95 transition-transform"
          >
            {num}
          </Button>
        ))}
      </div>

      {/* Special buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSpecialClick(0)}
          disabled={disabled || darts.length >= 3}
          className="flex-1 h-14 font-bold border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          {t("throwInput.miss")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleSpecialClick(25)}
          disabled={disabled || darts.length >= 3}
          className="flex-1 h-14 font-bold text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/20"
        >
          25
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleSpecialClick(50)}
          disabled={disabled || darts.length >= 3}
          className="flex-1 h-14 font-black shadow-lg shadow-destructive/20"
        >
          BULL
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={disabled || darts.length === 0}
          className="h-14 px-3"
        >
          <Undo2 className="w-6 h-6" />
        </Button>
      </div>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={disabled || darts.length === 0}
        variant="hero"
        className="w-full"
      >
        {t("match.confirmThrow")} ({currentTotal})
      </Button>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useDartCaller } from "@/hooks/useDartCaller";

interface MatchThrowInputProps {
  onComplete: (dart1: number, dart2: number, dart3: number, dartDetails: { score: number; multiplier: number }[]) => void;
  remainingScore: number;
  disabled?: boolean;
  onDartsChange?: (darts: number[]) => void;
}

export function MatchThrowInput({ onComplete, remainingScore, disabled, onDartsChange }: MatchThrowInputProps) {
  // ... (this part is handled by previous replacement, but we need to ensure local renders are fixed)
  // The previous replacement handled lines 18-67.
  // We need to fix rendering of darts (lines 76-87) and calculation of currentTotal (line 69).

  // Wait, I should do this in one go or subsequent calls.
  // I will use multi_replace.

  const { t } = useTranslation();
  const [darts, setDarts] = useState<{ score: number; multiplier: number }[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const { playRoundScore } = useDartCaller();

  // Handle voice score detection
  const handleVoiceScore = useCallback((score: number) => {
    if (darts.length >= 3 || disabled) return;
    // Voice input usually gives the total score for the dart. 
    // We'll guess multiplier=1 unless we implement better parsing later or if it's an impossible single score.
    // For now, let's assume it's a valid single target or handle specific logic.
    // Actually, voice input hook might just return score.
    // If we assume voice gives score, we accept it.
    // However, if the score implies a double (like "Double 20"), the voice parser should return that.
    // Assuming the simple voice parser returns a number.
    // We will treat it as multiplier 1 for now unless it's strictly a double/triple segment?
    // Let's stick to safe default.
    setDarts(prev => [...prev, { score, multiplier: 1 }]);
  }, [darts.length, disabled]);

  const { isListening, isSupported, needsRestart, toggleListening } = useVoiceInput({
    onScoreDetected: handleVoiceScore,
    disabled: disabled || darts.length >= 3,
    autoStart: true, // Auto-start when it's the player's turn
  });

  // Notify parent of darts changes for real-time broadcast
  useEffect(() => {
    onDartsChange?.(darts.map(d => d.score));
  }, [darts, onDartsChange]);

  const handleNumberClick = (num: number) => {
    if (darts.length >= 3) return;

    const score = num * multiplier;
    const maxScore = num === 25 ? (multiplier === 2 ? 50 : 25) : score;
    const actualMultiplier = num === 25 ? (multiplier === 2 ? 2 : 1) : multiplier;

    setDarts([...darts, { score: maxScore, multiplier: actualMultiplier }]);
    setMultiplier(1);
  };

  const handleSpecialClick = (score: number) => {
    if (darts.length >= 3) return;
    // Special click: 0 (Miss), 25 (Outer), 50 (Bull)
    // 0 is multiplier 1 (technically 0, but 1 is safe for logic usually, or 0)
    // 25 is multiplier 1
    // 50 is multiplier 2 (Double 25)
    let mult = 1;
    if (score === 50) mult = 2;
    if (score === 0) mult = 0; // or 1?

    setDarts([...darts, { score, multiplier: mult }]);
    setMultiplier(1);
  };

  const handleUndo = () => {
    if (darts.length > 0) {
      setDarts(darts.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    const d1 = darts[0] || { score: 0, multiplier: 0 };
    const d2 = darts[1] || { score: 0, multiplier: 0 };
    const d3 = darts[2] || { score: 0, multiplier: 0 };

    // Play the dart caller sound for the round total
    playRoundScore(d1.score, d2.score, d3.score);

    onComplete(d1.score, d2.score, d3.score, [d1, d2, d3]);
    setDarts([]);
    setMultiplier(1);
  };

  const currentTotal = darts.reduce((a, b) => a + b.score, 0);
  const projectedScore = remainingScore - currentTotal;

  return (
    <div className="space-y-3">
      {/* Current darts display */}
      <div className="flex justify-center gap-4 py-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-display font-bold transition-all ${darts[i] !== undefined
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
              }`}
          >
            {darts[i] !== undefined ? darts[i].score : "-"}
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
          needsRestart={needsRestart}
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

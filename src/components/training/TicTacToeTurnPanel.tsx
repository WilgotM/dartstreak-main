import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Player = "A" | "B";
type Multiplier = 1 | 2 | 3;

interface ThrowInputEntry {
  score: number;
  label: string;
  isDouble: boolean;
}

interface TicTacToeTurnPanelProps {
  currentPlayer: Player;
  currentPlayerName: string;
  currentPlayerColor: string;
  throwsThisTurn: ThrowInputEntry[];
  pendingTarget: number | null;
  disabled?: boolean;
  strings: {
    selectHint: string;
    miss: string;
    undo: string;
    lockSquare: string;
    throwLabel: string;
    activePlayer: string;
    single: string;
    double: string;
    triple: string;
    total: string;
    quick25: string;
  };
  onAddThrow: (entry: ThrowInputEntry) => void;
  onUndoThrow: () => void;
  onLockSquare: () => void;
  className?: string;
}

export default function TicTacToeTurnPanel({
  currentPlayer,
  currentPlayerName,
  currentPlayerColor,
  throwsThisTurn,
  pendingTarget,
  disabled = false,
  strings,
  onAddThrow,
  onUndoThrow,
  onLockSquare,
  className,
}: TicTacToeTurnPanelProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const canLock = !disabled && pendingTarget !== null;
  const canThrow = !disabled && throwsThisTurn.length < 3;
  const turnTotal = throwsThisTurn.reduce((sum, item) => sum + item.score, 0);

  const addSegmentThrow = (segment: number) => {
    if (!canThrow) return;
    const score = segment * multiplier;
    const labelPrefix = multiplier === 1 ? "S" : multiplier === 2 ? "D" : "T";
    onAddThrow({
      score,
      label: `${labelPrefix}${segment}`,
      isDouble: multiplier === 2,
    });
    setMultiplier(1);
  };

  const addMiss = () => {
    if (!canThrow) return;
    onAddThrow({ score: 0, label: "MISS", isDouble: false });
  };

  const addOuterBull = () => {
    if (!canThrow) return;
    onAddThrow({ score: 25, label: "25", isDouble: false });
  };

  const addBull = () => {
    if (!canThrow) return;
    onAddThrow({ score: 50, label: "BULL", isDouble: true });
  };

  return (
    <section
      className={cn(
        "h-full space-y-4 md:space-y-4 glass-card rounded-2xl p-4 sm:p-5 md:p-5 border border-white/10",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider text-muted-foreground">{strings.activePlayer}</h3>
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-white/50"
            style={{ backgroundColor: currentPlayerColor }}
          />
          <span>{currentPlayerName}</span>
          <span className="text-xs text-muted-foreground">({currentPlayer})</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-2">
        {[0, 1, 2].map((index) => {
          const throwValue = throwsThisTurn[index];
          return (
            <div
              key={index}
              className="rounded-xl border border-white/10 bg-black/20 h-16 md:h-16 flex flex-col items-center justify-center"
            >
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {strings.throwLabel} {index + 1}
              </span>
              <span className="text-[11px] text-muted-foreground leading-none mb-1">
                {throwValue?.label ?? "-"}
              </span>
              <span className="text-lg font-mono font-semibold text-foreground leading-none">
                {throwValue?.score ?? "-"}
              </span>
            </div>
          );
        })}
      </div>

      {pendingTarget !== null && (
        <p className="text-sm text-emerald-300">
          {strings.lockSquare}: <span className="font-semibold">{pendingTarget}</span>
        </p>
      )}

      <p className="text-sm text-muted-foreground">{strings.selectHint}</p>

      <div className="flex gap-2 md:gap-2">
        <Button
          type="button"
          variant={multiplier === 1 ? "default" : "outline"}
          onClick={() => setMultiplier(1)}
          disabled={!canThrow}
          className="flex-1"
        >
          {strings.single}
        </Button>
        <Button
          type="button"
          variant={multiplier === 2 ? "default" : "outline"}
          onClick={() => setMultiplier(2)}
          disabled={!canThrow}
          className="flex-1"
        >
          {strings.double}
        </Button>
        <Button
          type="button"
          variant={multiplier === 3 ? "default" : "outline"}
          onClick={() => setMultiplier(3)}
          disabled={!canThrow}
          className="flex-1"
        >
          {strings.triple}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-2">
        {Array.from({ length: 20 }, (_, index) => index + 1).map((segment) => (
          <Button
            key={segment}
            type="button"
            variant="secondary"
            onClick={() => addSegmentThrow(segment)}
            disabled={!canThrow}
            className="h-11 md:h-11 text-base md:text-base font-semibold"
          >
            {segment}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={addMiss}
          disabled={!canThrow}
          className="border-white/15"
        >
          {strings.miss}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={addOuterBull}
          disabled={!canThrow}
          className="border-white/15"
        >
          {strings.quick25}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={addBull}
          disabled={!canThrow}
          className="border-white/15"
        >
          BULL
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onUndoThrow}
          disabled={disabled || throwsThisTurn.length === 0}
          className="border-white/15"
        >
          <Delete className="w-4 h-4 mr-1.5" />
          {strings.undo}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {strings.total}: <span className="font-semibold text-foreground">{turnTotal}</span>
      </p>

      <Button onClick={onLockSquare} disabled={!canLock} className="w-full">
        {strings.lockSquare}
      </Button>
    </section>
  );
}

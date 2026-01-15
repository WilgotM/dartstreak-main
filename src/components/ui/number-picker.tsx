import * as React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  label?: string;
}

export function NumberPicker({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  label,
}: NumberPickerProps) {
  const handleDecrement = () => {
    if (value > min) {
      onValueChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onValueChange(value + step);
    }
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-1 border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-background"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease</span>
        </Button>
        <span className="w-8 text-center font-bold text-lg tabular-nums">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-background"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase</span>
        </Button>
      </div>
    </div>
  );
}

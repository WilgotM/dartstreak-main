import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  isListening,
  isSupported,
  onToggle,
  disabled,
  className,
}: VoiceInputButtonProps) {
  const { t, i18n } = useTranslation();
  const isSwedish = i18n.language === "sv";

  if (!isSupported) {
    return null;
  }

  const exampleCommand = isSwedish
    ? 'Säg "poäng trippel tjugo"'
    : 'Say "score triple twenty"';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isListening ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            disabled={disabled}
            className={`${className} ${isListening ? "bg-destructive hover:bg-destructive/90 animate-pulse" : ""}`}
          >
            {isListening ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {isListening ? t("voice.listening") : t("voice.tapToStart")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{exampleCommand}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

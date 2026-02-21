import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeLanguageCode } from "@/i18n/languages";

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  needsRestart?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  isListening,
  isSupported,
  needsRestart,
  onToggle,
  disabled,
  className,
}: VoiceInputButtonProps) {
  const { t, i18n } = useTranslation();
  const languageCode = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language);

  if (!isSupported) {
    return null;
  }

  const exampleCommand = (() => {
    switch (languageCode) {
      case "sv":
        return 'Säg "trippel tjugo" eller "60"';
      case "de":
        return 'Sag "dreifach zwanzig" oder "60"';
      case "nl":
        return 'Zeg "drievoudig twintig" of "60"';
      default:
        return 'Say "triple twenty" or "60"';
    }
  })();

  // Determine button state and styling
  const getButtonStyle = () => {
    if (needsRestart) {
      return "bg-amber-500 hover:bg-amber-600 text-white";
    }
    if (isListening) {
      return "bg-green-600 hover:bg-green-700 text-white";
    }
    return "";
  };

  const getIcon = () => {
    if (needsRestart) {
      return (
        <span className="relative">
          <Mic className="w-4 h-4" />
          <AlertCircle className="absolute -top-1 -right-1 w-3 h-3 text-white" />
        </span>
      );
    }
    if (isListening) {
      return (
        <span className="relative">
          <Mic className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse" />
        </span>
      );
    }
    return <MicOff className="w-4 h-4" />;
  };

  const getTooltipText = () => {
    if (needsRestart) {
      switch (languageCode) {
        case "sv":
          return "Tryck för att starta om mikrofonen";
        case "de":
          return "Tippen, um das Mikrofon neu zu starten";
        case "nl":
          return "Tik om de microfoon opnieuw te starten";
        default:
          return "Tap to restart microphone";
      }
    }
    if (isListening) {
      return t("voice.listening");
    }
    return t("voice.tapToStart");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isListening || needsRestart ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            disabled={disabled}
            className={`${className} ${getButtonStyle()}`}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {getTooltipText()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{exampleCommand}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

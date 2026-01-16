import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TournamentCountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
}

export function TournamentCountdown({ targetDate, className, compact = false }: TournamentCountdownProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return null;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs font-medium text-amber-500", className)}>
        <Clock className="w-3.5 h-3.5" />
        <span className="tabular-nums tracking-tight">
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center gap-1.5 mb-1 text-amber-500/90 font-medium text-xs uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5" />
        <span>{t("tournament.startsIn") || "Startar om"}</span>
      </div>
      <div className="flex items-baseline gap-1 text-foreground">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-mono font-bold leading-none">{timeLeft.days}</span>
              <span className="text-[10px] text-muted-foreground uppercase">d</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground/40">:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-mono font-bold leading-none">{pad(timeLeft.hours)}</span>
          <span className="text-[10px] text-muted-foreground uppercase">h</span>
        </div>
        <span className="text-xl font-bold text-muted-foreground/40">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-mono font-bold leading-none">{pad(timeLeft.minutes)}</span>
          <span className="text-[10px] text-muted-foreground uppercase">m</span>
        </div>
        <span className="text-xl font-bold text-muted-foreground/40">:</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-mono font-bold leading-none min-w-[1.5em] text-center">{pad(timeLeft.seconds)}</span>
          <span className="text-[10px] text-muted-foreground uppercase">s</span>
        </div>
      </div>
    </div>
  );
}

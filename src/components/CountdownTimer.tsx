import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  timezone: string;
}

export function CountdownTimer({ timezone }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        // Get current time in the specified timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
        
        const currentHour = parseInt(getValue('hour'));
        const currentMinute = parseInt(getValue('minute'));
        const currentSecond = parseInt(getValue('second'));
        
        // Calculate seconds until midnight in that timezone
        const secondsUntilMidnight = 
          (23 - currentHour) * 3600 + 
          (59 - currentMinute) * 60 + 
          (60 - currentSecond);
        
        const hours = Math.floor(secondsUntilMidnight / 3600);
        const minutes = Math.floor((secondsUntilMidnight % 3600) / 60);
        const seconds = secondsUntilMidnight % 60;
        
        setTimeLeft({ hours, minutes, seconds });
      } catch {
        // Fallback for invalid timezone
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span>{t("league.nextDay")}</span>
      <span className="font-mono font-semibold text-foreground">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

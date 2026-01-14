import { Target } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-pulse-soft">
        <img src="/logo.png" alt="DartStreak Logo" className="w-20 h-20 object-contain" />
        <h1 className="font-display text-2xl font-bold text-primary">DartStreak</h1>
      </div>
    </div>
  );
}

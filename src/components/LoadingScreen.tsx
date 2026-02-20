import { cn } from "@/lib/utils";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className={cn(
              "relative flex h-24 w-24 items-center justify-center rounded-2xl",
              "shadow-lg",
              "animate-in fade-in zoom-in duration-500"
            )}
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))'
            }}
          >
            <img
              src="/logo.png"
              alt="DartStreak Logo"
              className="h-16 w-16 object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1
            className={cn(
              "font-display text-3xl font-bold tracking-tight text-foreground",
              "animate-in fade-in slide-in-from-bottom-4 duration-700"
            )}
            style={{ animationDelay: '200ms' }}
          >
            DartStreak
          </h1>

          <div
            className="flex items-center gap-1 animate-in fade-in duration-500"
            style={{ animationDelay: '500ms' }}
          >
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

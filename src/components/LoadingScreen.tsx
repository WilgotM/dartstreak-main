import { cn } from "@/lib/utils";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
      {/* Dark gradient background - hardcoded for before theme loads */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.1), #0f1117, rgba(239, 68, 68, 0.05))' }} />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 animate-pulse rounded-full blur-3xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }} />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 animate-pulse rounded-full blur-3xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.03)', animationDelay: '1s' }} />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', animationDuration: '2s' }} />
          <div
            className={cn(
              "relative flex h-24 w-24 items-center justify-center rounded-2xl",
              "shadow-2xl",
              "animate-in fade-in zoom-in duration-500"
            )}
            style={{ 
              background: 'linear-gradient(to bottom right, #1a1d24, rgba(26, 29, 36, 0.8))',
              boxShadow: '0 25px 50px -12px rgba(34, 197, 94, 0.2)'
            }}
          >
            <img 
              src="/logo.png" 
              alt="DartStreak Logo" 
              className="h-16 w-16 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 
            className={cn(
              "font-display text-3xl font-bold tracking-tight",
              "bg-clip-text text-transparent",
              "animate-in fade-in slide-in-from-bottom-4 duration-700"
            )}
            style={{ 
              backgroundImage: 'linear-gradient(to right, #22c55e, #22c55e, #ef4444)',
              animationDelay: '200ms'
            }}
          >
            DartStreak
          </h1>
          
          <div 
            className="flex items-center gap-1 animate-in fade-in duration-500"
            style={{ animationDelay: '500ms' }}
          >
            <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#22c55e', animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#22c55e', animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#22c55e', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

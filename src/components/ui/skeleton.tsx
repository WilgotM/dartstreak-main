import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant for different skeleton shapes */
  variant?: 'default' | 'circular' | 'text' | 'card';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/70",
        variant === 'circular' && "rounded-full",
        variant === 'text' && "h-4 rounded",
        variant === 'card' && "rounded-xl",
        className
      )}
      {...props}
    />
  );
}

/** Skeleton for avatar/profile images */
function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton variant="circular" className={cn("w-10 h-10", className)} {...props} />;
}

/** Skeleton for text lines */
function SkeletonText({ className, lines = 1, ...props }: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 && "w-3/4", // Last line shorter
            className
          )}
          {...props}
        />
      ))}
    </div>
  );
}

/** Skeleton for cards with header and content */
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 rounded-xl bg-card border border-border space-y-4", className)} {...props}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

/** Skeleton for list items */
function SkeletonListItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)} {...props}>
      <SkeletonAvatar className="w-12 h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
  );
}

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonCard, SkeletonListItem };

import { cn } from "@/lib/utils";

interface CountryFlagBadgeProps {
  countryCode?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export default function CountryFlagBadge({ countryCode, className, size = "sm" }: CountryFlagBadgeProps) {
  if (!countryCode) return null;

  const normalizedCode = countryCode.toLowerCase();
  const dimensions = size === "md" ? "h-5 w-7" : "h-4 w-6";

  return (
    <img
      src={`https://flagcdn.com/${normalizedCode}.svg`}
      alt={`${countryCode.toUpperCase()} flag`}
      loading="lazy"
      className={cn("rounded-[2px] object-cover ring-1 ring-white/20", dimensions, className)}
      onError={(event) => {
        (event.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

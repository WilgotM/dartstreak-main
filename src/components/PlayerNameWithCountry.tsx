import CountryFlagBadge from "@/components/CountryFlagBadge";
import { getCountryName } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PlayerNameWithCountryProps {
  displayName: string;
  countryCode?: string | null;
  className?: string;
  textClassName?: string;
  flagSize?: "sm" | "md";
}

export default function PlayerNameWithCountry({
  displayName,
  countryCode,
  className,
  textClassName,
  flagSize = "sm",
}: PlayerNameWithCountryProps) {
  const { i18n } = useTranslation();

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)}>
      <CountryFlagBadge countryCode={countryCode} size={flagSize} />
      <span className={cn("truncate", textClassName)}>
        {displayName}
      </span>
      {countryCode && (
        <span className="sr-only">{getCountryName(countryCode, i18n.language)}</span>
      )}
    </span>
  );
}

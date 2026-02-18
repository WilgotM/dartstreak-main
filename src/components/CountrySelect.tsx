import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCountryOptions } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function CountrySelect({ value, onChange, id, disabled, className }: CountrySelectProps) {
  const { i18n, t } = useTranslation();
  const options = useMemo(() => getCountryOptions(i18n.language), [i18n.language]);

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <option value="">{t("profile.selectCountry")}</option>
      {options.map((country) => (
        <option key={country.code} value={country.code}>
          {country.label}
        </option>
      ))}
    </select>
  );
}

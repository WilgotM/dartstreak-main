import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCountryOptions } from "@/lib/countries";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={t("profile.selectCountry")} />
      </SelectTrigger>
      <SelectContent className="z-[220] max-h-[320px]">
        {options.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

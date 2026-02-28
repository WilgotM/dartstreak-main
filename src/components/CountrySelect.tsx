import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { getCountryOptions } from "@/lib/countries";
import { cn } from "@/lib/utils";
import CountryFlagBadge from "@/components/CountryFlagBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  itemClassName?: string;
}

export default function CountrySelect({
  value,
  onChange,
  id,
  disabled,
  className,
  contentClassName,
  itemClassName,
}: CountrySelectProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => getCountryOptions(i18n.language), [i18n.language]);
  const selectedCountry = useMemo(
    () => options.find((country) => country.code === value.toUpperCase()),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 [&>span]:min-w-0 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {selectedCountry ? (
            <span className="flex min-w-0 items-center gap-2">
              <CountryFlagBadge countryCode={selectedCountry.code} className="h-4 w-6 shrink-0" />
              <span className="truncate">{selectedCountry.label}</span>
            </span>
          ) : (
            <span className="text-[#FAF8F5]/55">{t("profile.selectCountry")}</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("z-[220] w-[var(--radix-popover-trigger-width)] p-0", contentClassName)} align="start">
        <Command className="bg-transparent text-inherit">
          <CommandInput placeholder={t("profile.searchCountry")} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{t("profile.noCountriesFound")}</CommandEmpty>
            {options.map((country) => (
              <CommandItem
                key={country.code}
                value={`${country.label} ${country.code}`}
                onSelect={() => {
                  onChange(country.code);
                  setOpen(false);
                }}
                className={cn("gap-2", itemClassName)}
              >
                <CountryFlagBadge countryCode={country.code} className="h-4 w-6 shrink-0" />
                <span className="flex-1 truncate">{country.label}</span>
                <Check className={cn("h-4 w-4", country.code === value.toUpperCase() ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

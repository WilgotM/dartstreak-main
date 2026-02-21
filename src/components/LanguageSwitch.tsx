import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_LANGUAGES, resolveAppLanguage } from "@/i18n/languages";

export function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const activeLanguage = resolveAppLanguage(i18n.resolvedLanguage || i18n.language);

  const handleChange = (code: string) => {
    void i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-border/80 bg-background/70 px-3 font-semibold uppercase tracking-wide"
          aria-label={t("common.language")}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs">{activeLanguage.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={activeLanguage.code} onValueChange={handleChange}>
          {APP_LANGUAGES.map((language) => (
            <DropdownMenuRadioItem
              key={language.code}
              value={language.code}
              className="flex items-center justify-between"
            >
              <span>{language.nativeName}</span>
              <span className="text-xs text-muted-foreground uppercase">{language.code}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function LanguageSwitch() {
  const { i18n } = useTranslation();
  
  const isSwedish = i18n.language === "sv" || i18n.language.startsWith("sv-");
  
  const handleChange = (checked: boolean) => {
    i18n.changeLanguage(checked ? "sv" : "en");
  };
  
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-switch" className="text-sm text-muted-foreground cursor-pointer">
        EN
      </Label>
      <Switch
        id="language-switch"
        checked={isSwedish}
        onCheckedChange={handleChange}
        aria-label="Switch language"
      />
      <Label htmlFor="language-switch" className="text-sm text-muted-foreground cursor-pointer">
        SV
      </Label>
    </div>
  );
}

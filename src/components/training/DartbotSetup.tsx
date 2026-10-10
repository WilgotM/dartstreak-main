import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Users } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DARTBOT_LEVELS } from "@/lib/trainingDartbot";

interface DartbotSetupProps {
  enabled: boolean;
  levelId: number;
  onEnabledChange: (enabled: boolean) => void;
  onLevelChange: (levelId: number) => void;
}

export default function DartbotSetup({ enabled, levelId, onEnabledChange, onLevelChange }: DartbotSetupProps) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <fieldset className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 mb-4">
      <legend className="px-2 text-sm font-semibold">{t("trainingDartbot.opponent")}</legend>
      <ToggleGroup type="single" variant="outline" value={enabled ? "bot" : "local"}
        onValueChange={(value) => { if (value) onEnabledChange(value === "bot"); }}
        className="justify-start flex-wrap" aria-label={t("trainingDartbot.opponent")}>
        <ToggleGroupItem value="local" className="gap-2"><Users className="size-4" />{t("trainingDartbot.localPlayers")}</ToggleGroupItem>
        <ToggleGroupItem value="bot" className="gap-2"><Bot className="size-4" />{t("trainingDartbot.playBot")}</ToggleGroupItem>
      </ToggleGroup>
      {enabled && (
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="text-sm font-medium">{t("trainingDartbot.difficulty")}</label>
          <Select value={String(levelId)} onValueChange={(value) => onLevelChange(Number(value))}>
            <SelectTrigger id={id} aria-describedby={`${id}-hint`}><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              {DARTBOT_LEVELS.map((level) => (
                <SelectItem key={level.id} value={String(level.id)}>
                  {t("trainingDartbot.levelAverage", { level: level.id, average: level.average })}
                </SelectItem>
              ))}
            </SelectGroup></SelectContent>
          </Select>
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">{t("trainingDartbot.averageExplanation")}</p>
        </div>
      )}
    </fieldset>
  );
}

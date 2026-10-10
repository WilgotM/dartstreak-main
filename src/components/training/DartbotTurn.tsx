import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type DartbotLevel } from "@/lib/trainingDartbot";

interface DartbotTurnProps {
  level: DartbotLevel;
  darts?: { label: string; score: number }[];
  status?: string;
}

export default function DartbotTurn({ level, darts, status }: DartbotTurnProps) {
  const { t } = useTranslation();
  return (
    <section className="relative flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold"><Bot className="size-5 text-primary" />{t("trainingDartbot.name")}</p>
      <p className="text-xs text-muted-foreground">{t("trainingDartbot.levelAverage", { level: level.id, average: level.average })}</p>
      <p className="text-sm">{status ?? t("trainingDartbot.throwing")}</p>
      {darts && <ol className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((index) => <li key={index} className="flex flex-col items-center gap-1 rounded-lg bg-background/60 p-2">
          <span className="text-xs text-muted-foreground">{t("trainingDartbot.dart", { index: index + 1 })}</span>
          <span className="font-mono font-semibold">{darts[index]?.label === "MISS" ? t("trainingDartbot.miss") : darts[index]?.label ?? "–"}</span>
        </li>)}
      </ol>}
    </section>
  );
}

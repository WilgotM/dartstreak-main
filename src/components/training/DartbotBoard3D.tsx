import { lazy, Suspense } from "react";
import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DartboardSvg } from "@/components/training/DartboardSvg";
import { cn } from "@/lib/utils";
import type { DartbotLevel, DartbotThrow } from "@/lib/trainingDartbot";

const NO_DANGER = new Set<number>();
const DartbotBoardScene = lazy(() => import("@/components/training/DartbotBoardScene").catch(() => ({ default: BoardFallback })));

function BoardFallback({ darts, dangerNumbers, color }: { darts: DartbotThrow[]; dangerNumbers: Set<number>; color: string }) {
  return <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-6"><DartboardSvg dangerNumbers={dangerNumbers} markers={darts.map((dart, index) => ({ x: dart.x, y: dart.y, color, label: String(index + 1) }))} /></div>;
}

interface DartbotBoard3DProps {
  darts: DartbotThrow[];
  level: DartbotLevel;
  color: string;
  active: boolean;
  dangerNumbers?: Set<number>;
  framed?: boolean;
  showScores?: boolean;
  className?: string;
}

export default function DartbotBoard3D({ darts, level, color, active, dangerNumbers = NO_DANGER, framed = true, showScores = true, className }: DartbotBoard3DProps) {
  const { t } = useTranslation();
  return (
    <figure aria-label={t("trainingDartbot.throwView")} className={cn("min-w-0 space-y-3", framed && "glass-card rounded-2xl border border-white/10 p-4 sm:p-5", className)}>
      <figcaption className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4 shrink-0 text-primary" />{t("trainingDartbot.throwView")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("trainingDartbot.levelAverage", { level: level.id, average: level.average })}</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-widest text-foreground/70">3D</span>
      </figcaption>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/5 bg-[radial-gradient(ellipse_at_65%_25%,#263244_0%,#11151e_45%,#080a10_100%)]">
        <Suspense fallback={<BoardFallback darts={darts} dangerNumbers={dangerNumbers} color={color} />}>
          <DartbotBoardScene darts={darts} dangerNumbers={dangerNumbers} color={color} />
        </Suspense>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/60 backdrop-blur-sm">{t("trainingDartbot.sideView")}</p>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("size-1.5 shrink-0 rounded-full", active ? "animate-pulse bg-primary motion-reduce:animate-none" : "bg-white/30")} />
        {active ? t("trainingDartbot.throwing") : darts.length ? t("trainingDartbot.lastThrow") : t("trainingDartbot.ready")}
      </p>
      {showScores && <ol className="grid grid-cols-3 gap-2" aria-live="polite">
        {[0, 1, 2].map((index) => <li key={index} className="rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">{t("trainingDartbot.dart", { index: index + 1 })}</p>
          <p className="mt-1 font-mono text-sm font-semibold">{darts[index]?.score === 0 ? t("trainingDartbot.miss") : darts[index]?.label ?? "–"}</p>
        </li>)}
      </ol>}
    </figure>
  );
}

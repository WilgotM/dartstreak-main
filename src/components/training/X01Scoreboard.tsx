import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { x01Average, type X01Match } from "@/lib/x01Match";

export default function X01Scoreboard({ match, playerName, paused }: { match: X01Match; playerName: string; paused: boolean }) {
  const { t } = useTranslation();
  const finishLabels = { straight: t("x01.finish.straight"), double: t("x01.finish.double"), master: t("x01.finish.master") };
  const status = paused ? t("x01.paused") : match.phase === "matchEnd" ? t("x01.matchOver") : match.phase === "legEnd" ? t("x01.legOver") :
    match.bust ? t("x01.bust") : match.current === "bot" ? t(match.phase === "visitEnd" ? "trainingDartbot.lastThrow" : "trainingDartbot.throwing") : t("x01.yourTurn");
  return <section className="x01-scoreboard" aria-label={t("x01.scoreboard")}>
    <div className="x01-scoreboard-brand"><span><i>dart</i>streak</span><strong>X01</strong></div>
    <div className="x01-scoreboard-header">
      <span>{match.settings.startScore} · {finishLabels[match.settings.outRule]}</span>
      {match.settings.format === "sets" && <span>{t("x01.sets")}</span>}<span>{t("x01.legs")}</span><span className="sr-only">{t("x01.remaining")}</span>
    </div>
    {(["human", "bot"] as const).map(player => {
      const side = match.players[player];
      return <div key={player} className={cn("x01-scoreboard-row", match.current === player && "is-active", match.settings.format === "sets" && "has-sets")}>
        <div className="x01-scoreboard-name"><span className="x01-turn-arrow" aria-hidden="true" />
          <strong>{player === "human" ? playerName : t("trainingDartbot.name")}</strong>
          <small>{t("x01.averageShort")} {x01Average(side)}{!side.opened && <em>{t("x01.notIn")}</em>}</small>
        </div>
        {match.settings.format === "sets" && <span className="x01-scoreboard-counter" aria-label={t("x01.sets")}>{side.sets}</span>}
        <span className="x01-scoreboard-counter" aria-label={t("x01.legs")}>{side.legs}</span>
        <span className="x01-scoreboard-score" aria-label={t("x01.remaining")}>{side.remaining}</span>
      </div>;
    })}
    <div className="x01-scoreboard-footer" aria-live="polite" aria-atomic="true"><strong>{status}</strong>
      <div className="x01-scoreboard-darts">{match.visitInput === "total" ? <span className="x01-reported-total">{match.visitScore}</span> : [0, 1, 2].map(index => <span key={index}>{match.darts[index]?.score === 0 ? "–" : match.darts[index]?.label === "BULL" ? t("x01.bull") : match.darts[index]?.label ?? "·"}</span>)}</div>
    </div>
    <div className="x01-match-format"><span>{t("x01.legNumber", { number: match.legNumber })}</span><span>{t("x01.firstTo", { count: match.settings.format === "sets" ? match.settings.setsToWin : match.settings.legsToWin })} {t(match.settings.format === "sets" ? "x01.sets" : "x01.legs")}</span></div>
  </section>;
}

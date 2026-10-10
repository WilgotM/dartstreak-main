import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Undo2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { findX01Visit, getX01Checkout, makeX01Dart, type X01Dart, type X01Match } from "@/lib/x01Match";

export default function X01ScoreInput({ match, disabled, canUndo, onDarts, onBust, onUndo, onAdvance }: {
  match: X01Match; disabled: boolean; canUndo: boolean; onDarts: (darts: X01Dart[], total?: boolean) => void;
  onBust: () => void; onUndo: () => void; onAdvance: () => void;
}) {
  const { t } = useTranslation();
  const entryLabels = { straight: t("x01.entry.straight"), double: t("x01.entry.double"), master: t("x01.entry.master") };
  const [mode, setMode] = useState("visit");
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [total, setTotal] = useState("");
  const [dartCount, setDartCount] = useState(3);
  const [error, setError] = useState(false);
  const side = match.players.human;
  const complete = match.phase !== "throwing";
  const route = side.opened ? getX01Checkout(side.remaining, 3 - match.darts.length, match.settings.outRule) : null;
  const submit = (value: string) => {
    const number = /^\d+$/.test(value) ? Number(value) : NaN;
    const count = number === side.remaining ? dartCount : 3;
    const darts = findX01Visit(match, number, count);
    if (!darts) { setError(true); return; }
    setError(false); setTotal(""); setDartCount(3); onDarts(darts, true);
  };
  return <section className="x01-score-input" aria-labelledby="x01-visit-title" hidden={match.phase === "matchEnd"}>
    <div className="x01-input-heading"><h2 id="x01-visit-title">{t("x01.yourVisit")}</h2><strong>{match.bust ? t("x01.bust") : match.visitScore}</strong></div>
    {match.settings.hints && !complete && <p className="x01-checkout-hint">{!side.opened ? t("x01.entryNeeded", { rule: entryLabels[match.settings.inRule] }) : route ? `${t("x01.checkout")}: ${route.map(dart => dart.label === "BULL" ? t("x01.bull") : dart.label).join(" → ")}` : t("x01.dartsLeft", { count: 3 - match.darts.length })}</p>}
    {!complete && <>
      <ToggleGroup type="single" value={mode} onValueChange={value => { if (value) { setMode(value); setError(false); } }} disabled={disabled || match.darts.length > 0} className="x01-input-mode" aria-label={t("x01.inputMode")}>
        <ToggleGroupItem value="visit">{t("x01.wholeVisit")}</ToggleGroupItem><ToggleGroupItem value="dart">{t("x01.perDart")}</ToggleGroupItem>
      </ToggleGroup>
      {mode === "visit" ? <form onSubmit={event => { event.preventDefault(); submit(total); }} className="x01-total-form">
        <label className="sr-only" htmlFor="x01-visit-score">{t("x01.visitScore")}</label>
        <div className="x01-total-row"><Input id="x01-visit-score" type="text" inputMode="numeric" autoComplete="off" maxLength={3} value={total}
          placeholder="0–180" disabled={disabled} aria-invalid={error} aria-describedby={error ? "x01-input-error" : undefined}
          onChange={event => { setTotal(event.target.value.replace(/\D/g, "")); setError(false); }} />
          <Button type="submit" className="x01-primary" disabled={disabled || total === ""}>{t("x01.record")}<ArrowRight data-icon="inline-end" /></Button></div>
        {Number(total) === side.remaining && total !== "" && <fieldset className="x01-checkout-count"><legend>{t("x01.checkoutDarts")}</legend>
          <ToggleGroup type="single" value={String(dartCount)} onValueChange={value => { if (value) setDartCount(Number(value)); }} disabled={disabled} aria-label={t("x01.checkoutDarts")}>
            {[1, 2, 3].map(count => <ToggleGroupItem key={count} value={String(count)}>{count}</ToggleGroupItem>)}
          </ToggleGroup>
        </fieldset>}
        <div className="x01-quick-scores">{[0, 26, 60, 85, 100, 140, 180].map(score => <Button key={score} type="button" variant="outline" disabled={disabled} onClick={() => { if (score === side.remaining) { setTotal(String(score)); setError(false); } else submit(String(score)); }}>{score}</Button>)}</div>
        {error && <p id="x01-input-error" role="alert" className="x01-input-error">{t("x01.invalidVisit")}</p>}
      </form> : <div>
        <ToggleGroup type="single" value={String(multiplier)} onValueChange={value => { if (value) setMultiplier(Number(value) as 1 | 2 | 3); }} disabled={disabled} className="x01-multipliers" aria-label={t("x01.multiplier")}>
          <ToggleGroupItem value="1">{t("x01.single")}</ToggleGroupItem><ToggleGroupItem value="2">{t("x01.double")}</ToggleGroupItem><ToggleGroupItem value="3">{t("x01.triple")}</ToggleGroupItem>
        </ToggleGroup>
        <div className="x01-number-grid">{Array.from({ length: 20 }, (_, index) => index + 1).map(value => <Button key={value} type="button" variant="outline" disabled={disabled} onClick={() => { onDarts([makeX01Dart(value, multiplier)]); }}>{value}</Button>)}</div>
        <div className="x01-special-scores">{[0, 25, 50].map(value => <Button key={value} variant="outline" disabled={disabled} onClick={() => onDarts([makeX01Dart(value)])}>{value === 0 ? t("trainingDartbot.miss") : value === 50 ? t("x01.bull") : "25"}</Button>)}</div>
        <ol className="x01-human-darts" aria-live="polite">{[0, 1, 2].map(index => <li key={index}><small>{t("trainingDartbot.dart", { index: index + 1 })}</small><strong>{match.darts[index]?.label === "MISS" ? t("trainingDartbot.miss") : match.darts[index]?.label === "BULL" ? t("x01.bull") : match.darts[index]?.label ?? "–"}</strong></li>)}</ol>
      </div>}
    </>}
    {complete && <p className="x01-visit-summary">{match.bust ? t("x01.bustDescription") : match.phase === "visitEnd" ? t("x01.visitRecorded", { score: match.visitScore }) : t("x01.checkoutRecorded", { score: match.visitStart })}</p>}
    <div className="x01-input-actions"><Button type="button" variant="ghost" onClick={onUndo} disabled={disabled || !canUndo}><Undo2 data-icon="inline-start" />{t("x01.undo")}</Button>
      {complete ? match.phase !== "matchEnd" && <Button className="x01-primary" onClick={onAdvance} disabled={disabled}>{t(match.phase === "legEnd" ? "x01.nextLeg" : "x01.botTurn")}<ArrowRight data-icon="inline-end" /></Button> :
        <Button variant="ghost" onClick={onBust} disabled={disabled}>{t("x01.bust")}</Button>}
    </div>
  </section>;
}

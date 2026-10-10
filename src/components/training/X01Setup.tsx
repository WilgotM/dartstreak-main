import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DARTBOT_LEVELS } from "@/lib/trainingDartbot";
import type { X01Settings } from "@/lib/x01Match";

function SettingSelect({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  return <label className="x01-field" htmlFor={id}>
    <span>{label}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map(option => <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  </label>;
}
const OPTION_KEYS: Record<string, Record<string, string>> = {
  entry: { straight: "x01.entry.straight", double: "x01.entry.double", master: "x01.entry.master" },
  finish: { straight: "x01.finish.straight", double: "x01.finish.double", master: "x01.finish.master" },
  formats: { legs: "x01.formats.legs", sets: "x01.formats.sets" },
  starters: { human: "x01.starters.human", bot: "x01.starters.bot", random: "x01.starters.random", bull: "x01.starters.bull" },
  nextStarters: { alternate: "x01.nextStarters.alternate", winner: "x01.nextStarters.winner", loser: "x01.nextStarters.loser" },
  paces: { match: "x01.paces.match", quick: "x01.paces.quick", relaxed: "x01.paces.relaxed" },
};
const STARTING_SCORES = [101, 201, 301, 501, 701, 901, 1001];
export default function X01Setup({ settings, onChange, onStart, playerName, onNameChange }: {
  settings: X01Settings; onChange: (settings: X01Settings) => void; onStart: () => void;
  playerName: string; onNameChange: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(!STARTING_SCORES.includes(settings.startScore));
  const [customScore, setCustomScore] = useState(String(settings.startScore));
  const change = <K extends keyof X01Settings>(key: K, value: X01Settings[K]) => onChange({ ...settings, [key]: value });
  const options = (keys: string[], prefix: string) => keys.map(value => ({ value, label: t(OPTION_KEYS[prefix][value]) }));
  const targets = Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: t("x01.firstTo", { count: i + 1 }) }));
  const invalidScore = custom && (!/^\d+$/.test(customScore) || Number(customScore) < 2 || Number(customScore) > 10001);
  const invalidRules = settings.startScore === 3 && settings.inRule !== "straight" &&
    (settings.outRule === "double" || (settings.inRule === "double" && settings.outRule === "master"));
  return <section className="x01-setup" aria-labelledby="x01-setup-title">
    <h1 id="x01-setup-title">{t("x01.setupTitle")}</h1>
    <p className="x01-setup-description">{t("x01.setupDescription")}</p>
    <form onSubmit={event => { event.preventDefault(); if (!invalidScore && !invalidRules) onStart(); }}>
      <fieldset className="x01-settings-grid">
        <legend className="sr-only">{t("x01.matchSettings")}</legend>
        <label className="x01-field" htmlFor="x01-name"><span>{t("x01.playerName")}</span>
          <Input id="x01-name" maxLength={32} value={playerName} onChange={event => onNameChange(event.target.value)} placeholder={t("x01.you")} />
        </label>
        <SettingSelect id="x01-start-score" label={t("x01.startScore")} value={custom ? "custom" : String(settings.startScore)}
          options={[...STARTING_SCORES.map(score => ({ value: String(score), label: String(score) })), { value: "custom", label: t("x01.customScore") }]}
          onChange={value => { setCustom(value === "custom"); if (value !== "custom") change("startScore", Number(value)); }} />
        {custom && <label className="x01-field x01-field-wide" htmlFor="x01-custom-score"><span>{t("x01.customScore")}</span>
          <Input id="x01-custom-score" type="number" inputMode="numeric" min={2} max={10001} value={customScore} aria-invalid={invalidScore} aria-describedby="x01-custom-hint"
            onChange={event => { setCustomScore(event.target.value); change("startScore", Number(event.target.value)); }} />
          <small id="x01-custom-hint">{t("x01.scoreRange")}</small>
        </label>}
        <SettingSelect id="x01-in" label={t("x01.inRule")} value={settings.inRule} options={options(["straight", "double", "master"], "entry")}
          onChange={value => change("inRule", value as X01Settings["inRule"])} />
        <SettingSelect id="x01-out" label={t("x01.outRule")} value={settings.outRule} options={options(["straight", "double", "master"], "finish")}
          onChange={value => change("outRule", value as X01Settings["outRule"])} />
        <SettingSelect id="x01-format" label={t("x01.format")} value={settings.format} options={options(["legs", "sets"], "formats")}
          onChange={value => change("format", value as X01Settings["format"])} />
        <SettingSelect id="x01-legs" label={t(settings.format === "sets" ? "x01.legsPerSet" : "x01.legsToWin")} value={String(settings.legsToWin)} options={targets}
          onChange={value => change("legsToWin", Number(value))} />
        {settings.format === "sets" && <SettingSelect id="x01-sets" label={t("x01.setsToWin")} value={String(settings.setsToWin)} options={targets.slice(0, 7)}
          onChange={value => change("setsToWin", Number(value))} />}
        <SettingSelect id="x01-starter" label={t("x01.starter")} value={settings.starter} options={options(["human", "bot", "random", "bull"], "starters")}
          onChange={value => change("starter", value as X01Settings["starter"])} />
        <SettingSelect id="x01-next-starter" label={t("x01.nextStarter")} value={settings.nextStarter} options={options(["alternate", "winner", "loser"], "nextStarters")}
          onChange={value => change("nextStarter", value as X01Settings["nextStarter"])} />
        <SettingSelect id="x01-level" label={t("trainingDartbot.difficulty")} value={String(settings.levelId)}
          options={DARTBOT_LEVELS.map(level => ({ value: String(level.id), label: t("trainingDartbot.levelAverage", { level: level.id, average: level.average }) }))}
          onChange={value => change("levelId", Number(value))} />
        <SettingSelect id="x01-pace" label={t("x01.pace")} value={settings.pace} options={options(["match", "quick", "relaxed"], "paces")}
          onChange={value => change("pace", value as X01Settings["pace"])} />
      </fieldset>
      {invalidRules && <p role="alert" className="x01-input-error">{t("x01.invalidRules")}</p>}
      <details className="x01-broadcast-options">
        <summary>{t("x01.broadcastSettings")}<ChevronDown aria-hidden="true" /></summary>
        <p>{t("x01.rulesHelp")}</p>
        <div className="x01-switch-row"><Label htmlFor="x01-sound">{t("x01.sound")}</Label><Switch id="x01-sound" checked={settings.sound} onCheckedChange={value => change("sound", value)} /></div>
        <div className="x01-switch-row"><Label htmlFor="x01-hints">{t("x01.hints")}</Label><Switch id="x01-hints" checked={settings.hints} onCheckedChange={value => change("hints", value)} /></div>
        <p>{t("trainingDartbot.averageExplanation")}</p>
      </details>
      <Button type="submit" className="x01-primary x01-start-button" disabled={invalidScore || invalidRules}>{t("x01.startMatch")}<ArrowRight data-icon="inline-end" /></Button>
      <p className="x01-physical-hint">{t("x01.physicalBoard")}</p>
    </form>
  </section>;
}

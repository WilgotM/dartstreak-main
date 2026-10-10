import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Maximize, Minimize, Pause, Play, Volume2, VolumeX, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DartboardSvg, type DartboardClickPoint } from "@/components/training/DartboardSvg";
import X01Setup from "@/components/training/X01Setup";
import X01Scoreboard from "@/components/training/X01Scoreboard";
import X01ScoreInput from "@/components/training/X01ScoreInput";
import useX01Match, { X01_FLIGHT_MS } from "@/hooks/useX01Match";
import useDartsAudio from "@/hooks/useDartsAudio";
import { DEFAULT_X01_SETTINGS, x01Average, type X01Player } from "@/lib/x01Match";
import { getDartbotLevel, simulateDartbotBull, type DartbotThrow } from "@/lib/trainingDartbot";
import { toast } from "sonner";

const DartbotBoardScene = lazy(() => import("@/components/training/DartbotBoardScene"));
const EMPTY_DANGER = new Set<number>();
const EMPTY_DARTS: DartbotThrow[] = [];

export default function X01Arena({ initialPlayerName = "" }: { initialPlayerName?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const host = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState(DEFAULT_X01_SETTINGS);
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [sound, setSound] = useState(settings.sound);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [leave, setLeave] = useState(false);
  const leavePause = useRef(false);
  const [bull, setBull] = useState<{ human: DartboardClickPoint | null; bot: DartbotThrow | null } | null>(null);
  const game = useX01Match(() => audio.hit());
  const audio = useDartsAudio(sound && !game.paused);
  const { hit, cheer } = audio;
  const match = game.match;
  const name = playerName.trim() || t("x01.you");
  const statLabels = { legsWon: t("x01.stats.legsWon"), bestVisit: t("x01.stats.bestVisit"), highestCheckout: t("x01.stats.highestCheckout"), oneEighties: t("x01.stats.oneEighties") };
  const active = Boolean(match && match.phase !== "matchEnd") || Boolean(bull);
  const lastCheer = useRef<string | null>(null);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
  useEffect(() => {
    if (!match) { lastCheer.current = null; return; }
    if ((match.phase === "legEnd" || match.phase === "matchEnd") || (match.phase === "visitEnd" && match.visitScore === 180)) {
      const key = `${match.legNumber}:${match.current}:${match.players[match.current].stats.visits}`;
      if (key !== lastCheer.current) { lastCheer.current = key; cheer(); }
    }
  }, [cheer, match]);
  useEffect(() => {
    if (!bull?.human || bull.bot || game.paused) return;
    const timer = window.setTimeout(() => {
      const dart = simulateDartbotBull(getDartbotLevel(settings.levelId));
      setBull(previous => previous ? { ...previous, bot: dart } : null);
      hit();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [hit, bull, game.paused, settings.levelId]);

  const start = () => {
    setSound(settings.sound);
    // Web Audio is unlocked by the actual Start button gesture.
    if (settings.sound) audio.enable();
    if (settings.starter === "bull") { game.reset(); setBull({ human: null, bot: null }); return; }
    const starter: X01Player = settings.starter === "random" ? Math.random() < 0.5 ? "human" : "bot" : settings.starter;
    game.start(settings, starter);
  };
  const bullDistance = (distance: number) => distance <= 6.35 ? 0 : distance <= 15.9 ? 1 : distance;
  const bullTie = Boolean(bull?.human && bull?.bot && Math.abs(bullDistance(bull.human.distance) - bullDistance(bull.bot.distance)) < 0.1);
  const bullWinner: X01Player = bull?.human && bull?.bot && bullDistance(bull.human.distance) < bullDistance(bull.bot.distance) ? "human" : "bot";
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen(); else if (host.current?.requestFullscreen) await host.current.requestFullscreen(); else throw new Error("unsupported");
    } catch { toast.info(t("x01.fullscreenUnavailable")); }
  };
  const askLeave = async () => {
    // Radix renders its confirmation in the document portal, so leave native
    // fullscreen before opening it to keep the controls visible and usable.
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    if (active) { leavePause.current = game.paused; game.setPaused(true); setLeave(true); }
    else navigate("/training");
  };
  const dismissLeave = (open: boolean) => { setLeave(open); if (!open) game.setPaused(leavePause.current); };
  return <div ref={host} className="x01-arena" data-mode={match ? "match" : bull ? "bull" : "setup"}>
    <div className="x01-board-stage" aria-label={t("x01.broadcastBoard")}>
      <Suspense fallback={<div className="x01-board-loading"><DartboardSvg dangerNumbers={EMPTY_DANGER} /></div>}>
        <DartbotBoardScene darts={bull?.bot ? [bull.bot] : match ? game.botDarts : EMPTY_DARTS} dangerNumbers={EMPTY_DANGER} color="#145cc7" broadcast flightMs={X01_FLIGHT_MS} />
      </Suspense>
    </div>
    <header className="x01-toolbar">
      <div className="x01-toolbar-brand"><Button size="icon" variant="outline" onClick={askLeave} aria-label={t("common.back")}><ArrowLeft /></Button>
        <span className="x01-wordmark"><i>dart</i>streak</span><span className="x01-mode-mark">X01</span></div>
      <div className="x01-toolbar-actions">
        {match && <Button size="icon" variant="outline" aria-label={t(game.paused ? "x01.resume" : "x01.pause")} onClick={() => { game.setPaused(!game.paused); if (game.paused) audio.enable(); }}>{game.paused ? <Play /> : <Pause />}</Button>}
        <Button size="icon" variant="outline" aria-label={t(sound ? "x01.mute" : "x01.unmute")} aria-pressed={sound} onClick={() => { setSound(!sound); if (!sound) audio.enable(); }}>{sound ? <Volume2 /> : <VolumeX />}</Button>
        <Button size="icon" variant="outline" aria-label={t(fullscreen ? "x01.exitFullscreen" : "x01.fullscreen")} onClick={toggleFullscreen}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
      </div>
    </header>
    {!match && !bull && <X01Setup settings={settings} onChange={value => { setSettings(value); setSound(value.sound); }} onStart={start} playerName={playerName} onNameChange={setPlayerName} />}
    {bull && <section className="x01-bull-panel">
      <h1>{t("x01.bullOff")}</h1><p>{t("x01.bullInstructions")}</p>
      <DartboardSvg dangerNumbers={EMPTY_DANGER} onBoardClick={!bull.human && !game.paused ? point => setBull({ human: point, bot: null }) : undefined}
        markers={[...(bull.human ? [{ ...bull.human, color: "#d92335", label: "1" }] : []), ...(bull.bot ? [{ ...bull.bot, color: "#145cc7", label: "2" }] : [])]} />
      <p aria-live="polite">{bull.bot ? bullTie ? t("x01.bullTie") : t("x01.startsResult", { name: bullWinner === "human" ? name : t("trainingDartbot.name") }) : bull.human ? t("trainingDartbot.throwing") : t("x01.markBull")}</p>
      {bull.bot && <Button className="x01-primary" onClick={() => {
        if (bullTie) { setBull({ human: null, bot: null }); return; }
        game.start(settings, bullWinner); setBull(null);
      }}>{t(bullTie ? "x01.throwAgain" : "x01.startMatch")}</Button>}
    </section>}
    {match && <>
      <X01Scoreboard match={match} playerName={name} paused={game.paused} />
      {match.current === "human" && <X01ScoreInput key={`${match.legNumber}:${match.players.human.stats.visits - (match.phase === "throwing" ? 0 : 1)}`}
        match={match} disabled={game.paused} canUndo={game.canUndo} onDarts={game.humanDarts} onBust={game.bust} onUndo={game.undo} onAdvance={game.advance} />}
      {match.current === "bot" && match.phase === "legEnd" && <div className="x01-leg-result"><Trophy aria-hidden="true" /><h2>{t("x01.legWinner", { name: t("trainingDartbot.name") })}</h2>
        <Button className="x01-primary" onClick={game.advance} disabled={game.paused}>{t("x01.nextLeg")}</Button></div>}
      {match.current === "bot" && match.phase === "throwing" && <div className="x01-bot-visit" aria-live="polite"><span>{t("trainingDartbot.name")}</span><strong>{match.visitScore}</strong><small>{t("x01.visitScore")}</small></div>}
      {game.paused && !leave && <div className="x01-pause-panel"><h2>{t("x01.paused")}</h2><p>{t("x01.pauseDescription")}</p><Button className="x01-primary" onClick={() => { game.setPaused(false); audio.enable(); }}>{t("x01.resume")}</Button></div>}
      {match.phase === "matchEnd" && <section className="x01-match-result" aria-labelledby="x01-result-title">
        <Trophy aria-hidden="true" /><h1 id="x01-result-title">{t("x01.matchWinner", { name: match.winner === "human" ? name : t("trainingDartbot.name") })}</h1>
        <table><caption className="sr-only">{t("x01.matchStats")}</caption><thead><tr><th /><th>{name}</th><th>{t("trainingDartbot.name")}</th></tr></thead><tbody>
          <tr><th>{t("x01.average")}</th><td>{x01Average(match.players.human)}</td><td>{x01Average(match.players.bot)}</td></tr>
          {(["legsWon", "bestVisit", "highestCheckout", "oneEighties"] as const).map(stat => <tr key={stat}><th>{statLabels[stat]}</th><td>{match.players.human.stats[stat]}</td><td>{match.players.bot.stats[stat]}</td></tr>)}
        </tbody></table>
        <div className="x01-result-actions"><Button className="x01-primary" onClick={start}>{t("x01.rematch")}</Button><Button variant="outline" onClick={game.reset}>{t("x01.changeSettings")}</Button>
          {match.current === "human" && game.canUndo && <Button variant="ghost" onClick={game.undo}>{t("x01.undo")}</Button>}</div>
      </section>}
    </>}
    <AlertDialog open={leave} onOpenChange={dismissLeave}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("x01.leaveTitle")}</AlertDialogTitle>
      <AlertDialogDescription>{t("x01.leaveDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter>
        <AlertDialogCancel>{t("x01.keepPlaying")}</AlertDialogCancel><AlertDialogAction onClick={() => { game.reset(); navigate("/training"); }}>{t("x01.leaveMatch")}</AlertDialogAction>
      </AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

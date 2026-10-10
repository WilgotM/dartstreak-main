import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { dartbotTurnForm, getDartbotLevel, simulateDartbotThrow, type DartbotThrow } from "@/lib/trainingDartbot";
import { advanceX01Match, bustX01Visit, chooseX01DartbotAim, createX01Match, throwX01Dart,
  type X01Dart, type X01Match, type X01Player, type X01Settings } from "@/lib/x01Match";

export const X01_FLIGHT_MS = 260;
export const getX01ThrowDelay = (pace: X01Settings["pace"], first: boolean, checkout: boolean, random = Math.random): number => {
  const base = pace === "quick" ? 750 : pace === "relaxed" ? 2600 : 1700;
  return base + (first ? 700 : 0) + (checkout ? 450 : 0) + random() * 350;
};
interface MatchState { match: X01Match | null; history: X01Match[] }
type MatchAction = { type: "start"; settings: X01Settings; starter: X01Player } | { type: "darts"; darts: X01Dart[]; total: boolean } |
  { type: "botDart"; dart: X01Dart; expected: X01Match } | { type: "bust" | "undo" | "advance" | "reset" };
const initialState: MatchState = { match: null, history: [] };
const reducer = (state: MatchState, action: MatchAction): MatchState => {
  if (action.type === "start") return { match: createX01Match(action.settings, action.starter), history: [] };
  if (action.type === "reset") return initialState;
  const previous = state.match;
  if (!previous) return state;
  if (action.type === "advance") return { match: advanceX01Match(previous), history: [] };
  if (action.type === "botDart") return previous === action.expected ? { match: throwX01Dart(previous, action.dart), history: [] } : state;
  if (previous.current !== "human") return state;
  if (action.type === "undo") {
    const match = state.history[state.history.length - 1];
    return match ? { match, history: state.history.slice(0, -1) } : state;
  }
  if (previous.phase !== "throwing") return state;
  if (action.type === "bust") return { match: bustX01Visit(previous), history: [...state.history, previous] };
  if (action.type === "darts") return { match: action.darts.reduce(throwX01Dart, { ...previous, visitInput: action.total ? "total" : "darts" }), history: [...state.history, previous] };
  return state;
};
export default function useX01Match(onImpact?: (dart: DartbotThrow) => void) {
  const [{ match, history }, dispatch] = useReducer(reducer, initialState);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [botDarts, setBotDarts] = useState<DartbotThrow[]>([]);
  const form = useRef(1);
  const pending = useRef<DartbotThrow | null>(null);
  const impact = useRef(onImpact);
  useEffect(() => { impact.current = onImpact; }, [onImpact]);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const start = useCallback((settings: X01Settings, starter: X01Player) => {
    pending.current = null; setBotDarts([]); setPaused(false);
    form.current = dartbotTurnForm();
    dispatch({ type: "start", settings, starter });
  }, []);
  const humanDarts = useCallback((darts: X01Dart[], total = false) => {
    if (paused || hidden) return;
    dispatch({ type: "darts", darts, total });
  }, [hidden, paused]);
  const bust = useCallback(() => {
    if (paused || hidden) return;
    dispatch({ type: "bust" });
  }, [hidden, paused]);
  const undo = useCallback(() => {
    if (paused || hidden) return;
    dispatch({ type: "undo" });
  }, [hidden, paused]);
  const advance = useCallback(() => {
    pending.current = null;
    if (match && (advanceX01Match(match).current === "bot" || match.phase === "legEnd")) setBotDarts([]);
    form.current = dartbotTurnForm();
    dispatch({ type: "advance" });
  }, [match]);
  const reset = useCallback(() => {
    dispatch({ type: "reset" }); setBotDarts([]); setPaused(false); pending.current = null;
  }, []);

  useEffect(() => {
    if (!match || match.current !== "bot" || paused || hidden || match.phase === "legEnd" || match.phase === "matchEnd") return;
    let flightTimer: number | undefined;
    if (match.phase === "visitEnd") {
      const timer = window.setTimeout(advance, match.settings.pace === "quick" ? 1100 : 2300);
      return () => window.clearTimeout(timer);
    }
    const level = getDartbotLevel(match.settings.levelId);
    const delay = pending.current ? 300 : getX01ThrowDelay(match.settings.pace, match.darts.length === 0, match.players.bot.remaining <= 170);
    const timer = window.setTimeout(() => {
      const dart = pending.current ?? simulateDartbotThrow(level, chooseX01DartbotAim(match, level), Math.random, form.current);
      pending.current = dart;
      setBotDarts(previous => [...previous.slice(0, match.darts.length), dart]);
      flightTimer = window.setTimeout(() => {
        pending.current = null;
        impact.current?.(dart);
        dispatch({ type: "botDart", expected: match, dart: {
          score: dart.score, label: dart.label,
          kind: dart.label === "BULL" ? "DB" : dart.label === "25" ? "SB" : dart.score === 0 ? "M" : dart.label[0] as X01Dart["kind"],
        } });
      }, X01_FLIGHT_MS);
    }, delay);
    return () => { window.clearTimeout(timer); window.clearTimeout(flightTimer); };
  }, [advance, hidden, match, paused]);

  return { match, botDarts, paused: paused || hidden, setPaused, start, reset, humanDarts, bust, undo, advance,
    canUndo: Boolean(match?.current === "human" && history.length > 0) };
}

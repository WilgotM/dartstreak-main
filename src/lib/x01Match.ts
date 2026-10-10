import { chooseDartbotRoute, type DartbotAim, type DartbotLevel } from "@/lib/trainingDartbot";
import type { DartKind } from "@/lib/trainingCheckout";

export type X01Player = "human" | "bot";
export type X01Rule = "straight" | "double" | "master";
export interface X01Settings {
  startScore: number;
  inRule: X01Rule;
  outRule: X01Rule;
  format: "legs" | "sets";
  legsToWin: number;
  setsToWin: number;
  starter: X01Player | "random" | "bull";
  nextStarter: "alternate" | "winner" | "loser";
  levelId: number;
  pace: "match" | "quick" | "relaxed";
  sound: boolean;
  hints: boolean;
}
export const DEFAULT_X01_SETTINGS: X01Settings = {
  startScore: 501, inRule: "straight", outRule: "double", format: "legs",
  legsToWin: 3, setsToWin: 3, starter: "human", nextStarter: "alternate",
  levelId: 9, pace: "match", sound: true, hints: true,
};
export interface X01Dart { score: number; label: string; kind: DartKind | "M" }
export const makeX01Dart = (value: number, multiplier: 1 | 2 | 3 = 1): X01Dart => {
  if (value === 0) return { score: 0, label: "MISS", kind: "M" };
  if (value === 25) return { score: 25, label: "25", kind: "SB" };
  if (value === 50) return { score: 50, label: "BULL", kind: "DB" };
  const kind = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  return { score: value * multiplier, label: `${kind}${value}`, kind };
};
const OPTIONS: X01Dart[] = [makeX01Dart(0), ...Array.from({ length: 20 }, (_, i) =>
  [makeX01Dart(i + 1), makeX01Dart(i + 1, 2), makeX01Dart(i + 1, 3)]).flat(), makeX01Dart(25), makeX01Dart(50)];
export const matchesX01Rule = (dart: X01Dart, rule: X01Rule): boolean =>
  dart.score > 0 && (rule === "straight" || dart.kind === "D" || dart.kind === "DB" || (rule === "master" && dart.kind === "T"));
export const otherX01Player = (player: X01Player): X01Player => player === "human" ? "bot" : "human";
export interface X01Stats { points: number; darts: number; visits: number; bestVisit: number; highestCheckout: number; oneEighties: number; legsWon: number }
export interface X01Side { remaining: number; opened: boolean; legs: number; sets: number; stats: X01Stats }
export interface X01Match {
  settings: X01Settings;
  players: Record<X01Player, X01Side>;
  current: X01Player;
  starter: X01Player;
  setStarter: X01Player;
  legNumber: number;
  phase: "throwing" | "visitEnd" | "legEnd" | "matchEnd";
  darts: X01Dart[];
  visitInput: "darts" | "total";
  visitStart: number;
  visitOpened: boolean;
  visitScore: number;
  bust: boolean;
  legWinner: X01Player | null;
  winner: X01Player | null;
  setWon: boolean;
}
const createSide = (settings: X01Settings): X01Side => ({
  remaining: settings.startScore, opened: settings.inRule === "straight", legs: 0, sets: 0,
  stats: { points: 0, darts: 0, visits: 0, bestVisit: 0, highestCheckout: 0, oneEighties: 0, legsWon: 0 },
});
export const createX01Match = (settings: X01Settings, starter: X01Player): X01Match => ({
  settings, players: { human: createSide(settings), bot: createSide(settings) },
  current: starter, starter, setStarter: starter, legNumber: 1, phase: "throwing", darts: [], visitInput: "darts",
  visitStart: settings.startScore, visitOpened: settings.inRule === "straight", visitScore: 0,
  bust: false, legWinner: null, winner: null, setWon: false,
});

// Visit snapshots include entry status: a bust also cancels a double/master-in
// hit made earlier in that same visit. Scores and geometry share the same darts.
export const throwX01Dart = (match: X01Match, dart: X01Dart): X01Match => {
  if (match.phase !== "throwing") return match;
  const side = match.players[match.current];
  const opened = side.opened || matchesX01Rule(dart, match.settings.inRule);
  const counted = opened ? dart.score : 0;
  const remaining = side.remaining - counted;
  const checkout = opened && remaining === 0 && matchesX01Rule(dart, match.settings.outRule);
  const bust = opened && (remaining < 0 || (remaining === 0 && !checkout) || (remaining === 1 && match.settings.outRule !== "straight"));
  const updated: X01Side = { ...side, remaining: bust ? match.visitStart : remaining, opened: bust ? match.visitOpened : opened };
  const darts = [...match.darts, dart];
  const visitScore = bust ? 0 : match.visitScore + counted;
  const done = checkout || bust || darts.length === 3;
  let phase: X01Match["phase"] = done ? "visitEnd" : "throwing";
  let winner: X01Player | null = null;
  let setWon = false;
  if (done) {
    updated.stats = { ...side.stats,
      points: side.stats.points + visitScore,
      // A busted visit consumes all three darts; a checkout uses actual darts.
      darts: side.stats.darts + (checkout ? darts.length : 3),
      visits: side.stats.visits + 1,
      bestVisit: Math.max(side.stats.bestVisit, visitScore),
      oneEighties: side.stats.oneEighties + (visitScore === 180 ? 1 : 0),
      highestCheckout: Math.max(side.stats.highestCheckout, checkout ? match.visitStart : 0),
      legsWon: side.stats.legsWon + (checkout ? 1 : 0),
    };
  }
  if (checkout) {
    updated.legs += 1;
    if (updated.legs >= match.settings.legsToWin) {
      if (match.settings.format === "sets") {
        updated.sets += 1;
        setWon = true;
        if (updated.sets >= match.settings.setsToWin) winner = match.current;
      } else winner = match.current;
    }
    phase = winner ? "matchEnd" : "legEnd";
  }
  return { ...match, players: { ...match.players, [match.current]: updated }, darts, visitScore, bust, phase,
    legWinner: checkout ? match.current : null, winner, setWon };
};
export const bustX01Visit = (match: X01Match): X01Match => {
  if (match.phase !== "throwing") return match;
  const side = match.players[match.current];
  return { ...match, phase: "visitEnd", bust: true, visitScore: 0,
    players: { ...match.players, [match.current]: { ...side, remaining: match.visitStart, opened: match.visitOpened,
      stats: { ...side.stats, darts: side.stats.darts + 3, visits: side.stats.visits + 1 } } } };
};
export const advanceX01Match = (match: X01Match): X01Match => {
  if (match.phase === "throwing" || match.phase === "matchEnd") return match;
  if (match.phase === "visitEnd") {
    const current = otherX01Player(match.current);
    return { ...match, current, phase: "throwing", darts: [], visitInput: "darts", visitScore: 0, bust: false,
      visitStart: match.players[current].remaining, visitOpened: match.players[current].opened };
  }
  const rule = match.settings.nextStarter;
  const alternating = match.setWon ? otherX01Player(match.setStarter) : otherX01Player(match.starter);
  const starter = rule === "alternate" ? alternating : rule === "winner" ? match.legWinner! : otherX01Player(match.legWinner!);
  const players = { ...match.players };
  for (const player of ["human", "bot"] as const) {
    players[player] = { ...players[player], remaining: match.settings.startScore,
      opened: match.settings.inRule === "straight", legs: match.setWon ? 0 : players[player].legs };
  }
  return { ...match, players, current: starter, starter, setStarter: match.setWon ? starter : match.setStarter,
    legNumber: match.legNumber + 1, phase: "throwing", darts: [], visitInput: "darts", visitStart: match.settings.startScore,
    visitOpened: match.settings.inRule === "straight", visitScore: 0, bust: false, legWinner: null, setWon: false };
};

// Memoized, bounded search for legal reported visits. A total cannot invent an
// impossible 179, skip double-in or finish on the wrong ring. Per-dart input
// remains available for recording the precise fields and correcting a visit.
export const findX01Visit = (match: X01Match, total: number, dartCount: number): X01Dart[] | null => {
  if (!Number.isInteger(total) || total < 0 || total > 180 || ![1, 2, 3].includes(dartCount)) return null;
  const failed = new Set<string>();
  const search = (state: X01Match, left: number, path: X01Dart[]): X01Dart[] | null => {
    if (state.bust) return null;
    if (state.visitScore === total && left === 0) return path;
    if (left === 0 || state.phase !== "throwing" || state.visitScore > total) return null;
    const key = `${state.players[state.current].remaining}:${state.players[state.current].opened}:${left}`;
    if (failed.has(key)) return null;
    for (const dart of OPTIONS) {
      if (dart.score > total - state.visitScore && state.players[state.current].opened) continue;
      const found = search(throwX01Dart(state, dart), left - 1, [...path, dart]);
      if (found) return found;
    }
    failed.add(key);
    return null;
  };
  return search(match, dartCount, []);
};

const checkoutCache = new Map<string, X01Dart[] | null>();
export const getX01Checkout = (remaining: number, dartsLeft: number, rule: X01Rule): X01Dart[] | null => {
  if (remaining <= 0 || remaining > 180 || dartsLeft < 1) return null;
  const key = `${remaining}:${dartsLeft}:${rule}`;
  if (checkoutCache.has(key)) return checkoutCache.get(key)!;
  // Prefer fewer darts, common doubles and high scoring setup darts.
  const options = [...OPTIONS].filter(dart => dart.score > 0).sort((a, b) => b.score - a.score);
  const search = (score: number, left: number): X01Dart[] | null => {
    for (const dart of options) if (dart.score === score && matchesX01Rule(dart, rule)) return [dart];
    if (left <= 1) return null;
    for (const dart of options) {
      if (dart.score >= score || (rule !== "straight" && score - dart.score === 1)) continue;
      const tail = search(score - dart.score, left - 1);
      if (tail) return [dart, ...tail];
    }
    return null;
  };
  const route = search(remaining, dartsLeft);
  if (checkoutCache.size >= 1024) checkoutCache.clear();
  checkoutCache.set(key, route);
  return route;
};
export const chooseX01DartbotAim = (match: X01Match, level: DartbotLevel): DartbotAim => {
  const side = match.players.bot;
  const left = 3 - match.darts.length;
  if (!side.opened) {
    const kind = match.settings.inRule === "master" && side.remaining >= 6 ? "T" : "D";
    return { kind, value: Math.min(20, Math.floor(side.remaining / (kind === "T" ? 3 : 2))) };
  }
  if (side.remaining <= 180) {
    const route = match.settings.outRule === "master" ? getX01Checkout(side.remaining, left, "master") :
      chooseDartbotRoute(side.remaining, left, match.settings.outRule === "double", level);
    if (route?.length) {
      const first = route[0];
      return { kind: first.kind as DartKind, value: first.kind === "DB" ? 50 : first.kind === "SB" ? 25 :
        first.score / (first.kind === "T" ? 3 : first.kind === "D" ? 2 : 1) };
    }
    // Set up a preferred double when no checkout is possible in this visit.
    if (side.remaining <= 60 && match.settings.outRule !== "straight") {
      if (side.remaining % 2 === 0 && side.remaining <= 40) return { kind: "D", value: side.remaining / 2 };
      const value = [side.remaining - 32, side.remaining - 16, 1].find(n => n > 0 && n <= 20) ?? 1;
      return { kind: "S", value };
    }
    if (side.remaining > 60 && side.remaining <= 80) return { kind: "T", value: 16 };
  }
  return { kind: "T", value: 20 };
};
export const x01Average = (side: X01Side): string => side.stats.darts ? (side.stats.points / side.stats.darts * 3).toFixed(1) : "–";

import { findCheckoutRoutes, type DartOption } from "@/lib/trainingCheckout";

export interface DartbotLevel {
  id: number;
  average: number;
  spreadMm: number;
}

// Approximate 501 double-out three-dart averages, including missed doubles and
// busts. Calibrated with the same physical throw model used in training.
export const DARTBOT_LEVELS: DartbotLevel[] = [
  41.5, 33.3, 27.7, 23.4, 20.4, 17.9, 15.9, 14.3, 13, 11.9, 10.8, 9.8, 8.8, 8, 7.3, 6.6, 5.9, 5.25, 4.65, 4.1,
].map((spreadMm, index) => ({ id: index + 1, average: 20 + index * 5, spreadMm }));

export const DEFAULT_DARTBOT_LEVEL = 9;
export const getDartbotLevel = (id: number): DartbotLevel =>
  DARTBOT_LEVELS.find((level) => level.id === id) ?? DARTBOT_LEVELS[DEFAULT_DARTBOT_LEVEL - 1];

export const DARTBOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const MM_PER_SVG_UNIT = 170 / 83;

export interface DartbotThrow {
  score: number;
  label: string;
  isDouble: boolean;
  segment: number | null;
  x: number;
  y: number;
  distance: number;
}

export interface DartbotAim {
  kind: DartOption["kind"];
  value: number;
}

const gaussianPair = (random: () => number): [number, number] => {
  const radius = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random())));
  const angle = random() * 2 * Math.PI;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
};

// Millimetres from the bull. Adjacent numbers, ring misses and off-board
// throws fall naturally out of the geometry rather than scripted outcomes.
export const scoreDartbotPoint = (xMm: number, yMm: number): DartbotThrow => {
  const distance = Math.hypot(xMm, yMm);
  let segment: number | null = null;
  let score = 0;
  let label = "MISS";
  let isDouble = false;
  if (distance <= 6.35) {
    score = 50; label = "BULL"; isDouble = true;
  } else if (distance <= 15.9) {
    score = 25; label = "25";
  } else if (distance <= 170) {
    const angle = (Math.atan2(xMm, -yMm) * 180 / Math.PI + 360 + 9) % 360;
    segment = DARTBOARD_NUMBERS[Math.floor(angle / 18)];
    const multiplier = distance >= 162 ? 2 : distance >= 99.4 && distance <= 107.4 ? 3 : 1;
    score = segment * multiplier;
    label = `${multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S"}${segment}`;
    isDouble = multiplier === 2;
  }
  return { score, label, isDouble, segment, distance, x: 100 + xMm / MM_PER_SVG_UNIT, y: 100 + yMm / MM_PER_SVG_UNIT };
};

export const simulateDartbotThrow = (
  level: DartbotLevel,
  aim: DartbotAim,
  random: () => number = Math.random,
  turnForm = 1,
): DartbotThrow => {
  const index = DARTBOARD_NUMBERS.indexOf(aim.value);
  const angle = index * Math.PI / 10;
  const radius = aim.kind === "DB" ? 0 : aim.kind === "SB" ? 11 : aim.kind === "D" ? 166 : aim.kind === "T" ? 103.4 : 133;
  const [dx, dy] = gaussianPair(random);
  // A small chance of a loose dart, at every level. No catch-up/rubber banding.
  const spread = level.spreadMm * turnForm * (random() < 0.04 ? 1.7 : 1);
  return scoreDartbotPoint(Math.sin(angle) * radius + dx * spread, -Math.cos(angle) * radius + dy * spread);
};

export const dartbotTurnForm = (random: () => number = Math.random): number => 0.85 + random() * 0.3;

export const simulateDartbotBull = (level: DartbotLevel, random: () => number = Math.random): DartbotThrow =>
  simulateDartbotThrow(level, { kind: "DB", value: 50 }, random);

const normalBand = (halfWidth: number, spread: number): number =>
  1 - Math.exp(-1.6 * halfWidth / spread - 0.75 * (halfWidth / spread) ** 2);

const hitProbability = (dart: DartOption, level: DartbotLevel): number => {
  const spread = level.spreadMm;
  if (dart.kind === "DB") return 1 - Math.exp(-(6.35 ** 2) / (2 * spread ** 2));
  if (dart.kind === "SB") return (1 - Math.exp(-(15.9 ** 2) / (2 * spread ** 2))) * 0.7;
  if (dart.kind === "S") return normalBand(20, spread) * normalBand(22, spread);
  return normalBand(4, spread) * normalBand(dart.kind === "D" ? 26 : 16, spread);
};

const routeCache = new Map<string, DartOption[][]>();
export const chooseDartbotRoute = (remaining: number, dartsLeft: number, finishOnDouble: boolean, level: DartbotLevel): DartOption[] | null => {
  const key = `${remaining}:${dartsLeft}:${finishOnDouble}`;
  let routes = routeCache.get(key);
  if (!routes) {
    routes = findCheckoutRoutes({ currentTotal: 0, target: remaining, dartsLeft, finishOnDouble });
    if (routeCache.size >= 1024) routeCache.clear();
    routeCache.set(key, routes);
  }
  let best: DartOption[] | null = null;
  let bestProbability = -1;
  for (const route of routes) {
    const probability = route.reduce((chance, dart) => chance * hitProbability(dart, level), 1);
    if (probability > bestProbability) {
      best = route;
      bestProbability = probability;
    }
  }
  return best;
};

type Owner = "A" | "B";
interface BotCell { id: number; target: number; owner: Owner | null }
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

const positionCache = new Map<string, number>();
// Solve the small board completely, including fork defence. Accuracy still
// determines whether the intended square can actually be claimed.
const positionValue = (owners: (Owner | null)[], nextPlayer: Owner): number => {
  const key = owners.map((owner) => owner ?? "-").join("") + nextPlayer;
  const cached = positionCache.get(key);
  if (cached !== undefined) return cached;
  const freeCount = owners.filter((owner) => owner === null).length;
  for (const [a, b, c] of LINES) {
    if (owners[a] && owners[a] === owners[b] && owners[a] === owners[c]) {
      return owners[a] === "B" ? 100 + freeCount : -100 - freeCount;
    }
  }
  if (freeCount === 0) return 0;
  let best = nextPlayer === "B" ? -Infinity : Infinity;
  owners.forEach((owner, index) => {
    if (owner) return;
    const next = [...owners];
    next[index] = nextPlayer;
    const value = positionValue(next, nextPlayer === "B" ? "A" : "B");
    best = nextPlayer === "B" ? Math.max(best, value) : Math.min(best, value);
  });
  positionCache.set(key, best);
  return best;
};

export const chooseTicTacToeDartbotAim = (
  board: BotCell[], currentTotal: number, dartsLeft: number, finishOnDouble: boolean, level: DartbotLevel,
): { cellId: number; dart: DartOption } | null => {
  let best: { cellId: number; dart: DartOption } | null = null;
  let bestValue = -Infinity;
  for (const cell of board) {
    if (cell.owner) continue;
    const route = chooseDartbotRoute(cell.target - currentTotal, dartsLeft, finishOnDouble, level);
    if (!route) continue;
    const lines = LINES.filter((line) => line.includes(cell.id));
    const afterClaim = board.map((entry) => entry.id === cell.id ? "B" : entry.owner);
    const openLines = lines.filter((line) => line.every((id) => board[id].owner !== "A")).length;
    const probability = route.reduce((chance, dart) => chance * hitProbability(dart, level), 1);
    const value = positionValue(afterClaim, "A") * 1000 + openLines * 2 + probability * 10;
    if (value > bestValue) { bestValue = value; best = { cellId: cell.id, dart: route[0] }; }
  }
  return best;
};

// Aim well inside the widest safe arc. When only bull remains, actually aim
// at bull; a missed bull can hit a red number and is never forced to be safe.
export const chooseRedZoneDartbotAim = (dangerNumbers: ReadonlySet<number>): DartbotAim => {
  let bestIndex = -1;
  let bestMargin = -1;
  DARTBOARD_NUMBERS.forEach((number, index) => {
    if (dangerNumbers.has(number)) return;
    let margin = 10;
    DARTBOARD_NUMBERS.forEach((danger, dangerIndex) => {
      if (!dangerNumbers.has(danger)) return;
      const distance = Math.abs(index - dangerIndex);
      margin = Math.min(margin, distance, 20 - distance);
    });
    if (margin > bestMargin) { bestMargin = margin; bestIndex = index; }
  });
  return bestIndex === -1 ? { kind: "DB", value: 50 } : { kind: "S", value: DARTBOARD_NUMBERS[bestIndex] };
};

export const isRedZoneDanger = (dart: DartbotThrow, dangerNumbers: ReadonlySet<number>): boolean =>
  dart.segment !== null && dangerNumbers.has(dart.segment);

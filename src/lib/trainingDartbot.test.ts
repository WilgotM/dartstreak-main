import { describe, expect, it } from "vitest";
import {
  DARTBOT_LEVELS, DARTBOARD_NUMBERS, chooseDartbotRoute, chooseRedZoneDartbotAim,
  chooseTicTacToeDartbotAim, dartbotTurnForm, isRedZoneDanger, scoreDartbotPoint, simulateDartbotThrow,
  type DartbotLevel, type DartbotAim,
} from "@/lib/trainingDartbot";

const seededRandom = (initial: number) => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};

const simulate501Average = (level: DartbotLevel, legs: number): number => {
  const random = seededRandom(8192 + level.id);
  const aims = new Map<string, DartbotAim>();
  let totalDarts = 0;
  for (let leg = 0; leg < legs; leg += 1) {
    let remaining = 501;
    let darts = 0;
    while (remaining > 0 && darts < 1500) {
      const visitStart = remaining;
      const form = dartbotTurnForm(random);
      for (let index = 0; index < 3; index += 1) {
        const key = `${remaining}:${3 - index}`;
        let aim = aims.get(key);
        if (!aim) {
          aim = remaining > 170 ? { kind: "T", value: 20 }
            : chooseDartbotRoute(remaining, 3 - index, true, level)?.[0]
              ?? (remaining > 60 ? { kind: "T", value: 20 }
                : { kind: "S", value: remaining > 40 ? remaining - 40 : remaining % 2 === 1 ? 1 : 2 });
          aims.set(key, aim);
        }
        const dart = simulateDartbotThrow(level, aim, random, form);
        darts += 1;
        const next = remaining - dart.score;
        if (next < 0 || next === 1 || (next === 0 && !dart.isDouble)) { remaining = visitStart; break; }
        remaining = next;
        if (remaining === 0) break;
      }
    }
    expect(remaining).toBe(0);
    totalDarts += darts;
  }
  return (501 * legs * 3) / totalDarts;
};

describe("Dartbot physical throws", () => {
  it("scores bulls, singles, trebles, doubles, neighbours and off-board misses", () => {
    expect(scoreDartbotPoint(0, 0)).toMatchObject({ score: 50, isDouble: true, segment: null });
    expect(scoreDartbotPoint(0, 12)).toMatchObject({ score: 25, isDouble: false, segment: null });
    expect(scoreDartbotPoint(0, -133)).toMatchObject({ score: 20, segment: 20 });
    expect(scoreDartbotPoint(0, -103.4)).toMatchObject({ score: 60, label: "T20" });
    expect(scoreDartbotPoint(0, -166)).toMatchObject({ score: 40, isDouble: true });
    expect(scoreDartbotPoint(60, -133).segment).toBe(1);
    expect(scoreDartbotPoint(-60, -133).segment).toBe(5);
    expect(scoreDartbotPoint(0, -171)).toMatchObject({ score: 0, segment: null });
  });

  it("produces legal individual darts with realistic misses at every level", () => {
    const legal = new Set([0, 25, 50, ...DARTBOARD_NUMBERS.flatMap((number) => [number, number * 2, number * 3])]);
    for (const level of DARTBOT_LEVELS) {
      const random = seededRandom(level.id);
      const throws = Array.from({ length: 2000 }, () => simulateDartbotThrow(level, { kind: "T", value: 20 }, random));
      expect(throws.every((dart) => legal.has(dart.score))).toBe(true);
      expect(throws.some((dart) => dart.label === "T20")).toBe(true);
      expect(throws.some((dart) => dart.label !== "T20")).toBe(true);
    }
  });

  it("calibrates all 20 displayed 501 averages and makes each level stronger", () => {
    let previousAverage = 0;
    for (const level of DARTBOT_LEVELS) {
      const average = simulate501Average(level, 600);
      expect(Math.abs(average - level.average), `level ${level.id}: measured ${average}, displayed ${level.average}`).toBeLessThan(3);
      expect(average).toBeGreaterThan(previousAverage);
      previousAverage = average;
    }
  }, 30000);
});

const makeBoard = (owners: ("A" | "B" | null)[]) => owners.map((owner, id) => ({ id, owner, target: 20 - id }));

describe("Tic Tac Toe strategy", () => {
  const level = DARTBOT_LEVELS[19];
  it("wins before blocking, and blocks immediate opponent wins", () => {
    expect(chooseTicTacToeDartbotAim(makeBoard(["B", "B", null, "A", "A", null, null, null, null]), 0, 3, false, level)?.cellId).toBe(2);
    expect(chooseTicTacToeDartbotAim(makeBoard(["A", "A", null, null, "B", null, null, null, null]), 0, 3, false, level)?.cellId).toBe(2);
  });
  it("replans around missed darts and only suggests reachable unclaimed squares", () => {
    const board = makeBoard(["A", null, null, null, "B", null, null, null, null]);
    const aim = chooseTicTacToeDartbotAim(board, 13, 1, true, level);
    expect(aim).not.toBeNull();
    expect(aim!.dart.isDouble).toBe(true);
    expect(13 + aim!.dart.score).toBe(board[aim!.cellId].target);
    expect(chooseTicTacToeDartbotAim(board, 50, 1, true, level)).toBeNull();
  });
  it("defends the opposite-corner fork by playing an edge", () => {
    const aim = chooseTicTacToeDartbotAim(makeBoard(["A", null, null, null, "B", null, null, null, "A"]), 0, 3, false, level);
    expect([1, 3, 5, 7]).toContain(aim?.cellId);
  });
});

describe("Red Zone Survival strategy", () => {
  it("aims inside the widest safe area, including across the board wrap", () => {
    const danger = new Set([20, 1, 5]);
    expect(chooseRedZoneDartbotAim(danger)).toEqual({ kind: "S", value: 3 });
    const onlyFiveSafe = new Set(DARTBOARD_NUMBERS.filter((number) => number !== 5));
    expect(chooseRedZoneDartbotAim(onlyFiveSafe)).toEqual({ kind: "S", value: 5 });
  });
  it("aims at bull when every number is red and counts missed bulls in red as danger", () => {
    const danger = new Set(DARTBOARD_NUMBERS);
    expect(chooseRedZoneDartbotAim(danger)).toEqual({ kind: "DB", value: 50 });
    expect(isRedZoneDanger(scoreDartbotPoint(0, 0), danger)).toBe(false);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 30), danger)).toBe(true);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 175), danger)).toBe(true);
  });
  it("requires a scoring board hit to survive, while both bulls remain safe", () => {
    const danger = new Set([20]);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 170), danger)).toBe(false);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 170.01), danger)).toBe(true);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 250), new Set())).toBe(true);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 0), danger)).toBe(false);
    expect(isRedZoneDanger(scoreDartbotPoint(0, 12), danger)).toBe(false);
  });
});

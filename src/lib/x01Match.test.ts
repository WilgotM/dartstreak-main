import { describe, expect, it } from "vitest";
import { getDartbotLevel } from "@/lib/trainingDartbot";
import { advanceX01Match, bustX01Visit, chooseX01DartbotAim, createX01Match, DEFAULT_X01_SETTINGS, findX01Visit, getX01Checkout,
  makeX01Dart, throwX01Dart, x01Average, type X01Settings } from "@/lib/x01Match";

const game = (settings: Partial<X01Settings> = {}) => createX01Match({ ...DEFAULT_X01_SETTINGS, ...settings }, "human");
const visit = (match: ReturnType<typeof game>, ...darts: ReturnType<typeof makeX01Dart>[]) => darts.reduce(throwX01Dart, match);
describe("X01 scoring and entry", () => {
  it("subtracts each dart, commits three-dart averages and hands over the visit", () => {
    const match = visit(game(), makeX01Dart(20, 3), makeX01Dart(20), makeX01Dart(5));
    expect(match.players.human.remaining).toBe(416);
    expect(match.phase).toBe("visitEnd");
    expect(x01Average(match.players.human)).toBe("85.0");
    const next = advanceX01Match(match);
    expect(next.current).toBe("bot"); expect(next.darts).toEqual([]); expect(next.visitStart).toBe(501);
  });
  it("ignores scoring until a double, including the opening dart in the score", () => {
    const match = visit(game({ inRule: "double" }), makeX01Dart(20, 3), makeX01Dart(20, 2), makeX01Dart(20, 3));
    expect(match.visitScore).toBe(100); expect(match.players.human.remaining).toBe(401); expect(match.players.human.opened).toBe(true);
  });
  it("allows triple entry only in master-in and treats the bullseye as a double", () => {
    expect(throwX01Dart(game({ inRule: "master" }), makeX01Dart(20, 3)).visitScore).toBe(60);
    expect(throwX01Dart(game({ inRule: "double" }), makeX01Dart(50)).visitScore).toBe(50);
    expect(throwX01Dart(game({ inRule: "double" }), makeX01Dart(25)).visitScore).toBe(0);
  });
  it("rolls back the entire visit and entry status on bust", () => {
    const match = visit(game({ startScore: 61, inRule: "double" }), makeX01Dart(20, 2), makeX01Dart(20));
    expect(match.bust).toBe(true); expect(match.phase).toBe("visitEnd");
    expect(match.players.human.remaining).toBe(61); expect(match.players.human.opened).toBe(false);
    expect(match.players.human.stats).toMatchObject({ points: 0, darts: 3, visits: 1 });
  });
  it.each(["double", "master"] as const)("busts when leaving one under %s-out", outRule => {
    expect(throwX01Dart(game({ startScore: 21, outRule }), makeX01Dart(20)).bust).toBe(true);
  });
  it("allows a single checkout only with straight-out", () => {
    expect(throwX01Dart(game({ startScore: 20, outRule: "double" }), makeX01Dart(20)).bust).toBe(true);
    expect(throwX01Dart(game({ startScore: 20, outRule: "straight", legsToWin: 1 }), makeX01Dart(20)).winner).toBe("human");
  });
  it("allows a triple checkout in master-out and counts the exact checkout darts", () => {
    const match = throwX01Dart(game({ startScore: 60, outRule: "master" }), makeX01Dart(20, 3));
    expect(match.phase).toBe("legEnd"); expect(match.players.human.stats).toMatchObject({ highestCheckout: 60, darts: 1, legsWon: 1 });
  });
  it("supports an explicitly reported bust and blocks throws after the visit ends", () => {
    const match = bustX01Visit(throwX01Dart(game(), makeX01Dart(20, 3)));
    expect(match.players.human.remaining).toBe(501); expect(match.players.human.stats.points).toBe(0);
    expect(throwX01Dart(match, makeX01Dart(20))).toBe(match);
  });
});
describe("X01 legs and sets", () => {
  it("alternates starts independently of who won", () => {
    const won = throwX01Dart(game({ startScore: 40 }), makeX01Dart(20, 2));
    const next = advanceX01Match(won);
    expect(next.current).toBe("bot"); expect(next.legNumber).toBe(2);
    expect(next.players.human.legs).toBe(1); expect(next.players.human.remaining).toBe(40);
  });
  it.each([["winner", "human"], ["loser", "bot"]] as const)("supports %s starting the next leg", (nextStarter, expected) => {
    const match = advanceX01Match(throwX01Dart(game({ startScore: 40, nextStarter }), makeX01Dart(20, 2)));
    expect(match.current).toBe(expected);
  });
  it("resets leg counters at a set boundary and alternates set starters", () => {
    const match = throwX01Dart(game({ startScore: 40, format: "sets", legsToWin: 1, setsToWin: 2 }), makeX01Dart(20, 2));
    expect(match.setWon).toBe(true); expect(match.players.human.sets).toBe(1);
    const next = advanceX01Match(match);
    expect(next.players.human.legs).toBe(0); expect(next.current).toBe("bot");
    expect(next.players.human.stats.legsWon).toBe(1);
    const won = throwX01Dart(next, makeX01Dart(20, 2));
    const thirdSet = advanceX01Match(won);
    expect(thirdSet.current).toBe("human");
    const final = throwX01Dart(thirdSet, makeX01Dart(20, 2));
    expect(final.winner).toBe("human"); expect(advanceX01Match(final)).toBe(final);
  });
});
describe("X01 reported visits and checkout choices", () => {
  it("rejects impossible three-dart totals", () => {
    for (const total of [163, 166, 169, 172, 173, 175, 176, 178, 179, 181, -1, 20.5, NaN]) expect(findX01Visit(game(), total, 3)).toBeNull();
    for (const total of [0, 26, 60, 85, 100, 140, 180]) {
      const darts = findX01Visit(game(), total, 3);
      expect(darts).not.toBeNull(); expect(visit(game(), ...darts!).visitScore).toBe(total);
    }
  });
  it("validates both checkout ring and reported dart count", () => {
    expect(findX01Visit(game({ startScore: 20 }), 20, 1)?.[0].label).toBe("D10");
    expect(findX01Visit(game({ startScore: 60 }), 60, 1)).toBeNull();
    expect(findX01Visit(game({ startScore: 60, outRule: "master" }), 60, 1)?.[0].label).toBe("T20");
    expect(findX01Visit(game({ startScore: 170 }), 170, 2)).toBeNull();
    expect(findX01Visit(game({ startScore: 170 }), 170, 3)).not.toBeNull();
    expect(findX01Visit(game({ startScore: 169 }), 169, 3)).toBeNull();
  });
  it("does not skip double-in when recording a total", () => {
    expect(findX01Visit(game({ inRule: "double" }), 180, 3)).toBeNull();
    const match = game({ inRule: "double" });
    const darts = findX01Visit(match, 160, 3);
    expect(darts).not.toBeNull(); expect(visit(match, ...darts!).players.human.remaining).toBe(341);
  });
  it("suggests a legal checkout in each finish mode", () => {
    for (const outRule of ["straight", "double", "master"] as const) {
      for (const score of [2, 20, 40, 50, 60, 100, 170]) {
        const route = getX01Checkout(score, 3, outRule);
        if (route) expect(visit(game({ startScore: score, outRule }), ...route).phase).toBe("legEnd");
      }
    }
    expect(getX01Checkout(169, 3, "double")).toBeNull();
    expect(getX01Checkout(180, 3, "master")?.map(dart => dart.label)).toEqual(["T20", "T20", "T20"]);
  });
  it("uses the existing bot accuracy model with entry and finish-aware aiming", () => {
    const level = getDartbotLevel(9);
    expect(chooseX01DartbotAim({ ...game({ inRule: "double" }), current: "bot" }, level)).toEqual({ kind: "D", value: 20 });
    expect(chooseX01DartbotAim({ ...game({ startScore: 40 }), current: "bot" }, level)).toEqual({ kind: "D", value: 20 });
    expect(chooseX01DartbotAim({ ...game({ startScore: 501 }), current: "bot" }, level)).toEqual({ kind: "T", value: 20 });
  });
});

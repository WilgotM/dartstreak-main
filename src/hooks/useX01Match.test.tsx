// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useX01Match, { getX01ThrowDelay, X01_FLIGHT_MS } from "@/hooks/useX01Match";
import { DEFAULT_X01_SETTINGS, makeX01Dart } from "@/lib/x01Match";
import { simulateDartbotThrow } from "@/lib/trainingDartbot";

vi.mock("@/lib/trainingDartbot", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/trainingDartbot")>();
  return { ...original, simulateDartbotThrow: vi.fn((level, aim) => original.simulateDartbotThrow({ ...level, spreadMm: 0 }, aim)) };
});
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const tick = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
describe("X01 match lifecycle", () => {
  it("keeps human undo and statistics correct under React StrictMode", () => {
    const { result } = renderHook(() => useX01Match(), { wrapper: StrictMode });
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "human"));
    act(() => result.current.humanDarts([makeX01Dart(20, 3), makeX01Dart(20, 3), makeX01Dart(20, 3)]));
    expect(result.current.match?.players.human.remaining).toBe(321);
    expect(result.current.match?.players.human.stats).toMatchObject({ points: 180, darts: 3, oneEighties: 1 });
    act(() => result.current.undo());
    expect(result.current.match?.players.human.remaining).toBe(501);
    expect(result.current.match?.players.human.stats.points).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });
  it("shows the flight first and changes the score only at impact", async () => {
    const impact = vi.fn();
    const { result } = renderHook(() => useX01Match(impact));
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "bot"));
    const delay = getX01ThrowDelay("match", true, false, () => 0.5);
    await tick(delay - 1); expect(simulateDartbotThrow).not.toHaveBeenCalled();
    await tick(1); expect(result.current.botDarts).toHaveLength(1);
    expect(result.current.match?.players.bot.remaining).toBe(501);
    await tick(X01_FLIGHT_MS - 1); expect(impact).not.toHaveBeenCalled();
    await tick(1); expect(result.current.match?.players.bot.remaining).toBe(441); expect(impact).toHaveBeenCalledTimes(1);
  });
  it("pauses a dart in flight, resumes the same dart once, and cancels timers on reset", async () => {
    const impact = vi.fn();
    const { result } = renderHook(() => useX01Match(impact));
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "bot"));
    await tick(getX01ThrowDelay("match", true, false, () => 0.5));
    act(() => result.current.setPaused(true));
    await tick(10000); expect(impact).not.toHaveBeenCalled(); expect(result.current.match?.players.bot.remaining).toBe(501);
    act(() => result.current.setPaused(false));
    await tick(300 + X01_FLIGHT_MS);
    expect(impact).toHaveBeenCalledTimes(1); expect(simulateDartbotThrow).toHaveBeenCalledTimes(1);
    act(() => result.current.reset()); await tick(10000);
    expect(result.current.match).toBeNull(); expect(impact).toHaveBeenCalledTimes(1);
  });
  it("holds the final three darts before automatically returning control to the human", async () => {
    const { result } = renderHook(() => useX01Match());
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "bot"));
    await tick(getX01ThrowDelay("match", true, false, () => 0.5) + X01_FLIGHT_MS);
    for (let dart = 0; dart < 2; dart++) await tick(getX01ThrowDelay("match", false, false, () => 0.5) + X01_FLIGHT_MS);
    expect(result.current.match?.phase).toBe("visitEnd"); expect(result.current.botDarts).toHaveLength(3);
    await tick(2299); expect(result.current.match?.current).toBe("bot");
    await tick(1); expect(result.current.match?.current).toBe("human"); expect(result.current.botDarts).toHaveLength(3);
    act(() => result.current.humanDarts([makeX01Dart(0), makeX01Dart(0), makeX01Dart(0)]));
    act(() => result.current.advance()); expect(result.current.botDarts).toHaveLength(0); expect(result.current.canUndo).toBe(false);
  });
  it("ignores human input during the bot turn and cancels a pending throw on unmount", async () => {
    const { result, unmount } = renderHook(() => useX01Match());
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "bot"));
    act(() => result.current.humanDarts([makeX01Dart(20, 3)]));
    expect(result.current.match?.darts).toHaveLength(0);
    unmount(); await tick(10000); expect(simulateDartbotThrow).not.toHaveBeenCalled();
  });
  it("pauses while the tab is hidden", async () => {
    const { result } = renderHook(() => useX01Match());
    act(() => result.current.start(DEFAULT_X01_SETTINGS, "bot"));
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await tick(10000); expect(simulateDartbotThrow).not.toHaveBeenCalled(); expect(result.current.paused).toBe(true);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await tick(getX01ThrowDelay("match", true, false, () => 0.5) + X01_FLIGHT_MS);
    expect(result.current.match?.players.bot.remaining).toBe(441);
  });
});

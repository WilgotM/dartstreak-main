// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import TrainingTicTacToe from "@/pages/TrainingTicTacToe";
import TrainingRedZone from "@/pages/TrainingRedZone";
import { scoreDartbotPoint, simulateDartbotThrow } from "@/lib/trainingDartbot";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-player" }, loading: false }) }));
vi.mock("@/components/AppLayout", () => ({ AppLayout: ({ children }) => children }));
vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  const tags = ["section", "div", "p", "span", "h2", "li", "button"];
  const allowed = new Set(["children", "className", "style", "onClick", "type", "disabled", "aria-label", "role"]);
  return {
    AnimatePresence: ({ children }) => children,
    motion: Object.fromEntries(tags.map((tag) => [tag, (props: Record<string, unknown>) =>
      createElement(tag, Object.fromEntries(Object.entries(props).filter(([key]) => allowed.has(key))))])),
  };
});
vi.mock("@/lib/trainingDartbot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trainingDartbot")>();
  return {
    ...actual,
    simulateDartbotBull: vi.fn(() => actual.scoreDartbotPoint(80, 0)),
    simulateDartbotThrow: vi.fn((level, aim) => actual.simulateDartbotThrow({ ...level, spreadMm: 0 }, aim)),
  };
});

const tick = async (ms = 1200) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const enableBot = () => fireEvent.click(screen.getByRole("radio", { name: "Play against Dartbot" }));
const clickBull = () => {
  const board = screen.getByRole("button", { name: "Interactive dartboard" });
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, toJSON: () => ({}) });
  fireEvent.click(board, { clientX: 100, clientY: 100 });
};
const startTicTacToe = async () => {
  enableBot();
  fireEvent.click(screen.getByRole("button", { name: "Start game" }));
  clickBull();
  // Input is locked while the bot throws for the bull.
  expect(screen.queryByRole("button", { name: "Interactive dartboard" })).toBeNull();
  await tick();
  fireEvent.click(screen.getByRole("button", { name: "Start match" }));
};
const startRedZone = async () => {
  enableBot();
  fireEvent.click(screen.getByRole("button", { name: "Start game" }));
  clickBull();
  await tick();
  fireEvent.click(screen.getByRole("button", { name: "Start game" }));
};

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
  const actual = await vi.importActual<typeof import("@/lib/trainingDartbot")>("@/lib/trainingDartbot");
  vi.mocked(simulateDartbotThrow).mockImplementation((level, aim) => actual.simulateDartbotThrow({ ...level, spreadMm: 0 }, aim));
  // jsdom does not expose APIs used by Radix.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Dartbot setup", () => {
  it("shows the same levels and 501 explanation in both games and preserves local names", () => {
    const view = render(<MemoryRouter><TrainingTicTacToe /></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: "Team B" }), { target: { value: "Local friend" } });
    enableBot();
    expect(screen.getByRole("combobox", { name: "Dartbot difficulty" }).textContent).toContain("≈ 60 average (501)");
    expect(screen.getByText(/not your score in this training game/)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Team B" }).getAttribute("disabled")).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Local players" }));
    expect(screen.getByDisplayValue("Local friend")).toBeTruthy();
    view.unmount();
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    enableBot();
    expect(screen.getByRole("combobox", { name: "Dartbot difficulty" }).textContent).toContain("≈ 60 average (501)");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });
});

describe("Tic Tac Toe bot turns", () => {
  it("automatically throws and claims a square, then returns control to the human", async () => {
    render(<MemoryRouter><TrainingTicTacToe /></MemoryRouter>);
    await startTicTacToe();
    for (let index = 0; index < 3; index += 1) fireEvent.click(screen.getByRole("button", { name: "MISS" }));
    await tick();
    expect(screen.getByRole("button", { name: "MISS" }).getAttribute("disabled")).not.toBeNull();
    for (let step = 0; step < 5; step += 1) await tick(1000);
    expect(vi.mocked(simulateDartbotThrow).mock.calls.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "MISS" }).getAttribute("disabled")).toBeNull();
    expect(screen.getAllByText("Dartbot").length).toBeGreaterThan(1);
  });

  it("cancels a pending bot throw when changing teams or unmounting", async () => {
    const view = render(<MemoryRouter><TrainingTicTacToe /></MemoryRouter>);
    await startTicTacToe();
    for (let index = 0; index < 3; index += 1) fireEvent.click(screen.getByRole("button", { name: "MISS" }));
    await tick();
    fireEvent.click(screen.getByRole("button", { name: "Change teams" }));
    const count = vi.mocked(simulateDartbotThrow).mock.calls.length;
    await tick(6000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(count);
    expect(screen.getByRole("radio", { name: "Play against Dartbot" }).getAttribute("data-state")).toBe("on");
    view.unmount();
    await tick(6000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(count);
  });
});

describe("Red Zone bot turns", () => {
  it.each([1, 2, 3])("eliminates the bot when dart %i misses the board", async (missDart) => {
    let dartIndex = 0;
    vi.mocked(simulateDartbotThrow).mockImplementation(() => {
      dartIndex += 1;
      return scoreDartbotPoint(0, dartIndex === missDart ? 175 : 133);
    });
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    await startRedZone();
    fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
    for (let dart = 0; dart < missDart; dart += 1) await tick(1000);
    expect(screen.getByText(`Missed the board with dart ${missDart}.`)).toBeTruthy();
    await tick(1500);
    expect(screen.queryByText("Player 1 wins!")).not.toBeNull();
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(missDart);
    await tick(5000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(missDart);
  });

  it("stops on a red hit and resolves sudden-death elimination", async () => {
    vi.mocked(simulateDartbotThrow).mockImplementation(() => scoreDartbotPoint(0, -133));
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    await startRedZone();
    fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
    await tick(1000);
    expect(screen.getByText("Hit the red zone with dart 1.")).toBeTruthy();
    await tick(1500);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Player 1 wins!")).toBeTruthy();
    const count = vi.mocked(simulateDartbotThrow).mock.calls.length;
    await tick(5000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(count);
  });

  it("applies extra lives in random mode and keeps the bot in play after losing a life", async () => {
    vi.mocked(simulateDartbotThrow).mockImplementation(() => scoreDartbotPoint(0, -133));
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Random sectors/ }));
    fireEvent.click(screen.getByRole("button", { name: "3 Lives" }));
    // Make 20 the initial random red sector; the bot has a deterministic red hit.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    await startRedZone();
    fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
    await tick(1000);
    await tick(1500);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Safe Hit" })).toBeTruthy();
    expect(screen.queryByText(/wins!/)).toBeNull();
    expect(screen.getAllByText("Still in")).toHaveLength(2);
  });

  it("loses an extra life on an off-board miss without treating the turn as safe", async () => {
    vi.mocked(simulateDartbotThrow).mockImplementation(() => scoreDartbotPoint(0, 175));
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "1 Life" }));
    await startRedZone();
    for (let round = 0; round < 2; round += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
      await tick(1000);
      await tick(1500);
    }
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Player 1 wins!")).toBeTruthy();
  });

  it("throws three safe darts, advances the round, and restarts without carrying old darts", async () => {
    render(<MemoryRouter><TrainingRedZone /></MemoryRouter>);
    await startRedZone();
    fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
    expect(screen.queryByRole("button", { name: "Safe Hit" })).toBeNull();
    for (let step = 0; step < 5; step += 1) await tick(1000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("button", { name: "Safe Hit" })).toBeTruthy();
    expect(screen.getAllByText("Round 2").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "New game" }));
    expect(screen.getAllByText("Round 1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Safe Hit" }));
    await tick(1000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("button", { name: "Change players" }));
    await tick(6000);
    expect(vi.mocked(simulateDartbotThrow)).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("radio", { name: "Local players" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });
});

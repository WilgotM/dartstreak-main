import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CircleHelp, Maximize, Minimize } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TicTacToeBoard from "@/components/training/TicTacToeBoard";
import TicTacToeTurnPanel from "@/components/training/TicTacToeTurnPanel";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { cn } from "@/lib/utils";
import {
  findCheckoutRoutes,
  pickEasiestRoute,
  pickFastestRoute,
  formatRoute,
} from "@/lib/trainingCheckout";

type Player = "A" | "B";
type Difficulty =
  | "pro_checkouts"
  | "pro_trebles"
  | "expert_checkouts"
  | "beginner_numbers"
  | "easy_scores"
  | "intermediate_doubles"
  | "advanced_scores";

interface BoardCell {
  id: number;
  target: number;
  owner: Player | null;
}

interface ThrowInputEntry {
  score: number;
  label: string;
  isDouble: boolean;
}

interface CardGuide {
  possible: boolean;
  exactNow: boolean;
  easiest: string | null;
  fastest: string | null;
  sameRoute: boolean;
}

interface RoundResult {
  winner: Player | null;
  isDraw: boolean;
  winningLine: number[];
}

interface TeamConfig {
  name: string;
  color: string;
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const difficultyOrder: Difficulty[] = [
  "pro_checkouts",
  "pro_trebles",
  "expert_checkouts",
  "advanced_scores",
  "intermediate_doubles",
  "easy_scores",
  "beginner_numbers",
];

const difficultyPools: Record<Difficulty, number[]> = {
  pro_checkouts: Array.from({ length: 40 }, (_, index) => index + 81),
  pro_trebles: Array.from({ length: 20 }, (_, index) => (index + 1) * 3),
  expert_checkouts: Array.from({ length: 40 }, (_, index) => index + 41),
  beginner_numbers: Array.from({ length: 20 }, (_, index) => index + 1),
  easy_scores: Array.from({ length: 40 }, (_, index) => index + 21),
  intermediate_doubles: [...Array.from({ length: 20 }, (_, index) => (index + 1) * 2), 50],
  advanced_scores: Array.from({ length: 60 }, (_, index) => index + 61),
};

const teamColorOptions = [
  "#3B82F6",
  "#F43F5E",
  "#10B981",
  "#F59E0B",
  "#A855F7",
  "#06B6D4",
  "#EF4444",
  "#22C55E",
];

const randomUniqueFromPool = (pool: number[], count: number): number[] => {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

const buildBoard = (difficulty: Difficulty): BoardCell[] => {
  const targets = randomUniqueFromPool(difficultyPools[difficulty], 9);
  return targets.map((target, id) => ({ id, target, owner: null }));
};

const isCheckoutDifficulty = (difficulty: Difficulty): boolean =>
  difficulty === "pro_checkouts" || difficulty === "expert_checkouts";

const recomputePendingCell = (
  board: BoardCell[],
  turnThrows: ThrowInputEntry[],
  finishOnDouble: boolean,
): number | null => {
  if (turnThrows.length === 0) return null;

  let runningTotal = 0;
  let pendingCellId: number | null = null;

  turnThrows.forEach((throwEntry) => {
    runningTotal += throwEntry.score;
    const hit = board.find((cell) => cell.owner === null && cell.target === runningTotal);
    const validHit = Boolean(hit) && (!finishOnDouble || throwEntry.isDouble);
    pendingCellId = validHit ? hit!.id : null;
  });

  return pendingCellId;
};

const evaluateBoard = (board: BoardCell[]): RoundResult | null => {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const firstOwner = board[a].owner;
    if (firstOwner && firstOwner === board[b].owner && firstOwner === board[c].owner) {
      return { winner: firstOwner, isDraw: false, winningLine: line };
    }
  }

  const isDraw = board.every((cell) => cell.owner !== null);
  if (isDraw) {
    return { winner: null, isDraw: true, winningLine: [] };
  }

  return null;
};

export default function TrainingTicTacToe() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [difficulty, setDifficulty] = useState<Difficulty>("easy_scores");
  const [startingPlayer, setStartingPlayer] = useState<Player>("A");
  const [currentPlayer, setCurrentPlayer] = useState<Player>("A");
  const [board, setBoard] = useState<BoardCell[]>(() => buildBoard("easy_scores"));
  const [throwsThisTurn, setThrowsThisTurn] = useState<ThrowInputEntry[]>([]);
  const [pendingCellId, setPendingCellId] = useState<number | null>(null);
  const [roundsWon, setRoundsWon] = useState<Record<Player, number>>({ A: 0, B: 0 });
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [teamSetup, setTeamSetup] = useState<Record<Player, TeamConfig>>({
    A: { name: "Player A", color: "#3B82F6" },
    B: { name: "Player B", color: "#F43F5E" },
  });
  const [isTeamsReady, setIsTeamsReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const difficultyOptions = useMemo(
    () =>
      difficultyOrder.map((key) => ({
        key,
        label: t(`trainingTicTacToe.difficulty.${key}.label`),
        description: t(`trainingTicTacToe.difficulty.${key}.description`),
      })),
    [t],
  );

  useEffect(() => {
    if (!isTeamsReady) {
      setTeamSetup({
        A: { name: t("trainingTicTacToe.players.playerA"), color: "#3B82F6" },
        B: { name: t("trainingTicTacToe.players.playerB"), color: "#F43F5E" },
      });
    }
  }, [isTeamsReady, t]);

  const finishOnDouble = isCheckoutDifficulty(difficulty);
  const turnTotal = throwsThisTurn.reduce((sum, item) => sum + item.score, 0);
  const remainingDarts = Math.max(0, 3 - throwsThisTurn.length);

  const cardGuides = useMemo(() => {
    const guides: Record<number, CardGuide> = {};

    board.forEach((cell) => {
      if (cell.owner) return;

      const canLockNow =
        turnTotal === cell.target &&
        (!finishOnDouble || Boolean(throwsThisTurn[throwsThisTurn.length - 1]?.isDouble));

      if (canLockNow) {
        guides[cell.id] = {
          possible: true,
          exactNow: true,
          easiest: null,
          fastest: null,
          sameRoute: true,
        };
        return;
      }

      const routes = findCheckoutRoutes({
        currentTotal: turnTotal,
        target: cell.target,
        dartsLeft: remainingDarts,
        finishOnDouble,
      });

      const easiest = formatRoute(pickEasiestRoute(routes));
      const fastest = formatRoute(pickFastestRoute(routes));
      const possible = Boolean(easiest || fastest);

      guides[cell.id] = {
        possible,
        exactNow: false,
        easiest,
        fastest,
        sameRoute: Boolean(easiest && fastest && easiest === fastest),
      };
    });

    return guides;
  }, [board, finishOnDouble, remainingDarts, throwsThisTurn, turnTotal]);

  const endTurnWithoutClaim = useCallback(() => {
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setCurrentPlayer((prev) => (prev === "A" ? "B" : "A"));
  }, []);

  const completeClaim = useCallback(
    (cellId: number) => {
      const selectedCell = board.find((cell) => cell.id === cellId);
      if (!selectedCell || selectedCell.owner || roundResult) return;

      const updatedBoard = board.map((cell) =>
        cell.id === cellId ? { ...cell, owner: currentPlayer } : cell,
      );

      setBoard(updatedBoard);
      setThrowsThisTurn([]);
      setPendingCellId(null);

      const evaluated = evaluateBoard(updatedBoard);
      if (evaluated) {
        setRoundResult(evaluated);
        if (evaluated.winner) {
          setRoundsWon((prev) => ({
            ...prev,
            [evaluated.winner]: prev[evaluated.winner] + 1,
          }));
        }
        return;
      }

      setCurrentPlayer((prev) => (prev === "A" ? "B" : "A"));
    },
    [board, currentPlayer, roundResult],
  );

  const handleAddThrow = useCallback(
    (throwEntry: ThrowInputEntry) => {
      if (roundResult || throwsThisTurn.length >= 3) return;

      const integerScore = Math.trunc(throwEntry.score);
      if (!Number.isInteger(integerScore) || integerScore < 0 || integerScore > 180) return;

      const nextThrows = [...throwsThisTurn, throwEntry];
      const nextPendingCellId = recomputePendingCell(board, nextThrows, finishOnDouble);

      if (nextThrows.length < 3) {
        setThrowsThisTurn(nextThrows);
        setPendingCellId(nextPendingCellId);
        return;
      }

      if (nextPendingCellId !== null) {
        completeClaim(nextPendingCellId);
        return;
      }

      endTurnWithoutClaim();
    },
    [board, completeClaim, endTurnWithoutClaim, finishOnDouble, roundResult, throwsThisTurn],
  );

  const handleUndoThrow = useCallback(() => {
    if (roundResult || throwsThisTurn.length === 0) return;
    const nextThrows = throwsThisTurn.slice(0, -1);
    setThrowsThisTurn(nextThrows);
    setPendingCellId(recomputePendingCell(board, nextThrows, finishOnDouble));
  }, [board, finishOnDouble, roundResult, throwsThisTurn]);

  const handleLockSquare = useCallback(() => {
    if (pendingCellId === null || roundResult) return;
    completeClaim(pendingCellId);
  }, [completeClaim, pendingCellId, roundResult]);

  const resetRound = useCallback(
    (starter: Player, nextDifficulty: Difficulty = difficulty) => {
      setBoard(buildBoard(nextDifficulty));
      setCurrentPlayer(starter);
      setThrowsThisTurn([]);
      setPendingCellId(null);
      setRoundResult(null);
    },
    [difficulty],
  );

  const handleNewBoard = useCallback(() => {
    resetRound(startingPlayer);
  }, [resetRound, startingPlayer]);

  const handleResetMatch = useCallback(() => {
    setRoundsWon({ A: 0, B: 0 });
    setStartingPlayer("A");
    resetRound("A");
  }, [resetRound]);

  const handleChangeTeams = useCallback(() => {
    setIsTeamsReady(false);
    setRoundsWon({ A: 0, B: 0 });
    setStartingPlayer("A");
    setCurrentPlayer("A");
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setRoundResult(null);
    setBoard(buildBoard(difficulty));
  }, [difficulty]);

  const handleTeamNameChange = (player: Player, value: string) => {
    setTeamSetup((prev) => ({
      ...prev,
      [player]: { ...prev[player], name: value },
    }));
  };

  const handleTeamColorChange = (player: Player, color: string) => {
    setTeamSetup((prev) => ({
      ...prev,
      [player]: { ...prev[player], color },
    }));
  };

  const setupValidationError = useMemo(() => {
    const nameA = teamSetup.A.name.trim();
    const nameB = teamSetup.B.name.trim();

    if (!nameA || !nameB) return t("trainingTicTacToe.setup.namesRequired");
    if (teamSetup.A.color === teamSetup.B.color) return t("trainingTicTacToe.setup.colorsMustDiffer");
    return null;
  }, [t, teamSetup]);

  const handleStartWithTeams = () => {
    if (setupValidationError) return;
    setIsTeamsReady(true);
  };

  const handleDifficultyChange = useCallback((nextValue: string) => {
    const nextDifficulty = nextValue as Difficulty;
    setDifficulty(nextDifficulty);
    setRoundsWon({ A: 0, B: 0 });
    setStartingPlayer("A");
    setBoard(buildBoard(nextDifficulty));
    setCurrentPlayer("A");
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setRoundResult(null);
  }, []);

  const startNextRound = useCallback(() => {
    const nextStarter: Player = startingPlayer === "A" ? "B" : "A";
    setStartingPlayer(nextStarter);
    resetRound(nextStarter);
  }, [resetRound, startingPlayer]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }, []);

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingTarget = pendingCellId === null ? null : board.find((cell) => cell.id === pendingCellId)?.target ?? null;
  const winningLine = roundResult?.winningLine ?? [];

  return (
    <AppLayout hideNav={isFullscreen}>
      <header
        className={cn(
          "sticky top-0 z-40 bg-card/95 md:bg-card/80 md:backdrop-blur-md border-b border-border",
          isFullscreen && "md:hidden",
        )}
      >
        <div className="container mx-auto px-4 py-4 md:py-3 space-y-4 md:space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-display font-bold">{t("trainingTicTacToe.title")}</h1>
            <LanguageSwitch />
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
            <Select value={difficulty} onValueChange={handleDifficultyChange}>
              <SelectTrigger className="bg-black/20 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleNewBoard} className="border-white/15">
              {t("trainingTicTacToe.actions.newBoard")}
            </Button>
            <Button variant="outline" onClick={handleResetMatch} className="border-white/15">
              {t("trainingTicTacToe.actions.resetMatch")}
            </Button>
            {isTeamsReady && (
              <Button variant="outline" onClick={handleChangeTeams} className="border-white/15">
                {t("trainingTicTacToe.actions.changeTeams")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => void toggleFullscreen()}
              className="hidden md:inline-flex border-white/15"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {isFullscreen
                ? t("trainingTicTacToe.actions.exitFullscreen")
                : t("trainingTicTacToe.actions.enterFullscreen")}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="font-semibold">
                  <CircleHelp className="w-4 h-4 mr-2" />
                  {t("trainingTicTacToe.help.button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-card/95 border-white/10">
                <DialogHeader>
                  <DialogTitle>{t("trainingTicTacToe.help.title")}</DialogTitle>
                  <DialogDescription>{t("trainingTicTacToe.help.subtitle")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                      {t("trainingTicTacToe.rules.title")}
                    </h3>
                    <ul className="space-y-2 text-sm text-foreground">
                      <li>{t("trainingTicTacToe.rules.r1")}</li>
                      <li>{t("trainingTicTacToe.rules.r2")}</li>
                      <li>{t("trainingTicTacToe.rules.r3")}</li>
                      <li>{t("trainingTicTacToe.rules.r4")}</li>
                    </ul>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                      {t("trainingTicTacToe.levels.title")}
                    </h3>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {difficultyOptions.map((option) => (
                        <div
                          key={option.key}
                          className={`rounded-lg p-2.5 border ${option.key === difficulty ? "border-primary/40 bg-primary/10" : "border-white/10 bg-black/30"}`}
                        >
                          <p className="text-sm font-semibold text-foreground">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-sm text-muted-foreground">
            {t(`trainingTicTacToe.difficulty.${difficulty}.description`)}
          </p>
        </div>
      </header>

      <main
        className={cn(
          "container mx-auto px-4 py-6 md:py-4 pb-24 md:pb-4 relative",
          isFullscreen && "md:py-6 md:pb-6",
        )}
      >
        {!isTeamsReady && (
          <section className="glass-card rounded-2xl border border-white/10 p-5 md:p-6 mb-6">
            <h2 className="text-xl font-display font-bold mb-2">{t("trainingTicTacToe.setup.title")}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t("trainingTicTacToe.setup.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2">
              {(["A", "B"] as const).map((player) => (
                <div key={player} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {player === "A" ? t("trainingTicTacToe.setup.teamA") : t("trainingTicTacToe.setup.teamB")}
                  </p>
                  <Input
                    value={teamSetup[player].name}
                    onChange={(event) => handleTeamNameChange(player, event.target.value)}
                    placeholder={player === "A" ? t("trainingTicTacToe.players.playerA") : t("trainingTicTacToe.players.playerB")}
                    className="bg-black/20 border-white/10"
                  />
                  <div className="flex flex-wrap gap-2">
                    {teamColorOptions.map((color) => {
                      const selected = teamSetup[player].color === color;
                      return (
                        <button
                          key={`${player}-${color}`}
                          type="button"
                          onClick={() => handleTeamColorChange(player, color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            selected ? "border-white scale-110" : "border-transparent",
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`${player} color ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {setupValidationError && (
              <p className="text-sm text-amber-300 mt-4">{setupValidationError}</p>
            )}

            <div className="mt-5">
              <Button onClick={handleStartWithTeams} disabled={Boolean(setupValidationError)}>
                {t("trainingTicTacToe.setup.start")}
              </Button>
            </div>
          </section>
        )}

        {isTeamsReady && (
        <div
          className={cn(
            "grid gap-6 md:gap-5 md:grid-cols-[minmax(0,1fr)_520px] md:items-stretch",
            isFullscreen && "md:grid-cols-[minmax(0,1fr)_600px]",
          )}
        >
          <div className="space-y-6 md:space-y-4">
            <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: `${teamSetup.A.color}80`, backgroundColor: `${teamSetup.A.color}22` }}
                >
                  <p className="text-xs uppercase tracking-wider text-white/90">{teamSetup.A.name}</p>
                  <p className="text-2xl font-display font-bold">{roundsWon.A}</p>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: `${teamSetup.B.color}80`, backgroundColor: `${teamSetup.B.color}22` }}
                >
                  <p className="text-xs uppercase tracking-wider text-white/90">{teamSetup.B.name}</p>
                  <p className="text-2xl font-display font-bold">{roundsWon.B}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("trainingTicTacToe.status.currentTurn", { player: teamSetup[currentPlayer].name })}
              </p>
            </section>

            <TicTacToeBoard
              board={board}
              pendingCellId={pendingCellId}
              winningLine={winningLine}
              players={teamSetup}
              guides={cardGuides}
              strings={{
                target: t("trainingTicTacToe.board.target"),
                open: t("trainingTicTacToe.board.open"),
                pending: t("trainingTicTacToe.board.pending"),
                guideTitle: t("trainingTicTacToe.board.guideTitle"),
                easiest: t("trainingTicTacToe.board.easiest"),
                fastest: t("trainingTicTacToe.board.fastest"),
                noFinish: t("trainingTicTacToe.board.noFinish"),
                lockNow: t("trainingTicTacToe.board.lockNow"),
              }}
            />
          </div>

          <div className="space-y-6 md:space-y-4 h-full">
            <TicTacToeTurnPanel
              currentPlayer={currentPlayer}
              currentPlayerName={teamSetup[currentPlayer].name}
              currentPlayerColor={teamSetup[currentPlayer].color}
              throwsThisTurn={throwsThisTurn}
              pendingTarget={pendingTarget}
              disabled={Boolean(roundResult)}
              className="h-full"
              strings={{
                selectHint: t("trainingTicTacToe.turn.selectHint"),
                miss: t("trainingTicTacToe.turn.miss"),
                undo: t("trainingTicTacToe.turn.undo"),
                lockSquare: t("trainingTicTacToe.turn.lockSquare"),
                throwLabel: t("trainingTicTacToe.turn.throw"),
                activePlayer: t("trainingTicTacToe.turn.activePlayer"),
                single: t("trainingTicTacToe.turn.single"),
                double: t("trainingTicTacToe.turn.double"),
                triple: t("trainingTicTacToe.turn.triple"),
                total: t("trainingTicTacToe.turn.total"),
                quick25: t("trainingTicTacToe.turn.quick25"),
              }}
              onAddThrow={handleAddThrow}
              onUndoThrow={handleUndoThrow}
              onLockSquare={handleLockSquare}
            />
          </div>
        </div>
        )}

        <div className="space-y-6 mt-6 md:hidden">
          <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              {t("trainingTicTacToe.rules.title")}
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("trainingTicTacToe.rules.r1")}</li>
              <li>{t("trainingTicTacToe.rules.r2")}</li>
              <li>{t("trainingTicTacToe.rules.r3")}</li>
              <li>{t("trainingTicTacToe.rules.r4")}</li>
            </ul>
          </section>

          <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
              {t("trainingTicTacToe.levels.title")}
            </h2>
            <div className="space-y-2">
              {difficultyOptions.map((option) => (
                <div
                  key={option.key}
                  className={`rounded-xl p-3 border ${option.key === difficulty ? "border-primary/40 bg-primary/10" : "border-white/10 bg-black/20"}`}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {roundResult && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-30 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-card rounded-2xl border border-white/10 p-6 text-center space-y-4">
              <h2 className="text-2xl font-display font-bold">
                {roundResult.isDraw
                  ? t("trainingTicTacToe.result.draw")
                  : t("trainingTicTacToe.result.winner", {
                    player: roundResult.winner ? teamSetup[roundResult.winner].name : "",
                  })}
              </h2>
              <p className="text-sm text-muted-foreground">{t("trainingTicTacToe.result.subtitle")}</p>
              <Button onClick={startNextRound} className="w-full">
                {t("trainingTicTacToe.actions.nextRound")}
              </Button>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}

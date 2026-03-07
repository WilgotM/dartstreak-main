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
import { DartboardSvg, type DartboardClickPoint, type DartboardMarker } from "@/components/training/DartboardSvg";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Infinity as InfinityIcon, Minus, Plus, Target as TargetIcon, Trophy, User, Zap } from "lucide-react";
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

interface BullThrow {
  player: Player;
  x: number;
  y: number;
  distance: number;
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
const TOP_TIE_THRESHOLD = 1.0;

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
  const [targetLegs, setTargetLegs] = useState<number>(0);
  const [matchWinner, setMatchWinner] = useState<Player | null>(null);
  const [isWaitingForTurnSwitch, setIsWaitingForTurnSwitch] = useState(false);
  const [isBullDeciderActive, setIsBullDeciderActive] = useState(false);
  const [bullThrows, setBullThrows] = useState<BullThrow[]>([]);

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

  const noPossibleSquares = isWaitingForTurnSwitch;
  const bullCurrentPlayer: Player | null = bullThrows.length === 0 ? "A" : bullThrows.length === 1 ? "B" : null;
  const isBullRoundComplete = bullThrows.length === 2;
  const bullRanking = useMemo(() => [...bullThrows].sort((a, b) => a.distance - b.distance), [bullThrows]);
  const bullTopPlayers = useMemo(() => {
    if (!isBullRoundComplete || bullRanking.length === 0) return [];
    const bestDistance = bullRanking[0].distance;
    return bullRanking.filter((entry) => Math.abs(entry.distance - bestDistance) <= TOP_TIE_THRESHOLD);
  }, [bullRanking, isBullRoundComplete]);
  const bullTieNames = useMemo(
    () => bullTopPlayers.map((entry) => teamSetup[entry.player].name).join(", "),
    [bullTopPlayers, teamSetup],
  );
  const bullMarkers = useMemo<DartboardMarker[]>(
    () =>
      bullThrows.map((entry, index) => ({
        x: entry.x,
        y: entry.y,
        color: teamSetup[entry.player].color,
        label: String(index + 1),
      })),
    [bullThrows, teamSetup],
  );

  const endTurnWithoutClaim = useCallback(() => {
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setIsWaitingForTurnSwitch(false);
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
          setRoundsWon((prev) => {
            const newScore = prev[evaluated.winner] + 1;
            if (targetLegs > 0 && newScore >= targetLegs) {
              setMatchWinner(evaluated.winner);
            }
            return {
              ...prev,
              [evaluated.winner]: newScore,
            };
          });
        }
        return;
      }

      setCurrentPlayer((prev) => (prev === "A" ? "B" : "A"));
    },
    [board, currentPlayer, roundResult, targetLegs],
  );

  const handleAddThrow = useCallback(
    (throwEntry: ThrowInputEntry) => {
      if (roundResult || throwsThisTurn.length >= 3) return;

      const integerScore = Math.trunc(throwEntry.score);
      if (!Number.isInteger(integerScore) || integerScore < 0 || integerScore > 180) return;

      const nextThrows = [...throwsThisTurn, throwEntry];
      const nextPendingCellId = recomputePendingCell(board, nextThrows, finishOnDouble);

      if (nextThrows.length < 3) {
        const nextRemainingDarts = 3 - nextThrows.length;
        const nextTurnTotal = nextThrows.reduce((sum, item) => sum + item.score, 0);
        
        const anyCellPossible = board.some((cell) => {
          if (cell.owner) return false;
          const routes = findCheckoutRoutes({
            currentTotal: nextTurnTotal,
            target: cell.target,
            dartsLeft: nextRemainingDarts,
            finishOnDouble,
          });
          return Boolean(pickEasiestRoute(routes) || pickFastestRoute(routes));
        });

        setThrowsThisTurn(nextThrows);
        setPendingCellId(nextPendingCellId);

        if (!anyCellPossible && nextPendingCellId === null) {
          setIsWaitingForTurnSwitch(true);
          setTimeout(() => {
            endTurnWithoutClaim();
          }, 1500);
        }
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
    setMatchWinner(null);
    resetRound("A");
  }, [resetRound]);

  const handleChangeTeams = useCallback(() => {
    setIsTeamsReady(false);
    setIsBullDeciderActive(false);
    setBullThrows([]);
    setRoundsWon({ A: 0, B: 0 });
    setStartingPlayer("A");
    setCurrentPlayer("A");
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setRoundResult(null);
    setMatchWinner(null);
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
    setBullThrows([]);
    setIsBullDeciderActive(true);
  };

  const handleRegisterBullThrow = useCallback((point: DartboardClickPoint) => {
    setBullThrows((previous) => {
      const nextPlayer: Player | null = previous.length === 0 ? "A" : previous.length === 1 ? "B" : null;
      if (!nextPlayer) return previous;
      return [
        ...previous,
        {
          player: nextPlayer,
          x: point.x,
          y: point.y,
          distance: point.distance,
        },
      ];
    });
  }, []);

  const handleUndoBullThrow = useCallback(() => {
    if (bullThrows.length === 0) return;
    setBullThrows((previous) => previous.slice(0, -1));
  }, [bullThrows.length]);

  const handleRestartBullRound = useCallback(() => {
    setBullThrows([]);
  }, []);

  const handleCancelBullDecider = useCallback(() => {
    setBullThrows([]);
    setIsBullDeciderActive(false);
  }, []);

  const handleConfirmBullStarter = useCallback(() => {
    if (!isBullRoundComplete || bullRanking.length === 0) return;
    if (bullTopPlayers.length > 1) return;

    const starter = bullRanking[0].player;
    setStartingPlayer(starter);
    setCurrentPlayer(starter);
    setBoard(buildBoard(difficulty));
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setRoundResult(null);
    setMatchWinner(null);
    setRoundsWon({ A: 0, B: 0 });
    setBullThrows([]);
    setIsBullDeciderActive(false);
    setIsTeamsReady(true);
  }, [bullRanking, bullTopPlayers.length, difficulty, isBullRoundComplete]);

  const handleDifficultyChange = useCallback((nextValue: string) => {
    const nextDifficulty = nextValue as Difficulty;
    setDifficulty(nextDifficulty);
    setIsBullDeciderActive(false);
    setBullThrows([]);
    setRoundsWon({ A: 0, B: 0 });
    setStartingPlayer("A");
    setBoard(buildBoard(nextDifficulty));
    setCurrentPlayer("A");
    setThrowsThisTurn([]);
    setPendingCellId(null);
    setRoundResult(null);
    setMatchWinner(null);
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
          "px-3 pb-3 pt-3",
          isFullscreen && "md:hidden",
        )}
      >
        <div className="container mx-auto rounded-3xl border border-white/10 bg-[#12121A]/88 px-4 py-5 md:px-6 md:py-6 space-y-4 shadow-[0_20px_50px_-26px_rgba(0,0,0,0.75)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.2),transparent_38%),radial-gradient(circle_at_20%_95%,rgba(16,185,129,0.15),transparent_45%)]" />
          <div className="relative space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">{t("trainingHub.title")}</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{t("trainingTicTacToe.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`trainingTicTacToe.difficulty.${difficulty}.description`)}
            </p>
          </div>

          <div className="relative grid gap-2 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto_auto]">
            <Select value={difficulty} onValueChange={handleDifficultyChange}>
              <SelectTrigger>
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

            <Button variant="outline" onClick={handleNewBoard}>
              {t("trainingTicTacToe.actions.newBoard")}
            </Button>
            <Button variant="outline" onClick={handleResetMatch}>
              {t("trainingTicTacToe.actions.resetMatch")}
            </Button>
            {isTeamsReady && (
              <Button variant="outline" onClick={handleChangeTeams}>
                {t("trainingTicTacToe.actions.changeTeams")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => void toggleFullscreen()}
              className="hidden md:inline-flex"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {isFullscreen
                ? t("trainingTicTacToe.actions.exitFullscreen")
                : t("trainingTicTacToe.actions.enterFullscreen")}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-semibold">
                  <CircleHelp className="w-4 h-4 mr-2" />
                  {t("trainingTicTacToe.help.button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-[#12121A]/96 border-white/12">
                <DialogHeader>
                  <DialogTitle>{t("trainingTicTacToe.help.title")}</DialogTitle>
                  <DialogDescription>{t("trainingTicTacToe.help.subtitle")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-xl border border-white/10 bg-[#15151D] p-4">
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

                  <section className="rounded-xl border border-white/10 bg-[#15151D] p-4">
                    <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                      {t("trainingTicTacToe.levels.title")}
                    </h3>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {difficultyOptions.map((option) => (
                        <div
                          key={option.key}
                          className={`rounded-lg p-2.5 border ${option.key === difficulty ? "border-primary/40 bg-primary/10" : "border-white/10 bg-[#101017]"}`}
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
        </div>
      </header>

      <main
        className={cn(
          "container mx-auto px-4 py-6 md:py-4 pb-24 md:pb-4 relative",
          isFullscreen && "md:py-6 md:pb-6",
        )}
      >
        <AnimatePresence mode="wait">
          {!isTeamsReady && !isBullDeciderActive && (
            <motion.section
              key="setup"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)", transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl border border-white/10 p-5 md:p-6 mb-6 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              >
                <h2 className="text-2xl font-display font-bold mb-1 tracking-tight">{t("trainingTicTacToe.setup.title")}</h2>
                <p className="text-sm text-muted-foreground mb-6 font-light">{t("trainingTicTacToe.setup.subtitle")}</p>
              </motion.div>

              <div className="grid gap-4 md:grid-cols-2">
                {(["A", "B"] as const).map((player, index) => (
                  <motion.div
                    key={player}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-xl border border-white/10 bg-[#15151D] p-5 space-y-4 shadow-lg relative overflow-hidden group"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                      style={{ backgroundImage: `linear-gradient(to bottom right, ${teamSetup[player].color}, transparent)` }}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground/80 mt-[-1px]" />
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                        {player === "A" ? t("trainingTicTacToe.setup.teamA") : t("trainingTicTacToe.setup.teamB")}
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                    
                    <Input
                      value={teamSetup[player].name}
                      onChange={(event) => handleTeamNameChange(player, event.target.value)}
                      placeholder={player === "A" ? t("trainingTicTacToe.players.playerA") : t("trainingTicTacToe.players.playerB")}
                      className="bg-[#11111A] border-white/12 h-11 transition-all focus-visible:ring-1 focus-visible:ring-white/30"
                    />
                    
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {teamColorOptions.map((color) => {
                        const selected = teamSetup[player].color === color;
                        return (
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            key={`${player}-${color}`}
                            type="button"
                            onClick={() => handleTeamColorChange(player, color)}
                            className={cn(
                              "relative w-8 h-8 rounded-full border-2 transition-all shadow-md outline-none",
                              selected ? "scale-110 shadow-lg z-10" : "border-transparent opacity-80 hover:opacity-100",
                            )}
                            style={{ 
                              backgroundColor: color, 
                              borderColor: selected ? '#ffffff' : 'transparent',
                              boxShadow: selected ? `0 0 15px ${color}80` : undefined
                            }}
                            aria-label={`${player} color ${color}`}
                          >
                            {selected && (
                              <motion.div 
                                layoutId={`selected-color-${player}`}
                                className="absolute inset-[-4px] rounded-full border border-white/40 pointer-events-none"
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
                
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-white/10 bg-[#15151D] p-5 md:col-span-2 shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                      {t("trainingTicTacToe.levels.title", "Svårighetsgrad")}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {difficultyOptions.map((option) => {
                      const isSelected = difficulty === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => handleDifficultyChange(option.key)}
                          className={cn(
                            "px-4 py-2 rounded-xl border transition-all duration-300 text-sm font-semibold relative overflow-hidden outline-none",
                            isSelected 
                              ? "border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_15px_-3px_rgba(251,191,36,0.3)]" 
                              : "border-white/10 bg-[#101017] text-muted-foreground hover:border-white/20 hover:text-foreground hover:bg-[#1a1a24]"
                          )}
                        >
                          <span className="relative z-10">{option.label}</span>
                          {isSelected && (
                            <motion.div
                              layoutId="active-ttt-diff"
                              className="absolute inset-0 bg-amber-400/5 pointer-events-none"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground border-l-2 border-amber-500/30 pl-3">
                    {t(`trainingTicTacToe.difficulty.${difficulty}.description`)}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-white/10 bg-[#15151D] p-5 md:col-span-2 shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                      {t("trainingTicTacToe.setup.legsToWin")}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetLegs(0)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 overflow-hidden",
                        targetLegs === 0
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
                          : "border-white/10 bg-[#101017] hover:border-white/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <InfinityIcon className={cn("w-6 h-6 transition-transform duration-500", targetLegs === 0 ? "scale-110" : "")} />
                      <span className="text-sm font-semibold tracking-tight">{t("trainingTicTacToe.setup.unlimited")}</span>
                      <span className="text-xs opacity-70 font-light">{t("trainingTicTacToe.setup.practiceDesc")}</span>
                      {targetLegs === 0 && (
                        <motion.div
                          layoutId="active-match-mode"
                          className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetLegs((prev) => (prev === 0 ? 3 : prev))}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 overflow-hidden",
                        targetLegs > 0
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
                          : "border-white/10 bg-[#101017] hover:border-white/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <TargetIcon className={cn("w-6 h-6 transition-transform duration-500", targetLegs > 0 ? "scale-110" : "")} />
                      <span className="text-sm font-semibold tracking-tight">{t("trainingTicTacToe.setup.matchDesc")}</span>
                      <span className="text-xs opacity-70 font-light">
                        {targetLegs > 0
                          ? t("trainingTicTacToe.setup.firstTo") + ` ${targetLegs}`
                          : t("trainingTicTacToe.setup.matchDesc")}
                      </span>
                      {targetLegs > 0 && (
                        <motion.div
                          layoutId="active-match-mode"
                          className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {targetLegs > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-5">
                          <div className="flex items-center justify-center gap-6 bg-[#101017] rounded-xl p-5 border border-white/10 shadow-inner">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="h-12 w-12 rounded-full border border-white/10 hover:bg-secondary flex items-center justify-center bg-[#15151D] text-muted-foreground hover:text-foreground transition-colors outline-none"
                              onClick={() => setTargetLegs((prev) => Math.max(1, prev - 1))}
                            >
                              <Minus className="w-5 h-5" />
                            </motion.button>
                            <div className="text-center min-w-[80px]">
                              <motion.span
                                key={targetLegs}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="block text-4xl font-display font-bold tabular-nums text-foreground leading-none mb-1"
                              >
                                {targetLegs}
                              </motion.span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {t("trainingTicTacToe.setup.legsToWin")}
                              </span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="h-12 w-12 rounded-full border border-white/10 hover:bg-secondary flex items-center justify-center bg-[#15151D] text-muted-foreground hover:text-foreground transition-colors outline-none"
                              onClick={() => setTargetLegs((prev) => Math.min(20, prev + 1))}
                            >
                              <Plus className="w-5 h-5" />
                            </motion.button>
                          </div>

                          <div className="flex justify-center gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar mask-gradient-x px-2">
                            {[1, 3, 5, 7, 10, 15].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTargetLegs(val)}
                                className={cn(
                                  "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300",
                                  targetLegs === val
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105"
                                    : "bg-[#101017] text-muted-foreground border-white/10 hover:border-white/30 hover:bg-secondary/40 hover:text-foreground",
                                )}
                              >
                                {t("trainingTicTacToe.setup.firstTo")} {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              <AnimatePresence>
                {setupValidationError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-amber-300 mt-4 overflow-hidden"
                  >
                    {setupValidationError}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-6 flex justify-end"
              >
                <Button 
                  size="lg"
                  onClick={handleStartWithTeams} 
                  disabled={Boolean(setupValidationError)}
                  className="px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow rounded-xl font-semibold"
                >
                  {t("trainingTicTacToe.setup.start")}
                </Button>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isBullDeciderActive && !isTeamsReady && (
            <motion.section
              key="bull-decider"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "glass-card rounded-2xl border border-white/10 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden mb-6 shadow-2xl",
                isBullRoundComplete ? "space-y-2 md:space-y-3" : "space-y-4 md:space-y-6 min-h-[50vh]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16),transparent_50%)] pointer-events-none" />

              <AnimatePresence>
                {!isBullRoundComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-center space-y-1 md:space-y-2 relative z-10"
                  >
                    <h2 className="text-2xl md:text-4xl font-display font-bold text-white drop-shadow-md tracking-tight">
                      {t("trainingTicTacToe.bullDecider.title")}
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base font-light">{t("trainingTicTacToe.bullDecider.subtitle")}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center gap-2 md:gap-3 relative z-10 w-full">
                <AnimatePresence mode="popLayout">
                  {bullCurrentPlayer && !isBullRoundComplete ? (
                    <motion.div
                      key="current-throw"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
                      transition={{ type: "spring", bounce: 0.4, duration: 0.6, delay: 0.2 }}
                      className="bg-cyan-500/10 border border-cyan-500/25 px-8 py-2.5 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                    >
                      <p className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase" style={{ color: teamSetup[bullCurrentPlayer].color, textShadow: `0 0 10px ${teamSetup[bullCurrentPlayer].color}80` }}>
                        {t("trainingTicTacToe.bullDecider.currentThrow", { player: teamSetup[bullCurrentPlayer].name })}
                      </p>
                    </motion.div>
                  ) : !isBullRoundComplete ? (
                    <motion.div key="spacer" className="h-[40px] md:h-[50px] opacity-0" />
                  ) : null}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-4 opacity-70"
                >
                  <p className="text-xs md:text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
                    {t("trainingTicTacToe.bullDecider.registered", { count: bullThrows.length, total: 2 })}
                  </p>
                  <p className="text-xs md:text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
                    {t("trainingTicTacToe.bullDecider.left", { count: Math.max(2 - bullThrows.length, 0) })}
                  </p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.3 }}
                className={cn("relative z-10 w-full flex justify-center", isBullRoundComplete ? "py-0" : "py-2")}
              >
                <DartboardSvg
                  dangerNumbers={new Set<number>()}
                  markers={bullMarkers}
                  onBoardClick={bullCurrentPlayer && !isBullRoundComplete ? handleRegisterBullThrow : undefined}
                  className={cn(
                    "drop-shadow-[0_0_35px_rgba(6,182,212,0.15)] transition-all duration-700 ease-in-out block",
                    !isBullRoundComplete 
                      ? "w-full max-w-[320px] sm:max-w-[420px] md:max-w-[55vh] lg:max-w-[60vh] xl:max-w-[650px]" 
                      : "w-full max-w-[140px] md:max-w-[180px]",
                    bullCurrentPlayer && !isBullRoundComplete ? "cursor-crosshair hover:scale-[1.02]" : "opacity-90 grayscale-0",
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-wrap justify-center gap-2 md:gap-3 relative z-10"
              >
                <Button variant="outline" className="px-5 border-white/10 hover:bg-white/5 rounded-full" onClick={handleUndoBullThrow} disabled={bullThrows.length === 0}>
                  {t("trainingTicTacToe.turn.undo")}
                </Button>
                <Button variant="outline" className="px-5 border-white/10 hover:bg-white/5 rounded-full" onClick={handleRestartBullRound}>
                  {t("trainingTicTacToe.bullDecider.rethrow")}
                </Button>
                <Button variant="ghost" className="px-5 rounded-full hover:bg-white/5" onClick={handleCancelBullDecider}>
                  {t("trainingTicTacToe.bullDecider.cancel")}
                </Button>
              </motion.div>

              <AnimatePresence>
                {bullRanking.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm md:max-w-base space-y-1.5 md:space-y-2 bg-black/40 p-2.5 md:p-4 rounded-2xl border border-white/5 relative z-10"
                  >
                    {bullRanking.map((entry, index) => (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                        key={`ttt-bull-${entry.player}`}
                        className={cn(
                          "rounded-xl border p-3 flex items-center justify-between transition-all duration-300",
                          index === 0
                            ? "border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]"
                            : "border-white/5 bg-[#12121A] opacity-80",
                        )}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <span className={cn("flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs md:text-sm font-bold shadow-inner", index === 0 ? "bg-amber-400 text-black" : "bg-white/10 text-white")}>
                            {index + 1}
                          </span>
                          <span className={cn("text-base md:text-lg font-semibold tracking-tight", index === 0 ? "text-white" : "text-foreground")}>
                            {teamSetup[entry.player].name}
                          </span>
                        </div>
                        <span className="text-cyan-400 font-mono text-sm md:text-base font-semibold tracking-tighter bg-cyan-950/40 px-3 py-1 rounded-lg">
                          {t("trainingTicTacToe.bullDecider.distance", { distance: entry.distance.toFixed(1) })}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isBullRoundComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.4, duration: 0.6, delay: 0.2 }}
                    className="relative z-10 w-full max-w-sm md:max-w-lg mt-2 text-center"
                  >
                    <div className="rounded-2xl border border-emerald-500/30 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_70%)] bg-black/40 p-3 md:p-5 text-center shadow-[0_0_40px_rgba(16,185,129,0.15)] mb-3 md:mb-4 backdrop-blur-md">
                      {bullTopPlayers.length > 1 ? (
                        <motion.p
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-lg md:text-xl font-bold text-amber-300"
                        >
                          {t("trainingTicTacToe.bullDecider.tie", { players: bullTieNames })}
                        </motion.p>
                      ) : (
                        <motion.p
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.6 }}
                          className="text-2xl md:text-3xl font-display font-bold text-emerald-400 drop-shadow-sm tracking-tight"
                        >
                          {t("trainingTicTacToe.bullDecider.winner", { player: teamSetup[bullRanking[0].player].name })}
                        </motion.p>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className={cn(
                        "w-full text-base md:text-lg h-12 md:h-14 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.03] font-bold tracking-wide",
                        bullTopPlayers.length > 1 ? "bg-amber-600 hover:bg-amber-500" : "bg-cyan-600 hover:bg-cyan-500 text-white",
                      )}
                      onClick={handleConfirmBullStarter}
                      disabled={!isBullRoundComplete || bullTopPlayers.length > 1}
                    >
                      {t("trainingTicTacToe.bullDecider.start")}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {isTeamsReady && (
          <div
            className={cn(
              "grid gap-4 xl:grid-cols-12 xl:items-start",
              isFullscreen && "xl:min-h-[calc(100vh-10rem)]",
            )}
          >
            <aside className="space-y-4 xl:col-span-3">
              <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: `${teamSetup.A.color}80`, backgroundColor: `${teamSetup.A.color}22` }}
                  >
                    <p className="text-xs uppercase tracking-wider text-foreground/90">{teamSetup.A.name}</p>
                    <p className="text-2xl font-display font-bold">{roundsWon.A}</p>
                  </div>
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: `${teamSetup.B.color}80`, backgroundColor: `${teamSetup.B.color}22` }}
                  >
                    <p className="text-xs uppercase tracking-wider text-foreground/90">{teamSetup.B.name}</p>
                    <p className="text-2xl font-display font-bold">{roundsWon.B}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground flex justify-between items-center">
                  <span>{t("trainingTicTacToe.status.currentTurn", { player: teamSetup[currentPlayer].name })}</span>
                  {targetLegs > 0 && (
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                      {t("trainingTicTacToe.status.firstTo", { legs: targetLegs })}
                    </span>
                  )}
                </p>
              </section>

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
            </aside>

            <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5 xl:col-span-5">
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
            </section>

            <aside className="space-y-4 h-full xl:col-span-4">
              <TicTacToeTurnPanel
                currentPlayer={currentPlayer}
                currentPlayerName={teamSetup[currentPlayer].name}
                currentPlayerColor={teamSetup[currentPlayer].color}
                throwsThisTurn={throwsThisTurn}
                pendingTarget={pendingTarget}
                noPossibleSquares={noPossibleSquares}
                disabled={Boolean(roundResult) || isWaitingForTurnSwitch}
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
                  noPossibleSquares: t("trainingTicTacToe.turn.noPossibleSquares"),
                }}
                onAddThrow={handleAddThrow}
                onUndoThrow={handleUndoThrow}
                onLockSquare={handleLockSquare}
                className={cn(
                  "xl:max-h-[calc(100vh-10rem)]",
                  isFullscreen && "xl:max-h-[calc(100vh-7rem)]",
                )}
              />
            </aside>
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
                  className={`rounded-xl p-3 border ${option.key === difficulty ? "border-primary/40 bg-primary/10" : "border-white/10 bg-[#11111A]"}`}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <AnimatePresence>
          {(roundResult || matchWinner) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full max-w-sm"
              >
                {matchWinner ? (
                  <div className="relative glass-card border border-primary/20 bg-gradient-to-b from-[#111118] to-[#0A0A10] rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

                    <motion.div
                      animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20 text-foreground relative z-10"
                    >
                      <Trophy className="w-12 h-12" />
                    </motion.div>

                    <h2 className="text-3xl font-display font-bold text-foreground mb-2 relative z-10">
                      {t("trainingTicTacToe.result.matchWinner")}
                    </h2>

                    <p className="text-xl font-medium text-primary mb-8 relative z-10">
                      {teamSetup[matchWinner].name}
                    </p>

                    <div className="flex items-center justify-center gap-6 mb-8 relative z-10 bg-[#14141C] rounded-2xl p-4 border border-white/10">
                      <div className="text-center">
                        <span className="text-3xl font-bold block text-foreground">{roundsWon.A}</span>
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase tracking-wider font-bold">
                          {teamSetup.A.name}
                        </span>
                      </div>
                      <div className="text-xl text-muted-foreground font-light px-2">-</div>
                      <div className="text-center">
                        <span className="text-3xl font-bold block text-foreground">{roundsWon.B}</span>
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground uppercase tracking-wider font-bold">
                          {teamSetup.B.name}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleResetMatch}
                      size="lg"
                      className="w-full rounded-xl font-bold text-base h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all relative z-10"
                    >
                      {t("trainingTicTacToe.result.playAgain")}
                    </Button>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl border border-white/10 p-6 text-center space-y-4 shadow-xl">
                    <h2 className="text-2xl font-display font-bold">
                      {roundResult?.isDraw
                        ? t("trainingTicTacToe.result.draw")
                        : t("trainingTicTacToe.result.winner", {
                          player: roundResult?.winner ? teamSetup[roundResult.winner].name : "",
                        })}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("trainingTicTacToe.result.subtitle")}</p>
                    <Button onClick={startNextRound} className="w-full h-11 text-base">
                      {t("trainingTicTacToe.actions.nextRound")}
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </AppLayout>
  );
}

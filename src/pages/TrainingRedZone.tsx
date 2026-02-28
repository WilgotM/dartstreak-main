import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Maximize, Minimize, Plus, RotateCcw, Skull, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DartboardSvg, type DartboardClickPoint, type DartboardMarker } from "@/components/training/DartboardSvg";
import { AnimatePresence, motion } from "framer-motion";

interface SetupPlayer {
  id: string;
  name: string;
  color: string;
}

interface GamePlayer extends SetupPlayer {
  isEliminated: boolean;
  eliminatedRound: number | null;
}

interface ThrowEntry {
  playerId: string;
  hitDangerDart: 1 | 2 | 3 | null;
}

interface RoundLog {
  round: number;
  dangerNumbers: number[];
  entries: ThrowEntry[];
  eliminatedIds: string[];
}

interface BullThrow {
  playerId: string;
  x: number;
  y: number;
  distance: number;
}

const BOARD_RING = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const START_TARGET = 20;
const MAX_PLAYERS = 8;
const TOP_TIE_THRESHOLD = 1.0;

const PLAYER_COLORS = [
  "#3B82F6",
  "#F43F5E",
  "#10B981",
  "#F59E0B",
  "#A855F7",
  "#06B6D4",
  "#EF4444",
  "#22C55E",
];

const START_INDEX = BOARD_RING.indexOf(START_TARGET);

const getExpansionStepNumbers = (step: number): number[] => {
  if (step <= 0) return [START_TARGET];

  const left = BOARD_RING[(START_INDEX - step + BOARD_RING.length) % BOARD_RING.length];
  const right = BOARD_RING[(START_INDEX + step) % BOARD_RING.length];

  return left === right ? [left] : [left, right];
};

const getDangerNumbers = (radius: number): number[] => {
  const dangerSet = new Set<number>();

  for (let step = 0; step <= radius; step += 1) {
    const left = BOARD_RING[(START_INDEX - step + BOARD_RING.length) % BOARD_RING.length];
    const right = BOARD_RING[(START_INDEX + step) % BOARD_RING.length];
    dangerSet.add(left);
    dangerSet.add(right);
  }

  return BOARD_RING.filter((number) => dangerSet.has(number));
};

export default function TrainingRedZone() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [setupPlayers, setSetupPlayers] = useState<SetupPlayer[]>(() => [
    { id: "setup-1", name: "Player 1", color: PLAYER_COLORS[0] },
    { id: "setup-2", name: "Player 2", color: PLAYER_COLORS[1] },
  ]);
  const [playerCounter, setPlayerCounter] = useState(2);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [round, setRound] = useState(1);
  const [dangerRadius, setDangerRadius] = useState(0);
  const [roundOrder, setRoundOrder] = useState<string[]>([]);
  const [roundEntries, setRoundEntries] = useState<ThrowEntry[]>([]);
  const [history, setHistory] = useState<RoundLog[]>([]);
  const [result, setResult] = useState<{ winners: string[]; isDraw: boolean } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [isBullDeciderActive, setIsBullDeciderActive] = useState(false);
  const [bullPlayers, setBullPlayers] = useState<SetupPlayer[]>([]);
  const [bullThrows, setBullThrows] = useState<BullThrow[]>([]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!isGameStarted) {
      setSetupPlayers((previous) =>
        previous.map((player, index) => ({
          ...player,
          name: player.name.startsWith("Player ")
            ? t("trainingRedZone.setup.playerDefault", { index: index + 1 })
            : player.name,
        })),
      );
    }
  }, [isGameStarted, t]);

  const setupError = useMemo(() => {
    if (setupPlayers.length < 2) return t("trainingRedZone.setup.minPlayers");

    const trimmedNames = setupPlayers.map((player) => player.name.trim());
    if (trimmedNames.some((name) => !name)) return t("trainingRedZone.setup.namesRequired");

    const normalized = trimmedNames.map((name) => name.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      return t("trainingRedZone.setup.duplicateNames");
    }

    return null;
  }, [setupPlayers, t]);

  const dangerNumbers = useMemo(() => getDangerNumbers(dangerRadius), [dangerRadius]);
  const dangerNumberSet = useMemo(() => new Set(dangerNumbers), [dangerNumbers]);
  const newlyAddedSet = useMemo(
    () => new Set(getExpansionStepNumbers(dangerRadius)),
    [dangerRadius],
  );
  const nextExpansionNumbers = useMemo(
    () => dangerRadius >= 10 ? [] : getExpansionStepNumbers(dangerRadius + 1),
    [dangerRadius],
  );

  const playerNameById = useMemo(
    () => new Map(players.map((player) => [player.id, player.name])),
    [players],
  );

  const alivePlayers = useMemo(
    () => players.filter((player) => !player.isEliminated),
    [players],
  );

  const currentPlayerId = roundOrder[roundEntries.length] ?? null;
  const currentPlayer = useMemo(
    () => players.find((player) => player.id === currentPlayerId) ?? null,
    [currentPlayerId, players],
  );
  const bullCurrentPlayer = bullPlayers[bullThrows.length] ?? null;
  const isBullRoundComplete = bullPlayers.length > 0 && bullThrows.length === bullPlayers.length;
  const bullPlayerById = useMemo(
    () => new Map(bullPlayers.map((player) => [player.id, player])),
    [bullPlayers],
  );
  const bullRanking = useMemo(
    () => [...bullThrows].sort((a, b) => a.distance - b.distance),
    [bullThrows],
  );
  const bullTopPlayers = useMemo(() => {
    if (!isBullRoundComplete || bullRanking.length === 0) return [];
    const bestDistance = bullRanking[0].distance;
    return bullRanking.filter((entry) => Math.abs(entry.distance - bestDistance) <= TOP_TIE_THRESHOLD);
  }, [bullRanking, isBullRoundComplete]);
  const bullTieNames = useMemo(
    () =>
      bullTopPlayers
        .map((entry) => bullPlayerById.get(entry.playerId)?.name ?? entry.playerId)
        .join(", "),
    [bullPlayerById, bullTopPlayers],
  );
  const bullMarkers = useMemo<DartboardMarker[]>(
    () =>
      bullThrows.map((entry, index) => ({
        x: entry.x,
        y: entry.y,
        color: bullPlayerById.get(entry.playerId)?.color ?? "#94A3B8",
        label: String(index + 1),
      })),
    [bullPlayerById, bullThrows],
  );

  const resolvePlayerName = useCallback(
    (id: string): string => playerNameById.get(id) ?? id,
    [playerNameById],
  );

  const handleSetupNameChange = useCallback((id: string, value: string) => {
    setSetupPlayers((previous) =>
      previous.map((player) => (player.id === id ? { ...player, name: value } : player)),
    );
  }, []);

  const handleSetupColorChange = useCallback((id: string, color: string) => {
    setSetupPlayers((previous) =>
      previous.map((player) => (player.id === id ? { ...player, color } : player)),
    );
  }, []);

  const handleAddPlayer = useCallback(() => {
    if (setupPlayers.length >= MAX_PLAYERS) return;

    const nextIndex = playerCounter + 1;
    setSetupPlayers((previous) => [
      ...previous,
      {
        id: `setup-${nextIndex}`,
        name: t("trainingRedZone.setup.playerDefault", { index: nextIndex }),
        color: PLAYER_COLORS[previous.length % PLAYER_COLORS.length],
      },
    ]);
    setPlayerCounter(nextIndex);
  }, [playerCounter, setupPlayers.length, t]);

  const handleRemovePlayer = useCallback((id: string) => {
    setSetupPlayers((previous) => {
      if (previous.length <= 2) return previous;
      return previous.filter((player) => player.id !== id);
    });
  }, []);

  const startGameFromPlayers = useCallback((basePlayers: SetupPlayer[]) => {
    const gamePlayers: GamePlayer[] = basePlayers.map((player) => ({
      ...player,
      name: player.name.trim(),
      isEliminated: false,
      eliminatedRound: null,
    }));

    setPlayers(gamePlayers);
    setRound(1);
    setDangerRadius(0);
    setRoundOrder(gamePlayers.map((player) => player.id));
    setRoundEntries([]);
    setHistory([]);
    setResult(null);
    setIsGameStarted(true);
  }, []);

  const handleStartGame = useCallback(() => {
    if (setupError) return;
    const normalizedPlayers = setupPlayers.map((player) => ({
      ...player,
      name: player.name.trim(),
    }));
    setBullPlayers(normalizedPlayers);
    setBullThrows([]);
    setIsBullDeciderActive(true);
  }, [setupError, setupPlayers]);

  const handleRegisterBullThrow = useCallback(
    (point: DartboardClickPoint) => {
      if (!bullCurrentPlayer || isBullRoundComplete) return;

      setBullThrows((previous) => [
        ...previous,
        {
          playerId: bullCurrentPlayer.id,
          x: point.x,
          y: point.y,
          distance: point.distance,
        },
      ]);
    },
    [bullCurrentPlayer, isBullRoundComplete],
  );

  const handleUndoBullThrow = useCallback(() => {
    if (bullThrows.length === 0) return;
    setBullThrows((previous) => previous.slice(0, -1));
  }, [bullThrows.length]);

  const handleRestartBullRound = useCallback(() => {
    setBullThrows([]);
  }, []);

  const handleCancelBullDecider = useCallback(() => {
    setIsBullDeciderActive(false);
    setBullPlayers([]);
    setBullThrows([]);
  }, []);

  const handleStartFromBullResult = useCallback(() => {
    if (!isBullRoundComplete || bullRanking.length === 0) return;
    if (bullTopPlayers.length > 1) return;

    const orderedPlayers = bullRanking
      .map((entry) => bullPlayers.find((player) => player.id === entry.playerId))
      .filter((player): player is SetupPlayer => Boolean(player));

    startGameFromPlayers(orderedPlayers);
    setIsBullDeciderActive(false);
    setBullPlayers([]);
    setBullThrows([]);
  }, [bullPlayers, bullRanking, bullTopPlayers.length, isBullRoundComplete, startGameFromPlayers]);

  const handleRegisterThrow = useCallback(
    (hitDangerDart: 1 | 2 | 3 | null) => {
      if (!currentPlayerId || result) return;

      const nextEntry: ThrowEntry = {
        playerId: currentPlayerId,
        hitDangerDart,
      };

      const nextEntries = [...roundEntries, nextEntry];
      const nextPlayers = hitDangerDart !== null
        ? players.map((player) =>
          player.id === currentPlayerId
            ? { ...player, isEliminated: true, eliminatedRound: round }
            : player,
        )
        : players;

      const finalizeRound = (entries: ThrowEntry[], updatedPlayers: GamePlayer[]) => {
        const eliminatedIds = entries
          .filter((entry) => entry.hitDangerDart !== null)
          .map((entry) => entry.playerId);

        setHistory((previous) => [
          {
            round,
            dangerNumbers: [...dangerNumbers],
            entries,
            eliminatedIds,
          },
          ...previous,
        ]);

        const survivors = updatedPlayers.filter((player) => !player.isEliminated);
        if (survivors.length === 1) {
          setResult({
            winners: survivors.map((player) => player.id),
            isDraw: false,
          });
          return;
        }
        if (survivors.length === 0) {
          const bestDart = entries.reduce<number>(
            (best, entry) => Math.max(best, entry.hitDangerDart ?? 0),
            0,
          );
          const winners = entries
            .filter((entry) => (entry.hitDangerDart ?? 0) === bestDart)
            .map((entry) => entry.playerId);

          setResult({
            winners,
            isDraw: winners.length !== 1,
          });
          return;
        }

        setRound((previous) => previous + 1);
        setDangerRadius((previous) => Math.min(previous + 1, 10));
        setRoundOrder(survivors.map((player) => player.id));
        setRoundEntries([]);
      };

      setPlayers(nextPlayers);
      setRoundEntries(nextEntries);

      if (nextEntries.length < roundOrder.length) return;

      finalizeRound(nextEntries, nextPlayers);
    },
    [currentPlayerId, dangerNumbers, players, result, round, roundEntries, roundOrder.length],
  );

  const handleUndoThrow = useCallback(() => {
    if (result || roundEntries.length === 0) return;

    const lastEntry = roundEntries[roundEntries.length - 1];
    setRoundEntries((previous) => previous.slice(0, -1));

    if (lastEntry.hitDangerDart !== null) {
      setPlayers((previous) =>
        previous.map((player) =>
          player.id === lastEntry.playerId
            ? { ...player, isEliminated: false, eliminatedRound: null }
            : player,
        ),
      );
    }
  }, [result, roundEntries]);

  const handleRestart = useCallback(() => {
    if (players.length === 0) return;

    const restartPlayers = players.map((player) => ({
      ...player,
      isEliminated: false,
      eliminatedRound: null,
    }));
    startGameFromPlayers(restartPlayers);
  }, [players, startGameFromPlayers]);

  const handleChangePlayers = useCallback(() => {
    if (players.length > 0) {
      setSetupPlayers(players.map(({ id, name, color }) => ({ id, name, color })));
      setPlayerCounter(players.length);
    }
    setIsGameStarted(false);
    setIsBullDeciderActive(false);
    setBullPlayers([]);
    setBullThrows([]);
    setResult(null);
  }, [players]);

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

  return (
    <AppLayout hideNav={isFullscreen}>
      <div className={cn("container mx-auto px-4 py-8 md:py-10 pb-24 md:pb-10 space-y-6", isFullscreen && "md:py-6 md:pb-6")}>
        <header className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 bg-[#12121A]/88 p-6 md:p-8 shadow-[0_20px_50px_-26px_rgba(0,0,0,0.75)]",
          isFullscreen && "md:hidden"
        )}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(239,68,68,0.25),transparent_38%),radial-gradient(circle_at_30%_90%,rgba(34,197,94,0.2),transparent_45%)]" />
          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-red-300/90">
                {t("trainingHub.title")}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {t("trainingRedZone.title")}
              </h1>
              <p className="max-w-3xl text-muted-foreground">
                {t("trainingRedZone.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void toggleFullscreen()}
              className="hidden md:inline-flex shrink-0 self-start"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {isFullscreen ? t("trainingTicTacToe.actions.exitFullscreen") : t("trainingTicTacToe.actions.enterFullscreen")}
            </Button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!isGameStarted && !isBullDeciderActive && (
            <motion.section
              key="setup"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)", transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl border border-white/10 p-5 md:p-6 space-y-5 relative overflow-hidden mb-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              >
                <h2 className="text-2xl font-display font-bold tracking-tight mb-1">{t("trainingRedZone.setup.title")}</h2>
                <p className="text-sm text-muted-foreground font-light">{t("trainingRedZone.setup.subtitle")}</p>
              </motion.div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {setupPlayers.map((player, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5, delay: index * 0.1 }}
                      key={player.id}
                      className="rounded-xl border border-white/10 bg-[#15151D] p-5 space-y-4 shadow-lg origin-center relative overflow-hidden group"
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundImage: `linear-gradient(to bottom right, ${player.color}, transparent)` }}
                      />
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground/80">
                            {t("trainingRedZone.setup.playerDefault", { index: index + 1 })}
                          </p>
                          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={setupPlayers.length <= 2}
                          onClick={() => handleRemovePlayer(player.id)}
                          className="text-xs h-7 hover:bg-red-500/10 hover:text-red-400 opacity-60 hover:opacity-100"
                        >
                          {t("trainingRedZone.setup.removePlayer")}
                        </Button>
                      </div>
                      
                      <Input
                        value={player.name}
                        onChange={(event) => handleSetupNameChange(player.id, event.target.value)}
                        placeholder={t("trainingRedZone.setup.playerDefault", { index: index + 1 })}
                        className="bg-[#11111A] border-white/12 h-11 transition-all focus-visible:ring-1 focus-visible:ring-white/30"
                      />
                      
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {PLAYER_COLORS.map((color) => {
                          const isSelected = player.color === color;
                          return (
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              key={`${player.id}-${color}`}
                              type="button"
                              onClick={() => handleSetupColorChange(player.id, color)}
                              className={cn(
                                "relative w-8 h-8 rounded-full border-2 transition-all shadow-md outline-none",
                                isSelected ? "scale-110 shadow-lg z-10" : "border-transparent opacity-80 hover:opacity-100",
                              )}
                              style={{ 
                                backgroundColor: color, 
                                borderColor: isSelected ? '#ffffff' : 'transparent',
                                boxShadow: isSelected ? `0 0 15px ${color}80` : undefined
                              }}
                              aria-label={`${player.name} color ${color}`}
                            >
                              {isSelected && (
                                <motion.div 
                                  layoutId={`selected-color-rz-${player.id}`}
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
                </AnimatePresence>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-wrap gap-3 pt-2"
              >
                <Button
                  variant="outline"
                  onClick={handleAddPlayer}
                  disabled={setupPlayers.length >= MAX_PLAYERS || isBullDeciderActive}
                  className="rounded-xl h-11 border-white/10 hover:bg-white/5 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("trainingRedZone.setup.addPlayer")}
                </Button>
                <Button 
                  onClick={handleStartGame} 
                  disabled={Boolean(setupError) || isBullDeciderActive}
                  className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all font-semibold"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t("trainingRedZone.setup.start")}
                </Button>
              </motion.div>

              <AnimatePresence>
                {setupError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
                    exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
                    className="text-sm text-amber-300 flex items-center gap-2 overflow-hidden"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {setupError}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="rounded-2xl border border-white/10 bg-[#15151D] p-5 shadow-lg relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5 -scale-y-100 pointer-events-none blur-sm">
                  <Skull className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-sm uppercase tracking-widest font-bold text-muted-foreground/80 mb-3 flex items-center gap-2">
                  {t("trainingRedZone.rules.title")}
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </h3>
                <ul className="space-y-2.5 text-sm text-foreground/80 font-light relative z-10">
                  <motion.li whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {t("trainingRedZone.rules.r1")}
                  </motion.li>
                  <motion.li whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {t("trainingRedZone.rules.r2")}
                  </motion.li>
                  <motion.li whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {t("trainingRedZone.rules.r3")}
                  </motion.li>
                  <motion.li whileHover={{ x: 2 }} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {t("trainingRedZone.rules.r4")}
                  </motion.li>
                </ul>
              </motion.section>

            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isBullDeciderActive && !isGameStarted && (
            <motion.section
              key="bull-decider"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 0.3 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "glass-card rounded-2xl border border-white/10 p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl",
                isBullRoundComplete ? "space-y-2 md:space-y-3" : "space-y-4 md:space-y-6 min-h-[50vh]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.15),transparent_50%)] pointer-events-none" />
              
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
                      {t("trainingRedZone.bullDecider.title")}
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base font-light">{t("trainingRedZone.bullDecider.subtitle")}</p>
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
                      className="bg-red-500/10 border border-red-500/20 px-8 py-2.5 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                    >
                      <p className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase" style={{ color: bullCurrentPlayer.color, textShadow: `0 0 10px ${bullCurrentPlayer.color}80` }}>
                        {t("trainingRedZone.bullDecider.currentThrow", { player: bullCurrentPlayer.name })}
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
                  <p className="text-xs md:text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                    {t("trainingRedZone.bullDecider.registered", { count: bullThrows.length, total: bullPlayers.length })}
                  </p>
                  <p className="text-xs md:text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                    {t("trainingRedZone.bullDecider.left", { count: Math.max(bullPlayers.length - bullThrows.length, 0) })}
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
                    "drop-shadow-[0_0_35px_rgba(239,68,68,0.15)] transition-all duration-700 ease-in-out block",
                    !isBullRoundComplete 
                      ? "w-full max-w-[320px] sm:max-w-[420px] md:max-w-[55vh] lg:max-w-[60vh] xl:max-w-[650px]" 
                      : "w-full max-w-[140px] md:max-w-[180px]",
                    bullCurrentPlayer && !isBullRoundComplete ? "cursor-crosshair hover:scale-[1.02]" : "opacity-90 grayscale-0"
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
                  {t("trainingRedZone.actions.undo")}
                </Button>
                <Button variant="outline" className="px-5 border-white/10 hover:bg-white/5 rounded-full" onClick={handleRestartBullRound}>
                  {t("trainingRedZone.bullDecider.rethrow")}
                </Button>
                <Button variant="ghost" className="px-5 rounded-full hover:bg-white/5" onClick={handleCancelBullDecider}>
                  {t("trainingRedZone.bullDecider.cancel")}
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
                    {bullRanking.map((entry, index) => {
                      const player = bullPlayerById.get(entry.playerId);
                      if (!player) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                          key={`bull-rank-${entry.playerId}`}
                          className={cn(
                            "rounded-xl border p-3 flex items-center justify-between transition-all duration-300",
                            index === 0 
                              ? "border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]" 
                              : "border-white/5 bg-[#12121A] opacity-80"
                          )}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <span className={cn(
                              "flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs md:text-sm font-bold shadow-inner", 
                              index === 0 ? "bg-amber-400 text-black" : "bg-white/10 text-white"
                            )}>
                              {index + 1}
                            </span>
                            <span className={cn("text-base md:text-lg font-semibold tracking-tight", index === 0 ? "text-white" : "text-foreground")}>
                              {player.name}
                            </span>
                          </div>
                          <span className="text-cyan-400 font-mono text-sm md:text-base font-semibold tracking-tighter bg-cyan-950/40 px-3 py-1 rounded-lg">
                            {t("trainingRedZone.bullDecider.distance", { distance: entry.distance.toFixed(1) })}
                          </span>
                        </motion.div>
                      );
                    })}
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
                          {t("trainingRedZone.bullDecider.tie", { players: bullTieNames })}
                        </motion.p>
                      ) : (
                        <motion.p
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.6 }}
                          className="text-2xl md:text-3xl font-display font-bold text-emerald-400 drop-shadow-sm tracking-tight"
                        >
                          {t("trainingRedZone.bullDecider.winner", { player: bullPlayerById.get(bullRanking[0].playerId)?.name ?? "-" })}
                        </motion.p>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className={cn(
                        "w-full text-base md:text-lg h-12 md:h-14 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.03] font-bold tracking-wide",
                        bullTopPlayers.length > 1 ? "bg-amber-600 hover:bg-amber-500" : "bg-red-600 hover:bg-red-500 text-white"
                      )}
                      onClick={handleStartFromBullResult}
                      disabled={!isBullRoundComplete || bullTopPlayers.length > 1}
                    >
                      {t("trainingRedZone.bullDecider.startGame")}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {isGameStarted && (
          <div className="space-y-6">
            <section className="glass-card rounded-2xl border border-white/10 p-4 md:p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t("trainingRedZone.actions.newGame")}
                </Button>
                <Button variant="outline" onClick={handleChangePlayers}>
                  {t("trainingRedZone.actions.changePlayers")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUndoThrow}
                  disabled={roundEntries.length === 0 || Boolean(result)}
                >
                  {t("trainingRedZone.actions.undo")}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-[#15151D] px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t("trainingRedZone.status.round", { round })}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#15151D] px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("trainingRedZone.status.alivePlayers", { count: alivePlayers.length })}
                  </span>
                </div>
                <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("trainingRedZone.status.dangerNumbers")}:{" "}
                    <span className="text-red-200 font-medium">{dangerNumbers.join(", ")}</span>
                  </span>
                </div>
                <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("trainingRedZone.status.nextExpansion")}:{" "}
                    <span className="text-amber-100 font-medium">
                      {nextExpansionNumbers.length > 0 ? nextExpansionNumbers.join(", ") : t("trainingRedZone.throw.bull")}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-12 xl:items-start">
              <aside className="glass-card rounded-2xl border border-white/10 p-4 space-y-4 xl:col-span-3 xl:sticky xl:top-24">
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    {t("trainingRedZone.status.alivePlayers", { count: alivePlayers.length })}
                  </h3>
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className={cn(
                          "rounded-xl border p-3",
                          player.isEliminated ? "border-red-400/45 bg-red-500/10" : "border-white/10 bg-[#15151D]",
                        )}
                      >
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{player.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: player.color }} />
                          {player.isEliminated ? (
                            <p className="text-sm text-red-200 font-medium flex items-center gap-1">
                              <Skull className="w-3.5 h-3.5" />
                              {t("trainingRedZone.players.eliminated")}
                            </p>
                          ) : (
                            <p className="text-sm text-emerald-300 font-medium">
                              {t("trainingRedZone.players.alive")}
                            </p>
                          )}
                        </div>
                        {player.eliminatedRound && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("trainingRedZone.players.eliminatedRound", { round: player.eliminatedRound })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    {t("trainingRedZone.history.title")}
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("trainingRedZone.history.none")}</p>
                  ) : (
                    <div className="space-y-2 xl:max-h-[280px] xl:overflow-y-auto pr-1">
                      {history.map((log) => (
                        <div key={`history-${log.round}`} className="rounded-xl border border-white/10 bg-[#15151D] p-3 text-sm">
                          <p className="font-medium text-foreground">
                            {t("trainingRedZone.history.round", { round: log.round })} - {log.dangerNumbers.join(", ")}
                          </p>
                          {log.eliminatedIds.length > 0 ? (
                            <p className="text-red-200 mt-1">
                              {t("trainingRedZone.history.eliminated")}:{" "}
                              {log.eliminatedIds.map((id) => resolvePlayerName(id)).join(", ")}
                            </p>
                          ) : (
                            <p className="text-emerald-300 mt-1">{t("trainingRedZone.history.allSafe")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <div className="glass-card rounded-2xl border border-white/10 p-4 md:p-5 xl:col-span-5 xl:min-h-[620px] xl:sticky xl:top-24">
                <div className="h-full flex flex-col">
                  <div className="flex-1 py-4 md:py-6 flex items-center justify-center">
                    <DartboardSvg
                      dangerNumbers={dangerNumberSet}
                      className="w-full max-w-[300px] md:max-w-[360px] xl:max-w-[430px] drop-shadow-[0_0_18px_rgba(239,68,68,0.16)]"
                    />
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {BOARD_RING.map((number) => {
                      const isDanger = dangerNumberSet.has(number);
                      const isNew = newlyAddedSet.has(number);
                      return (
                        <div
                          key={`danger-${number}`}
                          className={cn(
                            "rounded-lg py-2 text-center text-sm font-bold border",
                            isDanger
                              ? "border-red-400/70 bg-red-500/20 text-red-100"
                              : "border-white/10 bg-[#101017] text-muted-foreground",
                            isDanger && isNew && "ring-2 ring-amber-300/70",
                          )}
                        >
                          {number}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="space-y-4 xl:col-span-4 xl:sticky xl:top-24">
                {!result && currentPlayer && (
                  <section className="glass-card rounded-2xl border border-white/10 p-4 md:p-5 space-y-4">
                    <p className="text-sm text-foreground font-medium">
                      {t("trainingRedZone.status.currentThrow", { player: currentPlayer.name })}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("trainingRedZone.throw.promptSimple")}</p>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Button
                        variant="outline"
                        className="h-16 text-lg border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                        onClick={() => handleRegisterThrow(null)}
                      >
                        {t("trainingRedZone.throw.safe")}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-16 text-lg border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                        onClick={() => handleRegisterThrow(1)}
                      >
                        {t("trainingRedZone.throw.danger")} 1
                      </Button>
                      <Button
                        variant="outline"
                        className="h-16 text-lg border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                        onClick={() => handleRegisterThrow(2)}
                      >
                        {t("trainingRedZone.throw.danger")} 2
                      </Button>
                      <Button
                        variant="outline"
                        className="h-16 text-lg border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                        onClick={() => handleRegisterThrow(3)}
                      >
                        {t("trainingRedZone.throw.danger")} 3
                      </Button>
                    </div>
                  </section>
                )}

                {result && (
                  <section className="glass-card rounded-2xl border border-white/10 p-6 text-center space-y-4">
                    <h2 className="text-2xl font-display font-bold">
                      {result.isDraw
                        ? t("trainingRedZone.result.draw")
                        : t("trainingRedZone.result.winner", {
                          player: resolvePlayerName(result.winners[0]),
                        })}
                    </h2>
                    <Button onClick={handleRestart} className="w-full">
                      {t("trainingRedZone.result.playAgain")}
                    </Button>
                  </section>
                )}

                <section className="glass-card rounded-2xl border border-white/10 p-4 md:p-5">
                  <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    {t("trainingRedZone.status.currentThrow", { player: currentPlayer?.name ?? "-" })}
                  </h3>
                  {roundEntries.length > 0 ? (
                    <div className="rounded-xl border border-white/10 bg-[#15151D] p-3 space-y-2 xl:max-h-[320px] xl:overflow-y-auto">
                      {roundEntries.map((entry, idx) => (
                        <div key={`entry-${entry.playerId}-${idx}`} className="text-sm flex items-center justify-between gap-2">
                          <span>{resolvePlayerName(entry.playerId)}</span>
                          <span className={entry.hitDangerDart !== null ? "text-red-400 font-medium flex items-center gap-1" : "text-emerald-400 font-medium"}>
                            {entry.hitDangerDart !== null ? (
                              <>
                                <Skull className="w-3.5 h-3.5" />
                                {t("trainingRedZone.throw.danger")} {entry.hitDangerDart} - {t("trainingRedZone.players.eliminated")}
                              </>
                            ) : (
                              t("trainingRedZone.throw.safe")
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("trainingRedZone.history.none")}</p>
                  )}
                </section>
              </aside>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

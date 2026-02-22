import { cn } from "@/lib/utils";

type Player = "A" | "B";

interface BoardCell {
  id: number;
  target: number;
  owner: Player | null;
}

interface TicTacToeBoardProps {
  board: BoardCell[];
  pendingCellId: number | null;
  winningLine: number[];
  players: Record<Player, { name: string; color: string }>;
  guides: Record<number, {
    possible: boolean;
    exactNow: boolean;
    easiest: string | null;
    fastest: string | null;
    sameRoute: boolean;
  }>;
  strings: {
    target: string;
    open: string;
    pending: string;
    guideTitle: string;
    easiest: string;
    fastest: string;
    noFinish: string;
    lockNow: string;
  };
}

export default function TicTacToeBoard({
  board,
  pendingCellId,
  winningLine,
  players,
  guides,
  strings,
}: TicTacToeBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-3.5">
      {board.map((cell) => {
        const isWinningCell = winningLine.includes(cell.id);
        const isPending = pendingCellId === cell.id && !cell.owner;
        const owner = cell.owner;
        const guide = guides[cell.id];
        const ownerColor = owner ? players[owner].color : null;
        const ownerBackground = ownerColor ? `${ownerColor}44` : undefined;
        const ownerBorder = ownerColor ? `${ownerColor}AA` : undefined;

        return (
          <div
            key={cell.id}
            style={{
              backgroundColor: ownerBackground,
              borderColor: ownerBorder,
            }}
            className={cn(
              "relative rounded-2xl border p-3 md:p-3.5 min-h-40 sm:min-h-44 md:min-h-[11rem] flex flex-col justify-between transition-all",
              !owner && "bg-[#15151D] border-white/10",
              isPending && "border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.5)]",
              isWinningCell && "border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.55)]",
            )}
          >
            <p className="text-xs md:text-xs uppercase tracking-widest text-muted-foreground">{strings.target}</p>
            <p className="text-3xl md:text-3xl font-display font-bold text-foreground">{cell.target}</p>

            <div className="flex items-center justify-between mt-2">
              <div
                className={cn(
                  "h-8 md:h-8 px-3 md:px-3 rounded-full text-xs md:text-xs font-bold flex items-center",
                  owner && "text-foreground border",
                  !owner && "bg-[#101017] text-muted-foreground border border-white/10",
                )}
                style={owner ? { backgroundColor: `${players[owner].color}99`, borderColor: `${players[owner].color}EE` } : undefined}
              >
                {owner ? players[owner].name : strings.open}
              </div>
              {isPending && <span className="text-[11px] font-semibold text-emerald-300">{strings.pending}</span>}
            </div>

            {!owner && guide && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-1.5">
                <p className="text-xs md:text-sm uppercase tracking-wide text-muted-foreground font-semibold">{strings.guideTitle}</p>

                {guide.exactNow ? (
                  <p className="text-sm md:text-base text-emerald-300 font-semibold">{strings.lockNow}</p>
                ) : !guide.possible ? (
                  <p className="text-sm md:text-base text-muted-foreground">{strings.noFinish}</p>
                ) : (
                  <>
                    {guide.easiest && (
                      <p className="text-sm md:text-base text-foreground leading-tight">
                        <span className="text-muted-foreground font-medium">{strings.easiest}:</span> <span className="font-semibold">{guide.easiest}</span>
                      </p>
                    )}
                    {!guide.sameRoute && guide.fastest && (
                      <p className="text-sm md:text-base text-foreground leading-tight">
                        <span className="text-muted-foreground font-medium">{strings.fastest}:</span> <span className="font-semibold">{guide.fastest}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

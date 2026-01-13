import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useMatch } from "@/hooks/useMatch";
import { useTournaments } from "@/hooks/useTournaments";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Target, ArrowLeft, Trophy, Clock, Video, VideoOff, Check, X, Swords, SwitchCamera, ZoomIn, WifiOff } from "lucide-react";
import { MatchThrowInput } from "@/components/MatchThrowInput";

export default function Match() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    match,
    throws,
    loading,
    acceptMatch,
    declineMatch,
    abandonMatch,
    registerThrow,
    localStream,
    remoteStream,
    localVideoReady,
    connectionState,
    initializeWebRTC,
    createOffer,
    cleanupWebRTC,
    facingMode,
    switchCamera,
    zoomLevel,
    maxZoom,
    applyZoom,
    opponentCurrentDarts,
    broadcastCurrentDarts,
    h2h,
  } = useMatch(id);

  const { completeTournamentMatch } = useTournaments();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  // Check if this match is part of a tournament
  useEffect(() => {
    const checkTournament = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("tournament_matches")
        .select("tournament_id")
        .eq("match_id", id)
        .single();
      if (data) {
        setTournamentId(data.tournament_id);
      }
    };
    checkTournament();
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Set up local video - always keep srcObject attached
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      console.log("Setting local video srcObject");
      el.srcObject = localStream;
      el.play?.().catch(() => {
        // Autoplay can be blocked; UI will still show fallback.
      });
    }
  }, [localStream]);

  // Set up remote video - always keep srcObject attached
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      console.log("Setting remote video srcObject");
      el.srcObject = remoteStream;
      el.play?.().catch(() => {
        // Autoplay can be blocked; remote video is muted to avoid this.
      });
    }
  }, [remoteStream]);

  // Initialize WebRTC when match becomes active
  useEffect(() => {
    if (match?.status === "active" && !videoEnabled) {
      handleStartVideo();
    }
  }, [match?.status]);

  // Detect opponent disconnection
  useEffect(() => {
    if (match?.status === "active" && videoEnabled) {
      if (connectionState === "disconnected" || connectionState === "failed") {
        setShowDisconnectDialog(true);
      }
    }
  }, [connectionState, match?.status, videoEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWebRTC();
    };
  }, []);

  // Handle tournament match completion
  useEffect(() => {
    if (match?.status === "completed" && match.winner_id && id) {
      completeTournamentMatch(id, match.winner_id);
    }
  }, [match?.status, match?.winner_id, id]);

  const handleStartVideo = async () => {
    const success = await initializeWebRTC();
    if (success) {
      setVideoEnabled(true);

      // If player1, create offer. If player2, wait for offer then create answer
      if (match && user?.id === match.player1_id) {
        setTimeout(() => createOffer(), 1000);
      }
    } else {
      toast.error(t("match.cameraError"));
    }
  };

  // Answer is now automatically created via realtime subscription in useMatch
  // when the opponent's offer is received

  const handleAccept = async () => {
    await acceptMatch();
    toast.success(t("match.matchStarted"));
  };

  const handleDecline = async () => {
    await declineMatch();
    toast.info(t("match.matchDeclined"));
    navigate("/dashboard");
  };

  const handleThrowComplete = async (dart1: number, dart2: number, dart3: number) => {
    await registerThrow(dart1, dart2, dart3);
    // Clear broadcast when throw is confirmed
    broadcastCurrentDarts([]);
  };

  const handleDartsChange = useCallback((darts: number[]) => {
    broadcastCurrentDarts(darts);
  }, [broadcastCurrentDarts]);

  const handleOpponentLeft = async () => {
    await abandonMatch();
    toast.info(t("match.opponentLeft"));
    navigate("/matches");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <Target className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">{t("match.notFound")}</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              {t("common.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPlayer1 = user?.id === match.player1_id;
  const isMyTurn = match.current_turn === user?.id;
  const myScore = isPlayer1 ? match.player1_score : match.player2_score;
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  const opponentName = isPlayer1 ? match.player2_name : match.player1_name;

  // Pending match - waiting for acceptance
  if (match.status === "pending") {
    const isChallenger = user?.id === match.player1_id;

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">{t("match.matchChallenge")}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Swords className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="font-display">
                {isChallenger ? t("match.waitingForOpponent") : t("match.youHaveBeenChallenged")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {match.player1_name} vs {match.player2_name || "..."}
                </p>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>{match.starting_score}</span>
                  <span>•</span>
                  <span>
                    {match.checkout_type === "double_out"
                      ? t("match.doubleOut")
                      : t("match.straightOut")}
                  </span>
                </div>

                {h2h && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t("match.headToHead") || "Head to Head"}</p>
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {user?.id === h2h.player1_id ? h2h.player1_wins : h2h.player2_wins}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("match.wins") || "Wins"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-muted-foreground">
                          {h2h.draws}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("match.draws") || "Draws"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-destructive">
                          {user?.id === h2h.player1_id ? h2h.player2_wins : h2h.player1_wins}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("match.losses") || "Losses"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isChallenger ? (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>{t("match.waitingForAccept")}</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleAccept} variant="hero" className="flex-1">
                    <Check className="w-4 h-4 mr-2" />
                    {t("match.accept")}
                  </Button>
                  <Button onClick={handleDecline} variant="outline" className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    {t("match.decline")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Completed match
  if (match.status === "completed") {
    const isWinner = match.winner_id === user?.id;
    const backPath = tournamentId ? `/tournament/${tournamentId}` : "/dashboard";

    // Auto-redirect to tournament after 3 seconds
    useEffect(() => {
      if (tournamentId) {
        const timer = setTimeout(() => {
          navigate(backPath);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [tournamentId, navigate, backPath]);

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">{t("match.matchComplete")}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="py-8 space-y-4">
              <Trophy className={`w-16 h-16 mx-auto ${isWinner ? "text-dart-gold" : "text-muted-foreground"}`} />
              <h2 className="text-2xl font-display font-bold">
                {isWinner ? t("match.youWon") : t("match.youLost")}
              </h2>
              <p className="text-muted-foreground">
                {match.player1_name}: {match.player1_score} - {match.player2_name}: {match.player2_score}
              </p>
              {tournamentId && (
                <p className="text-sm text-muted-foreground">
                  {t("tournament.returningToTournament")}
                </p>
              )}
              <Button onClick={() => navigate(backPath)} variant="hero">
                {tournamentId ? t("tournament.backToTournament") : t("common.back")}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Active match
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Opponent disconnected dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <WifiOff className="w-12 h-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">{t("match.opponentLeft")}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t("match.opponentLeftDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction onClick={handleOpponentLeft}>
              {t("match.leaveMatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Header with scores */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Score display */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-6">
                <div className={`text-center ${isPlayer1 ? "text-primary" : ""}`}>
                  <p className="text-xs text-muted-foreground">{match.player1_name}</p>
                  <p className="text-3xl font-display font-bold">{match.player1_score}</p>
                </div>
                <span className="text-muted-foreground">vs</span>
                <div className={`text-center ${!isPlayer1 ? "text-primary" : ""}`}>
                  <p className="text-xs text-muted-foreground">{match.player2_name}</p>
                  <p className="text-3xl font-display font-bold">{match.player2_score}</p>
                </div>
              </div>
              {h2h && (
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">
                  H2H: {user?.id === h2h.player1_id ? h2h.player1_wins : h2h.player2_wins} - {h2h.draws} - {user?.id === h2h.player1_id ? h2h.player2_wins : h2h.player1_wins}
                </p>
              )}
            </div>

            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col gap-4 overflow-auto">
        {/* Video section - shows current thrower's camera */}
        <div className="flex justify-center">
          <div className="relative bg-card rounded-lg overflow-hidden border border-border w-full max-w-sm aspect-square">
            {/* Local video - always rendered, visibility controlled by CSS */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${isMyTurn && localVideoReady ? "" : "hidden"}`}
            />

            {/* Remote video - always rendered, visibility controlled by CSS */}
            <video
              ref={remoteVideoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${!isMyTurn && remoteStream ? "" : "hidden"}`}
            />

            {/* Fallback: VideoOff icon */}
            {((isMyTurn && !localVideoReady) || (!isMyTurn && !remoteStream)) && (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            <span className="absolute bottom-2 left-2 text-sm bg-background/80 px-2 py-1 rounded font-medium z-10">
              {isMyTurn ? t("match.you") : opponentName}
            </span>

            {/* Camera controls - only show when it's my turn */}
            {isMyTurn && localVideoReady && (
              <div className="absolute top-2 right-2 flex gap-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 hover:bg-background/90 h-8 w-8"
                  onClick={switchCamera}
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
                {maxZoom > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 hover:bg-background/90 h-8 w-8"
                    onClick={() => setShowZoomSlider(!showZoomSlider)}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Zoom slider */}
            {isMyTurn && showZoomSlider && maxZoom > 1 && (
              <div className="absolute top-12 right-2 bg-background/90 p-2 rounded-lg z-10 w-32">
                <Slider
                  value={[zoomLevel]}
                  min={1}
                  max={maxZoom}
                  step={0.1}
                  onValueChange={([value]) => applyZoom(value)}
                />
                <p className="text-xs text-center mt-1">{zoomLevel.toFixed(1)}x</p>
              </div>
            )}

            {/* Opponent's current input display */}
            {!isMyTurn && opponentCurrentDarts.length > 0 && (
              <div className="absolute top-2 left-2 bg-background/90 px-3 py-2 rounded-lg z-10">
                <p className="text-xs text-muted-foreground mb-1">{t("match.entering")}</p>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-bold ${opponentCurrentDarts[i] !== undefined
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                        }`}
                    >
                      {opponentCurrentDarts[i] !== undefined ? opponentCurrentDarts[i] : "-"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Turn indicator */}
        <div className={`text-center py-2 rounded-lg ${isMyTurn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {isMyTurn ? t("match.yourTurn") : t("match.opponentTurn", { name: opponentName })}
        </div>

        {/* Throw input */}
        <Card className="flex-1">
          <CardContent className="pt-4">
            <MatchThrowInput
              onComplete={handleThrowComplete}
              remainingScore={myScore || 0}
              disabled={!isMyTurn}
              onDartsChange={handleDartsChange}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

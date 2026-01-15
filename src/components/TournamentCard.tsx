import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Target, Layers, Globe, Lock } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  is_public: boolean;
  max_players: number;
  starting_score: number;
  checkout_type: string;
  legs_to_win: number;
  sets_to_win: number;
  status: string;
  creator_name?: string;
  participant_count?: number;
}

interface TournamentCardProps {
  tournament: Tournament;
  onJoin?: () => void;
  showJoinButton?: boolean;
  isOwner?: boolean;
  isParticipant?: boolean;
}

export function TournamentCard({
  tournament,
  onJoin,
  showJoinButton,
  isOwner,
  isParticipant,
}: TournamentCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (tournament.status) {
      case "open":
        return <Badge variant="secondary">{t("tournament.statusOpen")}</Badge>;
      case "in_progress":
        return <Badge className="bg-primary">{t("tournament.statusInProgress")}</Badge>;
      case "completed":
        return <Badge variant="outline">{t("tournament.statusCompleted")}</Badge>;
      default:
        return null;
    }
  };

  const isFull = (tournament.participant_count || 0) >= tournament.max_players;

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/tournament/${tournament.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {tournament.is_public ? (
                <Globe className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold truncate">{tournament.name}</h3>
              {getStatusBadge()}
              {isOwner && (
                <Badge variant="outline" className="ml-auto">
                  {t("tournament.owner")}
                </Badge>
              )}
            </div>

            {tournament.creator_name && (
              <p className="text-sm text-muted-foreground mb-3">
                {t("tournament.hostedBy", { name: tournament.creator_name })}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>
                  {tournament.participant_count || 0}/{tournament.max_players}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{tournament.starting_score}</span>
              </div>
              <div className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                <span>
                  {t("tournament.format", {
                    legs: tournament.legs_to_win,
                    sets: tournament.sets_to_win,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>
                  {tournament.checkout_type === "double_out"
                    ? t("match.doubleOut")
                    : t("match.straightOut")}
                </span>
              </div>
            </div>
          </div>

          {showJoinButton && (tournament.status === "open" || tournament.status === "scheduled") && !isParticipant && !isOwner && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onJoin?.();
              }}
              disabled={isFull}
              size="sm"
            >
              {isFull ? t("tournament.full") : t("tournament.join")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

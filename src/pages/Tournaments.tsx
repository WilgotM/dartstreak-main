import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTournaments } from "@/hooks/useTournaments";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { TournamentCard } from "@/components/TournamentCard";
import { TournamentInviteCard } from "@/components/TournamentInviteCard";
import { Plus, Globe, Trophy, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";

export default function Tournaments() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    publicTournaments,
    myTournaments,
    tournamentInvites,
    loading,
    joinTournament,
    respondToInvite,
  } = useTournaments();

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">
              {t("tournament.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("tournament.subtitle") || "Hitta utmaningar eller se dina aktiva spel"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tabElem = document.querySelector('[value="my"]') as HTMLButtonElement;
                tabElem?.click();
              }}
            >
              <Trophy className="w-4 h-4 mr-2 text-dart-gold" />
              {t("tournament.myTournaments")}
            </Button>
            <CreateTournamentDialog>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t("tournament.create")}
              </Button>
            </CreateTournamentDialog>
          </div>
        </div>

        {myTournaments.length > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              {t("tournament.quickAccess") || "DINA AKTIVA TURNERINGAR"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {myTournaments.slice(0, 4).map((tournament) => (
                <Button
                  key={tournament.id}
                  variant="hero"
                  size="sm"
                  className="rounded-lg px-4 py-5 h-auto text-xs shadow-soft"
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold">{tournament.name}</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      {tournament.status === 'completed' 
                        ? t("tournament.completed") 
                        : tournament.status === 'in_progress' 
                          ? t("tournament.ongoing") 
                          : t("tournament.scheduled")}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="hub" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid sm:flex grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="hub" className="flex items-center gap-2 rounded-lg px-6 py-2">
              <Globe className="w-4 h-4" />
              {t("tournament.hub")}
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-2 rounded-lg px-6 py-2">
              <Trophy className="w-4 h-4" />
              {t("tournament.myTournaments")}
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-2 relative rounded-lg px-6 py-2">
              <Mail className="w-4 h-4" />
              {t("tournament.invites")}
              {tournamentInvites.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-[10px] font-bold shadow-soft">
                  {tournamentInvites.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hub" className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("tournament.joinableTournaments") || "Turneringar du kan gå med i"}
              </h3>
            </div>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-card animate-pulse border border-border/50" />
                ))}
              </div>
            ) : publicTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("tournament.noPublicTournaments")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {publicTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onJoin={() => joinTournament(tournament.id)}
                    showJoinButton
                    isParticipant={(tournament as any).is_participant}
                    isOwner={tournament.created_by === user.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">
                {t("common.loading")}
              </p>
            ) : myTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("tournament.noTournaments")}
                  </p>
                  <CreateTournamentDialog>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("tournament.create")}
                    </Button>
                  </CreateTournamentDialog>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    isOwner={tournament.created_by === user.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">
                {t("common.loading")}
              </p>
            ) : tournamentInvites.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("tournament.noInvites")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tournamentInvites.map((invite) => (
                  <TournamentInviteCard
                    key={invite.id}
                    invite={invite}
                    onAccept={() => respondToInvite(invite.id, true)}
                    onDecline={() => respondToInvite(invite.id, false)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

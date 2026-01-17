import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserPlus, Bell, Check, X, Clock, Trash2, Trophy } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";

interface FriendsSheetProps {
  children: React.ReactNode;
}

export function FriendsSheet({ children }: FriendsSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    leagueInvites,
    loading,
    totalNotifications,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    acceptLeagueInvite,
    rejectLeagueInvite,
  } = useFriends();

  const handleSendRequest = async () => {
    if (!username.trim()) return;
    setSending(true);
    const { error } = await sendFriendRequest(username.trim());
    setSending(false);

    if (error) {
      toast.error(t(`friends.errors.${error.replace(/ /g, "_").toLowerCase()}`) || error);
    } else {
      setUsername("");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    await acceptFriendRequest(requestId);
  };

  const handleRejectRequest = async (requestId: string) => {
    await rejectFriendRequest(requestId);
  };

  const handleAcceptLeagueInvite = async (inviteId: string) => {
    const leagueId = await acceptLeagueInvite(inviteId);
    if (leagueId) {
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        // Close the sheet on mobile if navigating
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
      navigate(`/league/${leagueId}`);
    }
  };

  const handleRejectLeagueInvite = async (inviteId: string) => {
    await rejectLeagueInvite(inviteId);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("friends.title")}
          </SheetTitle>
          <SheetDescription>{t("friends.description")}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={totalNotifications > 0 ? "inbox" : "friends"} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends" className="relative">
              {t("friends.friendsTab")}
            </TabsTrigger>
            <TabsTrigger value="inbox" className="relative">
              {t("friends.inboxTab")}
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {totalNotifications}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="add">{t("friends.addTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t("friends.noFriendsYet")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <button
                      onClick={() => navigate(`/profile/${friend.id}`)}
                      className="font-medium hover:text-primary transition-colors text-left"
                    >
                      {friend.display_name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFriend(friend.friendship_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inbox" className="space-y-6 mt-4">
            {/* Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t("friends.friendRequests")}
                </h3>
                {incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="font-medium">{request.from_user_name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* League Invites */}
            {leagueInvites.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {t("friends.leagueInvites")}
                </h3>
                {leagueInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3 rounded-lg bg-secondary/50 space-y-2"
                  >
                    <div>
                      <p className="font-medium">{invite.league_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("friends.invitedBy", { name: invite.from_user_name })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAcceptLeagueInvite(invite.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {t("friends.join")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectLeagueInvite(invite.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t("friends.decline")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {t("friends.pendingRequests")}
                </h3>
                {outgoingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-muted-foreground">{request.from_user_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelFriendRequest(request.id)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {totalNotifications === 0 && outgoingRequests.length === 0 && (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t("friends.noNotifications")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("friends.addDescription")}
              </p>
              <Input
                placeholder={t("friends.usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
              />
              <Button
                onClick={handleSendRequest}
                disabled={!username.trim() || sending}
                className="w-full"
                variant="hero"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {sending ? t("common.loading") : t("friends.sendRequest")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
